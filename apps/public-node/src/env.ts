import 'dotenv/config';

const DATA_PATH = process.env.DATA_PATH || './data';
const PORT = parseInt(process.env.PORT ?? '') || 2001;
const SECRET_KEY = process.env.SECRET_KEY;
const PUBLIC_URL = process.env.PUBLIC_URL;
const ENABLE_HYPER_DHT = !!process.env.ENABLE_HYPER_DHT && process.env.ENABLE_HYPER_DHT !== 'false';

const REDIRECT_APP_URL = process.env.REDIRECT_APP_URL;

export { DATA_PATH, PORT, SECRET_KEY, PUBLIC_URL, ENABLE_HYPER_DHT, REDIRECT_APP_URL };
