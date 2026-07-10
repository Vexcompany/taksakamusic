// src/components/ui/TrackItem.jsx
import { usePlayer } from '../../context/PlayerContext';
import { PH } from '../../lib/utils';

export default function TrackItem({ track, index, showDelete, onDelete, onPlay, extra }) {
  const { current, isPlaying } = usePlayer();
  const isNow = current?.id === track?.id;

  if (!track) return null;

  return (
    <div
      onClick={() => onPlay?.(track)}
      className={`grid items-center gap-2 px-3 py-2 rounded-xl cursor-pointer 
        border transition-all duration-150
        ${isNow
          ? 'bg-g/8 border-g/20'
          : 'border-transparent hover:bg-s2 hover:border-white/[0.06]'}`}
      style={{ gridTemplateColumns: '24px 44px 1fr auto auto' }}
    >
      {/* Number / playing icon */}
      <div className={`text-center text-xs ${isNow ? 'text-g' : 'text-t2'}`}>
        {isNow
          ? <i className="fas fa-volume-up text-g" style={{ fontSize: 10 }} />
          : <span>{index + 1}</span>}
      </div>

      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
        <img src={track.thumbnail || PH} alt={track.title}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = PH; }} />
      </div>

      {/* Info */}
      <div className="min-w-0">
        <div className={`text-sm font-semibold truncate ${isNow ? 'text-g' : ''}`}>
          {track.title || '–'}
        </div>
        <div className="text-xs text-t2 truncate">{track.artist || '–'}</div>
      </div>

      {/* Duration */}
      <div className="text-xs text-t2 whitespace-nowrap">{track.duration || ''}</div>

      {/* Delete / extra */}
      {showDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete?.(track.id); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg opacity-0 
            group-hover:opacity-100 hover:bg-rd/15 hover:text-rd text-t2 text-xs 
            transition-all border-none bg-transparent cursor-pointer">
          <i className="fas fa-times" />
        </button>
      )}
      {extra}
    </div>
  );
}
