import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle, StopCircle, Smartphone } from 'lucide-react';
import { type State } from './domain';
import { checkSmsPermission, requestSmsPermission } from './services/androidSmsBridge';
import { runInboxScan, type ScanProgress, type ScanSummary } from './services/smsScanner';
import {AiSmsReview} from './AiSmsReview';
import {eligibleAiReview} from './services/smsAi';

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
  const [analyzingAi,setAnalyzingAi]=useState(false);
  const scanActive = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  useEffect(() => {
    let live=true;
    checkSmsPermission().then((res) => {
      if(!live)return;
      if (res.status === 'unsupported') {
        setPermissionStatus('unsupported');
      } else if (res.granted) {
        setPermissionStatus('granted');
        if (onboarding) void startScan(true);
      } else {
        setPermissionStatus(res.status === 'denied' ? 'denied' : 'prompt');
      }
    });
    return()=>{live=false;};
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
    if(scanActive.current)return;
    scanActive.current=true;
    setError('');
    setProgress(null);
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
      scanActive.current=false;
      setScanning(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const lang = state.prefs?.language || 'English', isAm = lang === 'Amharic';
  const lastScanTime = state.prefs?.lastSmsScanIso
    ? new Date(state.prefs.lastSmsScanIso).toLocaleString(isAm ? 'am-ET' : 'en-US', { timeZone: 'Africa/Addis_Ababa' })
    : (isAm ? 'ፈጽሞ' : 'Never');

  if(analyzingAi)return <AiSmsReview state={state} getState={getState} update={update} onClose={()=>setAnalyzingAi(false)}/>;
  return (
    <div className="android-sms-sync">
      <div className="line sms-sync-heading">
        <h2>{isAm ? 'መልዕክቶችዎን ያገናኙ' : 'Connect your messages'}</h2>
        <small>CBE · CBE Birr · BOA · Awash · Zemen · Dashen · Telebirr</small>
      </div>

      {permissionStatus === 'unsupported' ? (
        <div className="notice-box">
          <Smartphone size={24} />
          <p>{isAm ? 'የኤስኤምኤስ ሳጥን መዳረሻ በአንድሮይድ መሣሪያዎች ላይ ብቻ ይገኛል። በአሁኑ ጊዜ በድረ-ገጽ ብሮውዘር ውስጥ ነዎት።' : 'Native SMS inbox access is only available on Android devices. You are currently in a web browser.'}</p>
          <p className="lead">{isAm ? 'በማንኛውም ጊዜ «ኤስኤምኤስ ለጥፍ» የሚለውን ተጠቅመው መልዕክቶችን ማስመጣት ይችላሉ።' : 'You can still import messages anytime using the Paste SMS tab.'}</p>
          <button className="primary" onClick={onClose}>{isAm ? 'ተረድቻለሁ' : 'Understood'}</button>
        </div>
      ) : permissionStatus === 'prompt' || permissionStatus === 'denied' ? (
        <div className="permission-explainer">
          <div className="privacy-badge">
            <ShieldCheck size={28} className="shield-icon" />
            <div>
              <b>{isAm ? 'መልዕክቶችዎ በስልክዎ ላይ ብቻ ይቀራሉ' : 'Your messages stay on your phone'}</b>
              <small>{isAm ? 'የCBE፣ BOA፣ አዋሽ፣ ዘመን፣ ዳሽን እና ቴሌብር ግብይቶችን በራስ-ሰር ያስመጡ።' : 'Import transactions from CBE, CBE Birr, BOA, Awash, Zemen, Dashen and Telebirr automatically.'}</small>
            </div>
          </div>

          <ul className="policy-points">
            <li><strong>{isAm ? 'በስልክዎ ላይ ብቻ ይሰራል' : 'Processed on your phone'}</strong><span>{isAm ? 'የአካባቢ ቅኝት የኤስኤምኤስ ጽሑፍን በጭራሽ ወደ ውጭ አይልክም። ያልታወቁ መልዕክቶችን በAI መተንተን ይችላሉ።' : 'Local scanning never uploads SMS text. You can separately choose Gemini analysis for unfamiliar messages.'}</span></li>
            <li><strong>{isAm ? 'አስፈላጊ ዝርዝሮች ብቻ' : 'Only the details you need'}</strong><span>{isAm ? 'መጠኖች፣ ቀኖች እና ማጣቀሻዎች ይቀመጣሉ። የመጀመሪያው መልዕክት ጽሑፍ ወዲያውኑ ይሰረዛል።' : 'Amounts, dates and references are saved. Original message text is discarded.'}</span></li>
            <li><strong>{isAm ? 'ቁጥጥሩ በእርስዎ እጅ ነው' : 'You stay in control'}</strong><span>{isAm ? 'BirrX መልዕክት መላክ ወይም አድራሻዎችን ማንበብ አይችልም። በእጅ ማስመጣትንም መጠቀም ይችላሉ።' : 'BirrX cannot send messages or read contacts. You can use manual import instead.'}</span></li>
          </ul>

          {error && <p className="out" role="alert">{error}</p>}

          <div className="actions sms-permission-actions">
            <button className="primary" disabled={requesting} onClick={handleRequestPermission}>
              {requesting ? (isAm ? 'እባክዎ ይጠብቁ…' : 'Please wait…') : permissionStatus === 'denied' ? (isAm ? 'እንደገና ሞክር' : 'Try again') : (isAm ? 'ፍቀድ እና ቃኝ' : 'Allow & scan')}
            </button>
            <button disabled={requesting} onClick={onClose}>{isAm ? 'በእጅ ተጠቀም' : 'Use manually'}</button>
          </div>
        </div>
      ) : (
        <div className="scan-controls">
          {permissionStatus === 'checking' && <p role="status">{isAm ? 'የኤስኤምኤስ ፈቃድ በመፈተሽ ላይ…' : 'Checking SMS permission…'}</p>}
          <div className="sync-status-card">
            <div>
              <small>{isAm ? 'የመጨረሻ የሳጥን ማመሳሰል' : 'Last Inbox Sync'}</small>
              <b>{lastScanTime}{state.prefs?.lastSmsScanIso?' EAT':''}</b>
            </div>
            <div>
              <small>{isAm ? 'የመጨረሻ የተቃኙ መልዕክቶች' : 'Last Scanned Messages'}</small>
              <b>{state.prefs?.lastSmsScanCount || '0'} {isAm ? 'መልዕክቶች' : 'messages'}</b>
            </div>
          </div>

          {scanning && (
            <div className="scan-progress-box">
              <div className="line">
                <span className="spinner-label">
                  <RefreshCw size={14} className="spin-icon" />
                  {progress?.message || (isAm ? 'የመልዕክት ሳጥኑን በመቃኘት ላይ…' : 'Scanning inbox…')}
                </span>
                <small>{progress?.scannedCount||0} {isAm ? 'ተቃኝቷል' : 'scanned'}</small>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill indeterminate" />
              </div>
              <div className="scan-metrics">
                <span>{isAm ? 'ዝግጁ፡ ' : 'Ready: '}<strong>{progress?.readyCount||0}</strong></span>
                <span>{isAm ? 'ተደጋጋሚ፡ ' : 'Duplicates: '}<strong>{progress?.duplicateCount||0}</strong></span>
                <span>{isAm ? 'ግምገማ፡ ' : 'Review: '}<strong>{progress?.reviewCount||0}</strong></span>
              </div>
              <button className="out-btn" onClick={handleStop}>
                <StopCircle size={14} /> {isAm ? 'ቅኝት አቁም' : 'Stop scan'}
              </button>
            </div>
          )}

          {summary && !scanning && (
            <div className="scan-summary-card">
              <div className="line">
                <CheckCircle size={18} color="#28744a" />
                <b>{isAm ? 'የቅኝት ውጤት' : 'Scan Results'}</b>
              </div>
              <p>
                <strong>{summary.newTransactions}</strong> {isAm ? 'አዳዲስ ግብይቶች፣ ' : 'new transactions, '}
                <strong>{summary.updatedPackages}</strong> {isAm ? 'የጥቅል ዝመናዎች፣ ' : 'package updates, '}
                <strong>{summary.airtimeUpdates}</strong> {isAm ? 'የአየር ሰዓት ቀሪ ሂሳብ ዝመናዎች፣ ' : 'airtime balance updates, '}
                <strong>{summary.duplicatesSkipped}</strong> {isAm ? 'የተዘለሉ ተደጋጋሚዎች።' : 'duplicates skipped.'}
              </p>
              {state.unmatched.length > 0 && <p>{isAm ? `${state.unmatched.length} መልዕክቶች ግምገማ ያስፈልጋቸዋል። አሁን መቀጠል ወይም ያልታወቁ የባንክ መልዕክቶችን በAI መተንተን ይችላሉ።` : `${state.unmatched.length} messages need review. You can continue now or choose AI analysis for unresolved banking formats.`}</p>}
              {summary.stoppedEarly && <small className="out">{isAm ? 'ቅኝቱ በተጠቃሚው ተቋርጧል።' : 'Scan was stopped early by user.'}</small>}
            </div>
          )}

          {error && <p className="out" role="alert">{error}</p>}

          {onboarding?<div className="sms-complete-action">{!scanning&&summary&&<div className="actions sms-complete-buttons"><button className="primary" onClick={onClose}>{isAm ? 'ወደ BirrX ቀጥል' : 'Continue to BirrX'}</button>{state.unmatched.some(eligibleAiReview)&&<button onClick={()=>setAnalyzingAi(true)}>{isAm ? 'በAI ተንትን' : 'Analyze with AI'}</button>}</div>}{!scanning&&error&&<div className="actions"><button className="primary" onClick={()=>void startScan(true)}>{isAm ? 'እንደገና ሞክር' : 'Try again'}</button><button onClick={onClose}>{isAm ? 'ወደ BirrX ቀጥል' : 'Continue to BirrX'}</button></div>}</div>:<div className="actions sms-scan-actions">
            <button className="primary" disabled={scanning || permissionStatus !== 'granted'} onClick={()=>startScan()}>
              <RefreshCw size={14} /> {state.prefs?.lastSmsScanTimestamp ? (isAm ? 'አዳዲሶችን ቃኝ' : 'Scan new') : (isAm ? 'ሳጥኑን ቃኝ' : 'Scan inbox')}
            </button>
            <button disabled={scanning || permissionStatus !== 'granted'} onClick={()=>startScan(true)}>{isAm ? 'ሁሉንም እንደገና ቃኝ' : 'Rescan all'}</button>
            <button disabled={scanning} onClick={onClose}>{onboarding ? (isAm ? 'ቀጥል' : 'Continue') : (isAm ? 'ዝጋ' : 'Close')}</button>
          </div>}
          {!onboarding&&<small>{isAm ? 'ሁሉንም እንደገና መቃኘት የቀደሙ መልዕክቶችን ያካትታል። ያሉ ግብይቶች ተጠብቀው ይቆያሉ፤ ተደጋጋሚዎች ይታለፋሉ።' : 'Rescan all includes older supported messages. Existing transactions and edits are preserved; duplicates are skipped.'}</small>}
        </div>
      )}
    </div>
  );
}

