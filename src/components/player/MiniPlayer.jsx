// src/components/player/MiniPlayer.jsx
import { usePlayer } from '../../context/PlayerContext';
import { fmt, PH } from '../../lib/utils';

export default function MiniPlayer({ onOpen }) {
  const { current, isPlaying, progress, duration, togglePlay, nextTrack } = usePlayer();

  if (!current) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className="fixed left-3 right-3 sm:left-5 sm:right-5 z-[99]
        bg-s2/94 backdrop-blur-2xl border border-white/[0.11] rounded-[18px]
        shadow-[0_8px_32px_rgba(0,0,0,.55)] overflow-hidden cursor-pointer
        transition-all duration-200 hover:bg-s3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom,0px) + clamp(68px,10vw,80px) + 8px)' }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.06]">
        <div className="h-full bg-gradient-to-r from-g to-g2 transition-all duration-1000"
          style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5 max-w-[900px] mx-auto"
        onClick={onOpen}>
        {/* Thumbnail */}
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 relative">
          <img src={current.thumbnail || PH} alt={current.title}
            className={`w-full h-full object-cover ${isPlaying ? 'vinyl-spin' : 'vinyl-spin paused'}`}
            onError={e => { e.target.src = PH; }} />
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{current.title || '–'}</div>
          <div className="text-xs text-t2 truncate">{current.artist || '–'}</div>
        </div>

        {/* Time */}
        <div className="text-xs text-t2 hidden sm:block">
          {fmt(progress)} / {fmt(duration)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); togglePlay(); }}
            className="w-10 h-10 rounded-full bg-g flex items-center justify-center
              text-black text-sm cursor-pointer border-none
              hover:bg-g2 hover:scale-105 transition-all shadow-[0_0_16px_rgba(29,185,84,.3)]">
            <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); nextTrack(); }}
            className="w-10 h-10 rounded-full bg-s3 flex items-center justify-center
              text-t2 text-sm cursor-pointer border border-white/[0.06]
              hover:bg-s4 hover:text-tx transition-all">
            <i className="fas fa-forward" />
          </button>
        </div>
      </div>
    </div>
  );
}
