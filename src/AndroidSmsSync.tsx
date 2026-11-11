import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle, StopCircle, Smartphone } from 'lucide-react';
import { type State } from './domain';
import { checkSmsPermission, requestSmsPermission, isAndroidNative } from './services/androidSmsBridge';
import { runInboxScan, type ScanProgress, type ScanSummary } from './services/smsScanner';

interface Props {
  state: State;
  getState: () => State;
  update: (fn: (s: State) => State) => void;
  onClose?: () => void;
  onNotice?: (msg: string) => void;
}

export function AndroidSmsSyncModal({ state, getState, update, onClose, onNotice }: Props) {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('checking');
  const [scanning, setScanning] = useState(false);
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
      } else {
        setPermissionStatus(res.status === 'denied' ? 'denied' : 'prompt');
      }
    });
  }, []);

  const handleRequestPermission = async () => {
    setError('');
    const res = await requestSmsPermission();
    if (res.granted) {
      setPermissionStatus('granted');
      startScan();
    } else {
      setPermissionStatus('denied');
      setError('SMS permission was denied. You can continue by pasting SMS messages manually or enable permission in Android App Settings.');
    }
  };

  const startScan = async () => {
    setError('');
    setScanning(true);
    setSummary(null);
    abortControllerRef.current = new AbortController();

    try {
      const result = await runInboxScan(getState(), {
        getState,
        onBatch: next => update(() => next),
        clearDemoData: true,
        signal: abortControllerRef.current.signal,
        onProgress: (p) => setProgress(p)
      });

      setSummary(result.summary);
      onNotice?.(`${result.summary.stoppedEarly ? 'Scan incomplete' : 'Scan complete'}: ${result.summary.newTransactions} new transactions imported.`);
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
      <div className="line">
        <h2>Android SMS Sync</h2>
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
              <b>Privacy-First Local Scanning</b>
              <small>BirrX only reads banking messages from supported senders (CBE, BOA, Telebirr/Ethio telecom).</small>
            </div>
          </div>

          <div className="policy-points">
            <p>• <strong>Strictly Local:</strong> Messages are processed entirely on your device into structured transactions. No cloud server is ever contacted.</p>
            <p>• <strong>Zero Text Storage:</strong> SMS bodies are discarded immediately after parsing. Raw message texts are never saved to database or logs.</p>
            <p>• <strong>Read-Only:</strong> BirrX never requests permission to send SMS or read personal contacts.</p>
          </div>

          {error && <p className="out" role="alert">{error}</p>}

          <div className="actions">
            <button className="primary" onClick={handleRequestPermission}>
              {permissionStatus === 'denied' ? 'Try Requesting Permission Again' : 'Grant SMS Permission & Scan'}
            </button>
            <button onClick={onClose}>Cancel / Use Manual Fallback</button>
          </div>
        </div>
      ) : (
        <div className="scan-controls">
          {permissionStatus === 'checking' && <p role="status">Checking SMS permission…</p>}
          <div className="sync-status-card">
            <div>
              <small>Last Inbox Sync</small>
              <b>{lastScanTime} EAT</b>
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
                <strong>{summary.duplicatesSkipped}</strong> duplicates skipped.
              </p>
              {summary.stoppedEarly && <small className="out">Scan was stopped early by user.</small>}
            </div>
          )}

          {error && <p className="out" role="alert">{error}</p>}

          <div className="actions">
            <button className="primary" disabled={scanning || permissionStatus !== 'granted'} onClick={startScan}>
              <RefreshCw size={14} /> {state.prefs?.lastSmsScanTimestamp ? 'Rescan for New Messages' : 'Start Full Inbox Scan'}
            </button>
            <button disabled={scanning} onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

