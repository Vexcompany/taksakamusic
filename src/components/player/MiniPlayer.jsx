// src/components/player/MiniPlayer.jsx
import { usePlayer } from '../../context/PlayerContext';
import { fmt, PH } from '../../lib/utils';

export default function MiniPlayer({ onOpen }) {
  const { current, isPlaying, progress, duration, togglePlay, nextTrack, toggleLike, isLiked } = usePlayer();

  if (!current) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const liked = isLiked(current.id);

  return (
    <div
      className="fixed left-3 right-3 sm:left-5 sm:right-5 z-[99]
        backdrop-blur-2xl border border-white/[0.11] rounded-[18px]
        shadow-[0_12px_40px_rgba(0,0,0,.6)] overflow-hidden
        transition-all duration-200"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom,0px) + clamp(68px,10vw,80px) + 8px)',
        background: 'rgba(16,16,40,.97)',
      }}
    >
      {/* Progress bar — port dari web lama .pl-inner progress strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: 'rgba(255,255,255,.06)' }}>
        <div className="h-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg,#1DB954,#1ed760)',
          }} />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5 max-w-[900px] mx-auto">
        {/* Thumbnail with EQ overlay (port dari web lama .pl-eq-mini) */}
        <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={onOpen}>
          <img src={current.thumbnail || PH} alt={current.title}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = PH; }} />
          {/* EQ overlay when playing */}
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(0,0,0,.5)' }}>
              <div className="flex items-end gap-0.5 h-4">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className="w-0.5 bg-g rounded-sm eq-bar"
                    style={{ height: [9,18,6,14,11][i] + 'px' }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <div className="text-sm font-semibold truncate">{current.title || '–'}</div>
          <div className="text-xs text-t2 truncate">{current.artist || '–'}</div>
        </div>

        {/* Time */}
        <div className="text-xs text-t2 hidden sm:block flex-shrink-0">
          {fmt(progress)} / {fmt(duration)}
        </div>

        {/* Controls (port dari web lama — tambah like button di miniplayer) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); toggleLike(); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center
              text-sm cursor-pointer border-none bg-transparent transition-all
              ${liked ? 'text-rd scale-110' : 'text-t2 hover:text-rd'}`}>
            <i className={`${liked ? 'fas' : 'far'} fa-heart`} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); togglePlay(); }}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center
              text-black text-sm cursor-pointer border-none
              hover:bg-g hover:scale-105 transition-all shadow-[0_0_16px_rgba(0,0,0,.3)]">
            <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); nextTrack(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center
              text-t2 text-sm cursor-pointer border border-white/[0.08]
              hover:bg-s4 hover:text-tx transition-all"
            style={{ background: 'rgba(255,255,255,.06)' }}>
            <i className="fas fa-forward" />
          </button>
        </div>
      </div>
    </div>
  );
}
