// src/components/layout/Layout.jsx
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import MiniPlayer from '../player/MiniPlayer';
import NowPlaying from '../player/NowPlaying';
import Toast from '../ui/Toast';
import { usePlayer } from '../../context/PlayerContext';

export default function Layout({ children }) {
  const { current, npOpen, dispatch } = usePlayer();

  const openNP  = () => dispatch({ type: 'SET_NP_OPEN', payload: true });
  const closeNP = () => dispatch({ type: 'SET_NP_OPEN', payload: false });

  return (
    <div className="min-h-dvh flex flex-col relative">
      {/* Ambient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full opacity-100 orb-anim"
          style={{
            width: 'min(800px,100vw)', height: 'min(600px,80vw)',
            background: 'radial-gradient(ellipse,rgba(124,92,191,.12) 0%,transparent 70%)',
            top: '-20%', left: '-15%', filter: 'blur(120px)',
          }} />
        <div className="absolute rounded-full opacity-100 orb-anim-r"
          style={{
            width: 'min(700px,90vw)', height: 'min(500px,70vw)',
            background: 'radial-gradient(ellipse,rgba(29,185,84,.07) 0%,transparent 70%)',
            bottom: '-15%', right: '-10%', filter: 'blur(120px)',
          }} />
      </div>

      <Topbar />

      {/* Page content */}
      <main
        className="relative z-10 flex-1 overflow-y-auto page-enter"
        style={{
          paddingTop:    'calc(env(safe-area-inset-top,0px) + clamp(52px,7vw,60px))',
          paddingBottom: current
            ? 'calc(env(safe-area-inset-bottom,0px) + clamp(68px,10vw,80px) + clamp(70px,12vw,88px) + 20px)'
            : 'calc(env(safe-area-inset-bottom,0px) + clamp(68px,10vw,80px) + 16px)',
        }}>
        {children}
      </main>

      {/* Mini player */}
      <MiniPlayer onOpen={openNP} />

      {/* Bottom nav */}
      <BottomNav />

      {/* Fullscreen NowPlaying */}
      {npOpen && <NowPlaying onClose={closeNP} />}

      {/* Toast */}
      <Toast />
    </div>
  );
}

