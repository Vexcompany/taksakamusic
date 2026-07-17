// src/App.jsx
import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import { loadConfig } from './lib/supabase';
import { getSession } from './lib/utils';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useRealtime } from './hooks/useRealtime';

const Home     = lazy(() => import('./pages/Home'));
const Chart    = lazy(() => import('./pages/Chart'));
const Wrapped  = lazy(() => import('./pages/Wrapped'));
const Explore  = lazy(() => import('./pages/Explore'));
const LiveFeed = lazy(() => import('./pages/LiveFeed'));
const Chat     = lazy(() => import('./pages/Chat'));
const Party    = lazy(() => import('./pages/Party'));
const Playlist = lazy(() => import('./pages/Playlist'));
const Profil   = lazy(() => import('./pages/Profil'));
const Vtuber   = lazy(() => import('./pages/Vtuber'));
const Login    = lazy(() => import('./pages/Login'));

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <i className="fas fa-circle-notch fa-spin text-xl text-g" />
    </div>
  );
}

function AppShell() {
  const { setSbReady, setSbUrl, setSbKey, showToast } = useApp();
  const session = getSession();
  const location = useLocation();

  useKeyboardShortcuts();
  useRealtime({
    onMessage: (msg) => {
      const myKey = session ? session.nama + '_' + session.generasi : '';
      if (msg.to_key === myKey) {
        showToast('💬 Pesan baru dari ' + (msg.from_key?.split('_').slice(0,-1).join(' ') || '?'));
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const cfg = await loadConfig();
        window.SB_URL = cfg.SB_URL;
        window.SB_KEY = cfg.SB_KEY;
        setSbUrl(cfg.SB_URL);
        setSbKey(cfg.SB_KEY);
        setSbReady(true);
      } catch (e) {
        console.error('[Config]', e.message);
        showToast('Gagal memuat konfigurasi');
      }
    })();
  }, []);

  if (!session && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }
  if (session && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  if (location.pathname === '/login') {
    return (
      <Suspense fallback={<PageLoading />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/"         element={<Home />} />
          <Route path="/chart"    element={<Chart />} />
          <Route path="/wrapped"  element={<Wrapped />} />
          <Route path="/explore"  element={<Explore />} />
          <Route path="/livefeed" element={<LiveFeed />} />
          <Route path="/chat"     element={<Chat />} />
          <Route path="/party"    element={<Party />} />
          <Route path="/playlist" element={<Playlist />} />
          <Route path="/profil"   element={<Profil />} />
          <Route path="/vtuber"   element={<Vtuber />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <PlayerProvider>
        <AppShell />
      </PlayerProvider>
    </AppProvider>
  );
}

