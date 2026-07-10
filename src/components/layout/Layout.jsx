// src/components/layout/Layout.jsx
import { useState } from 'react';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import MiniPlayer from '../player/MiniPlayer';
import NowPlaying from '../player/NowPlaying';
import Toast from '../ui/Toast';
import { usePlayer } from '../../context/PlayerContext';

export default function Layout({ children }) {
  const { current } = usePlayer();
  const [npOpen, setNpOpen] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col">
      <Topbar />

      {/* Page content */}
      <main
        className="flex-1 overflow-y-auto page-enter"
        style={{
          paddingTop:    'calc(env(safe-area-inset-top,0px) + clamp(52px,7vw,60px))',
          paddingBottom: current
            ? 'calc(env(safe-area-inset-bottom,0px) + clamp(68px,10vw,80px) + clamp(70px,12vw,88px) + 20px)'
            : 'calc(env(safe-area-inset-bottom,0px) + clamp(68px,10vw,80px) + 16px)',
        }}>
        {children}
      </main>

      {/* Mini player */}
      <MiniPlayer onOpen={() => setNpOpen(true)} />

      {/* Bottom nav */}
      <BottomNav />

      {/* Fullscreen NowPlaying */}
      {npOpen && <NowPlaying onClose={() => setNpOpen(false)} />}

      {/* Toast */}
      <Toast />
    </div>
  );
}
