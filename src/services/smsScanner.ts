import { commitSms, previewSms, type SmsEnvelope, type SmsPreview } from '../sms';
import { clearDemoData as clearSeededDemoData, eatDate, type State } from '../domain';
import { scanNativeInbox, type RawSmsMessage } from './androidSmsBridge';

export const SUPPORTED_SENDERS = new Set(['CBE', 'BOA', '127', '994', '251994', '810', 'TELEBIRR']);

export const normalizeSender = (sender: string): string => {
  return sender.trim().replace(/^\+/, '').replace(/\s+/g, '').toUpperCase();
};

export const isSupportedSender = (sender: string): boolean => {
  return SUPPORTED_SENDERS.has(normalizeSender(sender));
};

export const OVERLAP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours safe overlap window
export const BATCH_SIZE = 50;
export const SMS_PARSER_VERSION = '2';

export interface ScanProgress {
  stage: 'idle' | 'scanning' | 'processing' | 'done' | 'stopped' | 'error';
  scannedCount: number;
  readyCount: number;
  duplicateCount: number;
  reviewCount: number;
  currentBatch: number;
  message?: string;
}

export interface ScanSummary {
  scannedCount: number;
  newTransactions: number;
  updatedPackages: number;
  airtimeUpdates: number;
  duplicatesSkipped: number;
  needsReviewCount: number;
  latestTimestamp: number;
  stoppedEarly: boolean;
}

export interface ScannerOptions {
  forceFullScan?: boolean;
  batchSize?: number;
  maxMessages?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ScanProgress) => void;
  getState?: () => State;
  onBatch?: (state: State) => void;
  clearDemoData?: boolean;
  mockFetcher?: (since: number, limit: number, offset: number) => Promise<{ messages: RawSmsMessage[]; hasMore: boolean }>;
}

/**
 * Executes an end-to-end inbox scan (initial or incremental).
 * Preserves privacy: raw message bodies are processed into structured domain objects and immediately discarded.
 */
let scanning = false;

export async function runInboxScan(initialState: State, options: ScannerOptions = {}) {
  if (scanning) throw Error("An SMS scan is already running. Wait for it to finish or stop it first.");
  scanning = true;
  try { return await scanInbox(initialState, options); } finally { scanning = false; }
}

async function scanInbox(
  initialState: State,
  options: ScannerOptions = {}
): Promise<{ state: State; summary: ScanSummary }> {
  const {
    batchSize = BATCH_SIZE,
    maxMessages = Infinity,
    signal,
    onProgress,
    mockFetcher
  } = options;

  if (batchSize < 1 || maxMessages < 1) throw Error("Scan limits must be positive.");
  let currentState = options.getState?.() || initialState;
  if (options.clearDemoData) {
    currentState = clearSeededDemoData(currentState);
    options.onBatch?.(currentState);
  }
  const lastCheckpoint = Number(currentState.prefs?.lastSmsScanTimestamp || 0);

  // Apply safe overlap window on incremental scans
  const fullScan = options.forceFullScan || currentState.prefs.fullSmsRescanPending === '1' || currentState.prefs.smsParserVersion !== SMS_PARSER_VERSION;
  const sinceTimestamp = !fullScan && lastCheckpoint > 0 ? Math.max(0, lastCheckpoint - OVERLAP_WINDOW_MS) : 0;
  if(fullScan){
    currentState={...currentState,prefs:{...currentState.prefs,fullSmsRescanPending:'1'}};
    options.onBatch?.(currentState);
  }

  let offset = 0;
  let hasMore = true;
  let totalScanned = 0;
  let totalReady = 0;
  let totalDuplicates = 0;
  let totalReviews = 0;
  let highestTimestamp = lastCheckpoint;
  let stoppedEarly = false;
  let batchNum = 0;

  let newTransactions = 0;
  let packageUpdates = 0;
  let airtimeUpdates = 0;

  while (hasMore && totalScanned < maxMessages) {
    if (signal?.aborted) {
      stoppedEarly = true;
      break;
    }

    batchNum++;
    onProgress?.({
      stage: 'scanning',
      scannedCount: totalScanned,
      readyCount: totalReady,
      duplicateCount: totalDuplicates,
      reviewCount: totalReviews,
      currentBatch: batchNum,
      message: `Reading inbox batch ${batchNum}…`
    });

    const currentLimit = Math.min(batchSize, maxMessages - totalScanned);
    const batch = mockFetcher
      ? await mockFetcher(sinceTimestamp, currentLimit, offset)
      : await scanNativeInbox({
          sinceTimestamp,
          limit: currentLimit,
          offset
        });

    if (!batch.messages.length) {
      hasMore = false;
      break;
    }

    // 1. Filter and normalize sender metadata
    const filteredMessages: RawSmsMessage[] = [];
    for (const msg of batch.messages) {
      if (isSupportedSender(msg.sender)) {
        filteredMessages.push(msg);
      }
      if (msg.timestamp > highestTimestamp) {
        highestTimestamp = msg.timestamp;
      }
    }

    totalScanned += batch.messages.length;
    offset += batch.messages.length;
    hasMore = batch.hasMore;

    if (filteredMessages.length > 0) {
      onProgress?.({
        stage: 'processing',
        scannedCount: totalScanned,
        readyCount: totalReady,
        duplicateCount: totalDuplicates,
        reviewCount: totalReviews,
        currentBatch: batchNum,
        message: `Processing ${filteredMessages.length} bank messages…`
      });

      // 2. Map transient envelopes with ISO timestamp with timezone for accurate EAT conversion
      const envelopes: SmsEnvelope[] = filteredMessages.map((msg) => ({
        sender: msg.sender,
        body: msg.body,
        receivedAt: new Date(msg.timestamp).toISOString()
      }));

      // 3. Process through existing parser & deduplicator
      currentState = options.getState?.() || currentState;
      const previews: SmsPreview[] = previewSms(envelopes, currentState);

      for (const p of previews) {
        if (p.status === 'Ready' || p.status === 'Update') totalReady++;
        else if (p.status === 'Duplicate') totalDuplicates++;
        else totalReviews++;
      }

      // 4. Commit recognized domain models to current state
      const beforeTxCount = currentState.tx.length;
      const beforePackages = JSON.stringify(currentState.packages);
      const beforeAirtime = JSON.stringify(currentState.airtime);
      currentState = commitSms(currentState, previews);
      newTransactions += currentState.tx.length - beforeTxCount;
      if (JSON.stringify(currentState.packages) !== beforePackages) packageUpdates++;
      if (JSON.stringify(currentState.airtime) !== beforeAirtime) airtimeUpdates++;
      const reviews = [...currentState.unmatched];
      const events = new Set(currentState.smsEvents || []);
      previews.forEach((p) => {
        if (p.status !== 'Needs review') return;
        const msg = filteredMessages[p.message - 1];
        const id = 'review:' + normalizeSender(msg.sender) + ':' + msg.id;
        if (events.has(id)) return;
        events.add(id);
        reviews.push({id, date:eatDate(new Date(msg.timestamp).toISOString())});
      });
      const resolved=new Set(previews.filter(p=>p.status!=='Needs review').map(p=>{const msg=filteredMessages[p.message-1];return 'review:'+normalizeSender(msg.sender)+':'+msg.id;}));
      currentState = {...currentState, unmatched:reviews.filter(r=>!resolved.has(r.id)), smsEvents:[...events]};
      options.onBatch?.(currentState);

      // Raw message bodies from 'envelopes' and 'batch.messages' go out of scope here and are garbage collected.
    }

    onProgress?.({
      stage: 'scanning',
      scannedCount: totalScanned,
      readyCount: totalReady,
      duplicateCount: totalDuplicates,
      reviewCount: totalReviews,
      currentBatch: batchNum
    });
  }

  stoppedEarly = stoppedEarly || hasMore;
  currentState = options.getState?.() || currentState;
  // Only advance the completed checkpoint after reaching the end of the inbox.
  // Interrupted scans retain the old checkpoint and safely deduplicate on retry.
  // Update scanner metadata in state prefs
  const nowIso = new Date().toISOString();
  currentState = {
    ...currentState,
    prefs: {
      ...currentState.prefs,
      lastSmsScanTimestamp: String(stoppedEarly ? lastCheckpoint : highestTimestamp),
      lastSmsScanIso: nowIso,
      lastSmsScanCount: String(totalScanned),
      lastSmsScanStatus: stoppedEarly ? 'incomplete' : 'complete',
      fullSmsRescanPending: stoppedEarly && fullScan ? '1' : '0',
      smsParserVersion: stoppedEarly ? currentState.prefs.smsParserVersion || '' : SMS_PARSER_VERSION
    }
  };

  options.onBatch?.(currentState);

  const summary: ScanSummary = {
    scannedCount: totalScanned,
    newTransactions,
    updatedPackages: packageUpdates,
    airtimeUpdates,
    duplicatesSkipped: totalDuplicates,
    needsReviewCount: totalReviews,
    latestTimestamp: highestTimestamp,
    stoppedEarly
  };

  onProgress?.({
    stage: stoppedEarly ? 'stopped' : 'done',
    scannedCount: totalScanned,
    readyCount: totalReady,
    duplicateCount: totalDuplicates,
    reviewCount: totalReviews,
    currentBatch: batchNum,
    message: stoppedEarly
      ? 'Scan incomplete. Rescan to continue safely.'
      : `Scan complete: ${summary.newTransactions} new transactions found.`
  });

  return { state: currentState, summary };
}

