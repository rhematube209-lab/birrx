import {createRoot} from 'react-dom/client';
import App from './App';
import {registerServiceWorker} from './registerSW';
import {dismissTopDialog} from './nativeBack';

window.birrxHandleBack=dismissTopDialog;
createRoot(document.getElementById('root')!).render(<App/>);
registerServiceWorker();
