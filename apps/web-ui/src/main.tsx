import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import './native';
import { CAP_IS_WEB, IS_SATELLITE_DESKTOP } from './env';

// if the app is running as a PWA and not in Satellite Desktop run the service worker
if (CAP_IS_WEB && !IS_SATELLITE_DESKTOP) {
	registerServiceWorker();
}

// setup dayjs
import dayjs from 'dayjs';
import relativeTimePlugin from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTimePlugin);
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { registerServiceWorker } from './services/worker';
dayjs.extend(localizedFormat);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
