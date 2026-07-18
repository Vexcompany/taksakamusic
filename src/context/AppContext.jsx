// src/context/AppContext.jsx
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getSession, getUserKey } from '../lib/utils';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const session  = getSession();
  const userKey  = getUserKey(session);
  const [sbReady, setSbReady]     = useState(false);
  const [SB_URL,  setSbUrl]       = useState('');
  const [SB_KEY,  setSbKey]       = useState('');
  const [toast,   setToastState]  = useState({ msg: '', visible: false });
  const [myPlayCounts, setMyPlayCounts] = useState({});
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToastState({ msg, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(s => ({ ...s, visible: false })), 3500);
  }, []);

  // Expose globals to window for legacy scripts (taksaka-group, cinematic-lyrics, etc.)
  useEffect(() => {
    window.__pgsk_toast = showToast;
    if (SB_URL) window.SB_URL = SB_URL;
    if (SB_KEY) window.SB_KEY = SB_KEY;
    if (userKey) window.USER_KEY = userKey;
  }, [SB_URL, SB_KEY, userKey, showToast]);

  // Load SB credentials from backend config
  useEffect(() => {
    (async () => {
      const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://verolyz-kingdom3.vercel.app';
      try {
        const res = await fetch(`${BACKEND}/api/config`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.sbUrl) { setSbUrl(data.sbUrl); window.SB_URL = data.sbUrl; }
        if (data.sbKey) { setSbKey(data.sbKey); window.SB_KEY = data.sbKey; }
        setSbReady(true);
      } catch (e) {
        console.log('[AppContext] Config load error:', e.message);
      }
    })();
  }, []);

  const incrementMyPlayCount = useCallback((trackId) => {
    setMyPlayCounts(prev => ({ ...prev, [trackId]: (prev[trackId] || 0) + 1 }));
  }, []);

  return (
    <AppContext.Provider value={{
      session, userKey,
      sbReady, setSbReady,
      SB_URL, setSbUrl,
      SB_KEY, setSbKey,
      toast, showToast,
      myPlayCounts, setMyPlayCounts, incrementMyPlayCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
