import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle, StopCircle, Smartphone } from 'lucide-react';
import { type State } from './domain';
import { checkSmsPermission, requestSmsPermission, isAndroidNative } from './services/androidSmsBridge';
import { runInboxScan, type ScanProgress, type ScanSummary } from './services/smsScanner';

interface Props {
  state: State;
  getState: () => State;
  update: (fn: (s: State) => State) => void;
  onClose?: () => void;
  onNotice?: (msg: string) => void;
  onboarding?: boolean;
}

export function AndroidSmsSyncModal({ state, getState, update, onClose, onboarding }: Props) {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('checking');
  const [scanning, setScanning] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  useEffect(() => {
    checkSmsPermission().then((res) => {
      if (res.status === 'unsupported') {
        setPermissionStatus('unsupported');
      } else if (res.granted) {
        setPermissionStatus('granted');
        if (onboarding) void startScan(true);
      } else {
        setPermissionStatus(res.status === 'denied' ? 'denied' : 'prompt');
      }
    });
  }, []);

  const handleRequestPermission = async () => {
    if(requesting||scanning)return;
    setRequesting(true);
    setError('');
    const res = await requestSmsPermission();
    setRequesting(false);
    if (res.granted) {
      setPermissionStatus('granted');
      startScan(!!onboarding);
    } else {
      setPermissionStatus('denied');
      setError('SMS permission was denied. You can continue by pasting SMS messages manually or enable permission in Android App Settings.');
    }
  };

  const startScan = async (forceFullScan = false) => {
    setError('');
    setScanning(true);
    setSummary(null);
    abortControllerRef.current = new AbortController();

    try {
      const result = await runInboxScan(getState(), {
        forceFullScan,
        getState,
        onBatch: next => update(() => next),
        clearDemoData: true,
        signal: abortControllerRef.current.signal,
        onProgress: (p) => setProgress(p)
      });

      setSummary(result.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const lastScanTime = state.prefs?.lastSmsScanIso
    ? new Date(state.prefs.lastSmsScanIso).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    : 'Never';

  return (
    <div className="android-sms-sync">
      <div className="line sms-sync-heading">
        <h2>Connect your messages</h2>
        <small>CBE · BOA · Telebirr</small>
      </div>

      {permissionStatus === 'unsupported' ? (
        <div className="notice-box">
          <Smartphone size={24} />
          <p>Native SMS inbox access is only available on Android devices. You are currently in a web browser.</p>
          <p className="lead">You can still import messages anytime using the <strong>Paste SMS</strong> tab.</p>
          <button className="primary" onClick={onClose}>Understood</button>
        </div>
      ) : permissionStatus === 'prompt' || permissionStatus === 'denied' ? (
        <div className="permission-explainer">
          <div className="privacy-badge">
            <ShieldCheck size={28} className="shield-icon" />
            <div>
              <b>Your messages stay on your phone</b>
              <small>Import transactions from CBE, BOA and Telebirr automatically.</small>
            </div>
          </div>

          <ul className="policy-points">
            <li><strong>Processed on your phone</strong><span>Supported bank messages become transactions. SMS text is never uploaded.</span></li>
            <li><strong>Only the details you need</strong><span>Amounts, dates and references are saved. Original message text is discarded.</span></li>
            <li><strong>You stay in control</strong><span>BirrX cannot send messages or read contacts. You can use manual import instead.</span></li>
          </ul>

          {error && <p className="out" role="alert">{error}</p>}

          <div className="actions sms-permission-actions">
            <button className="primary" disabled={requesting} onClick={handleRequestPermission}>
              {requesting?'Please wait…':permissionStatus === 'denied' ? 'Try again' : 'Allow & scan'}
            </button>
            <button disabled={requesting} onClick={onClose}>Use manually</button>
          </div>
        </div>
      ) : (
        <div className="scan-controls">
          {permissionStatus === 'checking' && <p role="status">Checking SMS permission…</p>}
          <div className="sync-status-card">
            <div>
              <small>Last Inbox Sync</small>
              <b>{lastScanTime}{state.prefs?.lastSmsScanIso?' EAT':''}</b>
            </div>
            <div>
              <small>Last Scanned Messages</small>
              <b>{state.prefs?.lastSmsScanCount || '0'} messages</b>
            </div>
          </div>

          {scanning && progress && (
            <div className="scan-progress-box">
              <div className="line">
                <span className="spinner-label">
                  <RefreshCw size={14} className="spin-icon" />
                  {progress.message || 'Scanning inbox…'}
                </span>
                <small>{progress.scannedCount} scanned</small>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill indeterminate" />
              </div>
              <div className="scan-metrics">
                <span>Ready: <strong>{progress.readyCount}</strong></span>
                <span>Duplicates: <strong>{progress.duplicateCount}</strong></span>
                <span>Review: <strong>{progress.reviewCount}</strong></span>
              </div>
              <button className="out-btn" onClick={handleStop}>
                <StopCircle size={14} /> Stop scan
              </button>
            </div>
          )}

          {summary && !scanning && (
            <div className="scan-summary-card">
              <div className="line">
                <CheckCircle size={18} color="#28744a" />
                <b>Scan Results</b>
              </div>
              <p>
                <strong>{summary.newTransactions}</strong> new transactions,{' '}
                <strong>{summary.updatedPackages}</strong> package updates,{' '}
                <strong>{summary.airtimeUpdates}</strong> airtime balance updates,{' '}
                <strong>{summary.duplicatesSkipped}</strong> duplicates skipped.
              </p>
              {summary.needsReviewCount > 0 && <p className="out">{summary.needsReviewCount} messages need review. Open Review to see the dates and import unsupported message formats manually.</p>}
              {summary.stoppedEarly && <small className="out">Scan was stopped early by user.</small>}
            </div>
          )}

          {error && <p className="out" role="alert">{error}</p>}

          {onboarding&&summary&&!summary.stoppedEarly&&!scanning?<div className="sms-complete-action"><button className="primary" onClick={onClose}>Continue to BirrX</button></div>:<div className="actions sms-scan-actions">
            <button className="primary" disabled={scanning || permissionStatus !== 'granted'} onClick={()=>startScan()}>
              <RefreshCw size={14} /> {state.prefs?.lastSmsScanTimestamp ? 'Scan new' : 'Scan inbox'}
            </button>
            <button disabled={scanning || permissionStatus !== 'granted'} onClick={()=>startScan(true)}>Rescan all</button>
            <button disabled={scanning} onClick={onClose}>{onboarding ? 'Continue' : 'Close'}</button>
          </div>}
          {!(onboarding&&summary&&!summary.stoppedEarly&&!scanning)&&<small>Rescan all includes older supported messages. Existing transactions and edits are preserved; duplicates are skipped.</small>}
        </div>
      )}
    </div>
  );
}

