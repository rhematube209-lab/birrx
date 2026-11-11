import { describe, it, expect, vi } from 'vitest';
import { fresh, type State } from '../domain';
import {
  runInboxScan,
  isSupportedSender,
  normalizeSender,
  OVERLAP_WINDOW_MS
} from './smsScanner';
import { type RawSmsMessage } from './androidSmsBridge';

const emptyState = (): State => ({
  ...fresh(),
  tx: [],
  accounts: [],
  packages: [],
  prefs: { ...fresh().prefs, lastSmsScanTimestamp: '0' }
});

// Sanitized synthetic fixtures
const telebirrSample = (ref = 'SCAN-TB-01', amt = '25.00') =>
  `Dear Customer You have transferred ETB ${amt} to Example Recipient (2519****0000) on 11/11/2026 14:15:30. Your transaction number is ${ref}. The service fee is ETB 0.87 and 15% VAT on the service fee is ETB 0.13. Your current E-Money Account balance is ETB 550.00. Thank you for using telebirr Ethio telecom`;

const boaSample = (ref = 'SCANBOA01', amt = '150.00') =>
  `Dear Example, your account 1****25 was debited with ETB ${amt}. Available Balance: ETB 1,200.00. Receipt: https://cs.bankofabyssinia.com/slip/?trx=${ref} Bank of Abyssinia.`;

const cbeSample = (ref = 'SCAN-CBE-01', amt = '300.00') =>
  `Dear Example You have received ETB ${amt} from account 1****0000 (Example Sender) to your account 1****6418. Your current balance is ETB 5,000.00. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/${ref}`;

describe('Android SMS Scanner Core', () => {
  it('identifies and normalizes supported sender IDs accurately', () => {
    expect(isSupportedSender('CBE')).toBe(true);
    expect(isSupportedSender('cbe')).toBe(true);
    expect(isSupportedSender('BOA')).toBe(true);
    expect(isSupportedSender('127')).toBe(true);
    expect(isSupportedSender('994')).toBe(true);
    expect(isSupportedSender('+251994')).toBe(true);
    expect(isSupportedSender('810')).toBe(true);
    expect(isSupportedSender('telebirr')).toBe(true);
    expect(isSupportedSender('TELEBIRR')).toBe(true);

    // Unsupported senders
    expect(isSupportedSender('SPAM-CORP')).toBe(false);
    expect(isSupportedSender('12345')).toBe(false);
    expect(isSupportedSender('UNKNOWN_BANK')).toBe(false);
  });

  it('runs initial inbox scan and commits valid transactions and balance snapshots', async () => {
    const s = emptyState();
    const now = Date.UTC(2026, 10, 11, 11, 15, 30); // 11/11/2026 14:15:30 EAT

    const messages: RawSmsMessage[] = [
      { id: '1', sender: '127', body: telebirrSample('TB-101', '50.00'), timestamp: now },
      { id: '2', sender: 'BOA', body: boaSample('BOA-201', '75.00'), timestamp: now + 1000 },
      { id: '3', sender: 'CBE', body: cbeSample('CBE-301', '500.00'), timestamp: now + 2000 },
      // Unsupported spam sender:
      { id: '4', sender: 'PROMO_AD', body: 'Buy one get one free!', timestamp: now + 3000 }
    ];

    const mockFetcher = vi.fn().mockResolvedValue({ messages, hasMore: false });

    const { state: resultState, summary } = await runInboxScan(s, { mockFetcher });

    expect(summary.scannedCount).toBe(4);
    // telebirr produces principal + fee (2 tx), BOA produces 1 tx, CBE produces 1 tx = 4 tx
    expect(summary.newTransactions).toBe(4);
    expect(resultState.tx).toHaveLength(4);
    expect(resultState.accounts.some((a) => a.bank === 'Telebirr' && a.bal === 55000)).toBe(true);
    expect(resultState.accounts.some((a) => a.bank === 'BOA' && a.bal === 120000)).toBe(true);
    expect(resultState.accounts.some((a) => a.bank === 'CBE' && a.bal === 500000)).toBe(true);

    // Verify checkpoint was updated
    expect(resultState.prefs.lastSmsScanTimestamp).toBe(String(now + 3000));
  });

  it('performs incremental scan and skips previously committed records', async () => {
    const s = emptyState();
    const t1 = Date.UTC(2026, 10, 11, 8, 0, 0);
    const t2 = Date.UTC(2026, 10, 11, 10, 0, 0);

    const initialBatch: RawSmsMessage[] = [
      { id: '1', sender: '127', body: telebirrSample('TB-INITIAL', '20.00'), timestamp: t1 }
    ];

    const { state: firstState } = await runInboxScan(s, {
      mockFetcher: vi.fn().mockResolvedValue({ messages: initialBatch, hasMore: false })
    });

    expect(firstState.tx).toHaveLength(2);
    expect(firstState.prefs.lastSmsScanTimestamp).toBe(String(t1));

    // Next scan: contains the old message (in overlap window) + a new message
    const secondBatch: RawSmsMessage[] = [
      { id: '1', sender: '127', body: telebirrSample('TB-INITIAL', '20.00'), timestamp: t1 },
      { id: '2', sender: 'CBE', body: cbeSample('CBE-NEW', '100.00'), timestamp: t2 }
    ];

    const { state: secondState, summary: secondSummary } = await runInboxScan(firstState, {
      mockFetcher: vi.fn().mockResolvedValue({ messages: secondBatch, hasMore: false })
    });

    // The old telebirr message was skipped as a duplicate
    expect(secondSummary.duplicatesSkipped).toBe(1);
    // Only the new CBE transaction was added (1 tx)
    expect(secondSummary.newTransactions).toBe(1);
    expect(secondState.tx).toHaveLength(3);
    expect(secondState.prefs.lastSmsScanTimestamp).toBe(String(t2));
  });

  it('supports scan cancellation mid-way via AbortSignal', async () => {
    const s = emptyState();
    const controller = new AbortController();

    const mockFetcher = vi.fn().mockImplementation(async () => {
      controller.abort(); // abort after first batch
      return {
        messages: [{ id: '1', sender: 'BOA', body: boaSample('BOA-ABORT', '20.00'), timestamp: 1000 }],
        hasMore: true
      };
    });

    const { summary } = await runInboxScan(s, {
      mockFetcher,
      signal: controller.signal
    });

    expect(summary.stoppedEarly).toBe(true);
  });

  it('guarantees transient message bodies: raw SMS text is never stored in State', async () => {
    const s = emptyState();
    const secretRef = 'SECRETXYZ123';
    const bodyText = `Dear Example, your account 1****25 was debited with ETB 35.00. Available Balance: ETB 800.00. Receipt: https://cs.bankofabyssinia.com/slip/?trx=${secretRef} Bank of Abyssinia.`;

    const { state: resultState } = await runInboxScan(s, {
      mockFetcher: vi.fn().mockResolvedValue({
        messages: [{ id: '1', sender: 'BOA', body: bodyText, timestamp: 1700000000000 }],
        hasMore: false
      })
    });

    const serializedState = JSON.stringify(resultState);
    expect(serializedState).not.toContain('Dear Example');
    expect(serializedState).not.toContain('https://cs.bankofabyssinia.com');
    expect(serializedState).not.toContain(bodyText);
    // Normalized ref is preserved:
    expect(serializedState).toContain(secretRef);
  });

  it('paginates bounded batches properly until hasMore is false', async () => {
    const s = emptyState();
    let callCount = 0;

    const mockFetcher = vi.fn().mockImplementation(async (since, limit, offset) => {
      callCount++;
      if (offset === 0) {
        return {
          messages: [
            { id: '1', sender: 'CBE', body: cbeSample('BATCH-1', '10.00'), timestamp: 1000 }
          ],
          hasMore: true
        };
      } else {
        return {
          messages: [
            { id: '2', sender: 'CBE', body: cbeSample('BATCH-2', '20.00'), timestamp: 2000 }
          ],
          hasMore: false
        };
      }
    });

    const { state: finalState, summary } = await runInboxScan(s, {
      batchSize: 1,
      mockFetcher
    });

    expect(callCount).toBe(2);
    expect(summary.scannedCount).toBe(2);
    expect(summary.newTransactions).toBe(2);
    expect(finalState.tx).toHaveLength(2);
  });

  it('preserves exact EAT date, time and seconds from Android message timestamp', async () => {
    const s = emptyState();
    // 2026-11-10T21:30:45Z in UTC is 2026-11-11T00:30:45 in East Africa Time (UTC+3)
    const timestamp = Date.parse('2026-11-10T21:30:45Z');

    const { state: resultState } = await runInboxScan(s, {
      mockFetcher: vi.fn().mockResolvedValue({
        messages: [{ id: '1', sender: 'CBE', body: cbeSample('TIME-01', '15.00'), timestamp }],
        hasMore: false
      })
    });

    const tx = resultState.tx[0];
    expect(tx.date).toBe('2026-11-11');
    expect(tx.time).toBe('00:30:45');
  });
});


describe('Scan regressions', () => {
  it('clears seeded demo data even when the native inbox is empty', async () => {
    const result = await runInboxScan(fresh(), {
      clearDemoData: true,
      mockFetcher: async () => ({messages: [], hasMore: false})
    });
    expect(result.state.tx.some(t => t.id === 'n11')).toBe(false);
    expect(result.state.tx).toHaveLength(0);
    expect(result.state.accounts).toHaveLength(0);
    expect(result.state.prefs.demoDataCleared).toBe('1');
  });

  it('preserves concurrent edits and incoming records across async batches', async () => {
    let live = emptyState();
    const result = await runInboxScan(live, {
      getState: () => live,
      onBatch: next => { live = next; },
      mockFetcher: async () => {
        live = {...live, hidden:true, notes:[{id:'note',title:'Keep me',body:'Edited during scan'}], tx:[{...fresh().tx[0],id:'live',ref:'LIVE'}]};
        return {messages:[{id:'1',sender:'BOA',body:boaSample(),timestamp:1700000000000}],hasMore:false};
      }
    });
    expect(result.state.notes[0].title).toBe('Keep me');
    expect(result.state.hidden).toBe(true);
    expect(result.state.tx.some(t=>t.ref==='LIVE')).toBe(true);
    expect(result.state.tx.some(t=>t.ref==='SCANBOA01')).toBe(true);
  });

  it('saves deduplicated review metadata using the correct envelope after parser sorting', async () => {
    const messages = [
      {id:'known',sender:'BOA',body:boaSample(),timestamp:1700000000000},
      {id:'unknown',sender:'CBE',body:'Private unsupported text',timestamp:1700000001000}
    ];
    const mockFetcher = async () => ({messages,hasMore:false});
    const first = await runInboxScan(emptyState(),{mockFetcher});
    expect(first.state.unmatched).toEqual([{id:'review:CBE:unknown',date:'2023-11-15'}]);
    expect(JSON.stringify(first.state)).not.toContain('Private unsupported');
    const second = await runInboxScan(first.state,{mockFetcher});
    expect(second.state.unmatched).toHaveLength(1);
    const dismissed = {...second.state,unmatched:[]};
    expect((await runInboxScan(dismissed,{mockFetcher})).state.unmatched).toHaveLength(0);
  });

  it('reads beyond 1000 messages, including dense overlap windows', async () => {
    const s = emptyState();
    s.prefs.lastSmsScanTimestamp='1700000000000';
    const messages = Array.from({length:1101},(_,i)=>({id:String(i),sender:'CBE',body:'Unsupported template',timestamp:1700000000000+i}));
    const result = await runInboxScan(s,{mockFetcher:async (_,limit,offset)=>({messages:messages.slice(offset,offset+limit),hasMore:offset+limit<messages.length})});
    expect(result.summary.scannedCount).toBe(1101);
    expect(result.summary.stoppedEarly).toBe(false);
    expect(result.state.unmatched).toHaveLength(1101);
    expect(result.state.prefs.lastSmsScanTimestamp).toBe('1700000001100');
  });

  it('does not advance the completed checkpoint when capped or interrupted', async () => {
    const s = emptyState();
    s.prefs.lastSmsScanTimestamp='1000';
    const result = await runInboxScan(s,{maxMessages:1,mockFetcher:async ()=>({messages:[{id:'1',sender:'BOA',body:boaSample(),timestamp:2000}],hasMore:true})});
    expect(result.summary.stoppedEarly).toBe(true);
    expect(result.state.prefs.lastSmsScanTimestamp).toBe('1000');
    expect(result.state.prefs.lastSmsScanStatus).toBe('incomplete');
    expect(result.state.tx).toHaveLength(1);
  });

  it('persists duplicate-only scan metadata through the shared batch callback', async () => {
    let live = emptyState();
    const mockFetcher = async ()=>({messages:[{id:'1',sender:'BOA',body:boaSample(),timestamp:1700000000000}],hasMore:false});
    live = (await runInboxScan(live,{mockFetcher})).state;
    const writes = vi.fn(next=>{live=next;});
    const result = await runInboxScan(live,{mockFetcher,getState:()=>live,onBatch:writes});
    expect(result.summary.newTransactions).toBe(0);
    expect(writes).toHaveBeenCalled();
    expect(live.prefs.lastSmsScanStatus).toBe('complete');
  });

  it('rejects overlapping scans and releases the lock after completion', async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve=>{release=resolve;});
    const first = runInboxScan(emptyState(),{mockFetcher:async ()=>{await pending;return {messages:[],hasMore:false};}});
    await expect(runInboxScan(emptyState())).rejects.toThrow('already running');
    release(); await first;
    await expect(runInboxScan(emptyState(),{mockFetcher:async ()=>({messages:[],hasMore:false})})).resolves.toBeDefined();
  });
});


it('persists usage updates to an existing package without adding transactions', async () => {
  const activation='Dear Customer As per your request the new service offer Daily Internet Package 240MB from telebirr to be expired after 24 Hours is added to your service number 0900000000. The offer is effective as of Nov 11, 2026 12:05:39 PM and will be expired on Nov 12, 2026 12:05:39 PM. Ethio telecom';
  const usage='Dear customer, You have used 75% of your Internet plan from Daily Internet Package 240MB from telebirr to be expired after 24 Hours package. It will expire on 2026-11-12 at 12:05:39. Thank you, ethio telecom.';
  let live=(await runInboxScan(emptyState(),{mockFetcher:async()=>({messages:[{id:'a',sender:'994',body:activation,timestamp:Date.parse('2026-11-11T09:05:39Z')}],hasMore:false})})).state;
  const count=live.packages.length;
  const result=await runInboxScan(live,{getState:()=>live,onBatch:next=>{live=next;},mockFetcher:async()=>({messages:[{id:'u',sender:'251994',body:usage,timestamp:Date.parse('2026-11-11T10:05:39Z')}],hasMore:false})});
  expect(result.summary.newTransactions).toBe(0);
  expect(result.summary.updatedPackages).toBe(1);
  expect(live.packages).toHaveLength(count);
  expect(live.packages[0].usedPercent).toBe(75);
  expect(live.prefs.lastSmsScanTimestamp).toBe(String(Date.parse('2026-11-11T10:05:39Z')));
});
