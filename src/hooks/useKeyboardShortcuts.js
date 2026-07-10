// src/hooks/useKeyboardShortcuts.js
import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

export function useKeyboardShortcuts() {
  const { togglePlay, nextTrack, prevTrack, setVolume, toggleMute, dispatch, audioRef, current, volume } = usePlayer();

  useEffect(() => {
    const onKey = (e) => {
      // Don't fire if typing in an input
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) { e.preventDefault(); prevTrack(); }
          else {
            const audio = audioRef.current;
            if (audio) { audio.currentTime = Math.max(0, audio.currentTime - 10); }
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) { e.preventDefault(); nextTrack(); }
          else {
            const audio = audioRef.current;
            if (audio) { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); }
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyS':
          dispatch({ type: 'SET_SHUFFLE' });
          break;
        case 'KeyR':
          dispatch({ type: 'SET_REPEAT' });
          break;
        case 'KeyL':
          if (current) {
            // Dispatch toggle like via context
            import('../context/PlayerContext').then(({ usePlayer }) => {}).catch(() => {});
            // Access toggle directly
            window.__pgsk_toggleLike?.();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, nextTrack, prevTrack, setVolume, toggleMute, dispatch, audioRef, current, volume]);
}
