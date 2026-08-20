import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Attach the signed session token to same-origin API calls. The backend is still
// authoritative: localStorage values can never grant permissions without a valid JWT.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!url.includes('/api/')) return nativeFetch(input, init);
  const token = localStorage.getItem('selection_token');
  if (!token) return nativeFetch(input, init);
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return nativeFetch(input, { ...init, headers });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
