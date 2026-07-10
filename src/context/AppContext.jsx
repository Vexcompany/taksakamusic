// src/context/AppContext.jsx
import { createContext, useContext, useState, useCallback, useRef } from 'react';
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
