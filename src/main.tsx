import {createRoot} from 'react-dom/client';
import App from './App';
import {registerServiceWorker} from './registerSW';

createRoot(document.getElementById('root')!).render(<App/>);
registerServiceWorker();
