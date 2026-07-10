// src/components/player/NowPlaying.jsx
import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { fmt, PH } from '../../lib/utils';

export default function NowPlaying({ onClose }) {
  const {
    current, isPlaying, progress, duration, isRepeat, isShuffle, isMuted, volume,
    togglePlay, nextTrack, prevTrack, seek, setVolume, toggleMute,
    toggleLike, isLiked, dispatch, fetchLyrics, addToQueue, queue,
  } = usePlayer();

  const [tab, setTab] = useState('info');   // 'info' | 'lyrics' | 'queue'
  const [lyrics, setLyrics] = useState(null);
  const [lyrLoading, setLyrLoading] = useState(false);
  const [activeLyric, setActiveLyric] = useState(-1);
  const lyrRef = useRef(null);
  const progRef = useRef(null);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const liked = current ? isLiked(current.id) : false;

  // Fetch lyrics when switching to lyrics tab
  useEffect(() => {
    if (tab !== 'lyrics' || !current || lyrics?.for === current.id) return;
    setLyrLoading(true);
    fetchLyrics(current.title, current.artist).then(r => {
      setLyrics(r ? { ...r, for: current.id } : { type: 'none', data: null, for: current.id });
      setLyrLoading(false);
    });
  }, [tab, current?.id]);

  // Track active lyric line
  useEffect(() => {
    if (lyrics?.type !== 'synced' || !lyrics.data?.length) return;
    let idx = -1;
    for (let i = 0; i < lyrics.data.length; i++) {
      if (progress >= lyrics.data[i].time) idx = i;
      else break;
    }
    if (idx !== activeLyric) {
      setActiveLyric(idx);
      if (idx > 0 && lyrRef.current) {
        const el = lyrRef.current.children[idx];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [progress, lyrics]);

  // Seek via progress bar click
  const handleSeekClick = (e) => {
    const bar = progRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, pct)));
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[500] flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0a0a24 0%, #0d0d2e 60%, #060616 100%)' }}>

      {/* Ambient glow from artwork */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20 blur-[100px] orb-anim"
          style={{ background: 'rgba(29,185,84,.35)' }} />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full opacity-15 blur-[80px] orb-anim-r"
          style={{ background: 'rgba(124,92,191,.35)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3
        max-w-[480px] w-full mx-auto"
        style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1]
            flex items-center justify-center text-tx cursor-pointer border-none
            hover:bg-white/[0.14] transition-all text-sm">
          <i className="fas fa-chevron-down" />
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-t2 font-semibold">Sedang Diputar</div>
          <div className="text-sm font-bold truncate max-w-[200px]">{current.album || 'Pagaska Music'}</div>
        </div>
        <button className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1]
            flex items-center justify-center text-t2 cursor-pointer border-none
            hover:bg-white/[0.14] transition-all text-sm">
          <i className="fas fa-ellipsis-h" />
        </button>
      </div>

      {/* Artwork */}
      <div className="relative z-10 flex justify-center px-10 py-3 max-w-[480px] w-full mx-auto">
        <div className={`w-full aspect-square max-w-[260px] sm:max-w-[300px] rounded-2xl overflow-hidden
          shadow-[0_20px_60px_rgba(0,0,0,.7)] ${isPlaying ? 'vinyl-spin' : 'vinyl-spin paused'}`}
          style={{ borderRadius: '50%', border: '4px solid rgba(255,255,255,.08)' }}>
          <img src={current.thumbnail || PH} alt={current.title}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = PH; }} />
        </div>
      </div>

      {/* Info + Like */}
      <div className="relative z-10 px-6 pb-2 flex items-start justify-between gap-2
        max-w-[480px] w-full mx-auto">
        <div className="min-w-0">
          <h2 className="text-xl font-black font-syne truncate">{current.title || '–'}</h2>
          <p className="text-sm text-t2 truncate mt-0.5">{current.artist || '–'}</p>
        </div>
        <button onClick={toggleLike}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
            text-lg cursor-pointer border-none bg-transparent transition-all
            ${liked ? 'text-rd scale-110' : 'text-t2 hover:text-rd hover:scale-110'}`}>
          <i className={`${liked ? 'fas' : 'far'} fa-heart`} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-6 max-w-[480px] w-full mx-auto">
        <div ref={progRef}
          onClick={handleSeekClick}
          className="h-1.5 bg-white/[0.12] rounded-full cursor-pointer
            hover:h-2.5 transition-all duration-150 relative group">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-g to-g2 rounded-full"
            style={{ width: `${pct}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2
              w-3 h-3 bg-white rounded-full shadow-lg
              opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-t3">
          <span>{fmt(progress)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="relative z-10 px-6 py-2 flex items-center justify-center gap-5
        max-w-[480px] w-full mx-auto">
        <button onClick={() => dispatch({ type: 'SET_SHUFFLE' })}
          className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer
            border-none bg-transparent text-lg transition-all
            ${isShuffle ? 'text-g' : 'text-t2 hover:text-tx'}`}>
          <i className="fas fa-random" />
        </button>
        <button onClick={prevTrack}
          className="w-12 h-12 rounded-full bg-white/[0.08] border border-white/[0.1]
            flex items-center justify-center text-tx text-lg cursor-pointer border-none
            hover:bg-white/[0.14] hover:scale-105 transition-all">
          <i className="fas fa-backward" />
        </button>
        <button onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-g flex items-center justify-center text-black
            text-xl cursor-pointer border-none
            hover:bg-g2 hover:scale-105 active:scale-95 transition-all
            shadow-[0_0_32px_rgba(29,185,84,.45)]">
          <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
        </button>
        <button onClick={nextTrack}
          className="w-12 h-12 rounded-full bg-white/[0.08] border border-white/[0.1]
            flex items-center justify-center text-tx text-lg cursor-pointer border-none
            hover:bg-white/[0.14] hover:scale-105 transition-all">
          <i className="fas fa-forward" />
        </button>
        <button onClick={() => dispatch({ type: 'SET_REPEAT' })}
          className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer
            border-none bg-transparent text-lg transition-all
            ${isRepeat ? 'text-g' : 'text-t2 hover:text-tx'}`}>
          <i className="fas fa-redo" />
        </button>
      </div>

      {/* Volume */}
      <div className="relative z-10 px-6 pb-2 flex items-center gap-2 max-w-[480px] w-full mx-auto">
        <button onClick={toggleMute}
          className="w-8 flex-shrink-0 text-t2 hover:text-tx cursor-pointer border-none bg-transparent text-sm">
          <i className={`fas fa-volume-${isMuted ? 'mute' : volume > 0.5 ? 'up' : 'down'}`} />
        </button>
        <input type="range" min="0" max="1" step="0.01" value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="flex-1 h-1 rounded-full accent-g cursor-pointer" />
      </div>

      {/* Tabs */}
      <div className="relative z-10 px-6 max-w-[480px] w-full mx-auto">
        <div className="flex bg-s1/80 rounded-xl p-1 border border-white/[0.06]">
          {['info', 'lyrics', 'queue'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                cursor-pointer border-none transition-all
                ${tab === t ? 'bg-s3 text-tx shadow-sm' : 'bg-transparent text-t2 hover:text-tx'}`}>
              {t === 'info' ? 'Info' : t === 'lyrics' ? 'Lirik' : 'Antrean'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-4 mt-3
        max-w-[480px] w-full mx-auto min-h-0">

        {/* Info */}
        {tab === 'info' && (
          <div className="space-y-2.5">
            {[
              ['Judul', current.title],
              ['Artis', current.artist],
              ['Album', current.album || '–'],
              ['Tahun', current.year || '–'],
              ['Durasi', fmt(duration)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center
                bg-s1/60 rounded-xl px-4 py-2.5 border border-white/[0.05]">
                <span className="text-xs font-bold uppercase tracking-wider text-t2">{label}</span>
                <span className="text-sm font-medium text-right max-w-[200px] truncate">{val || '–'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Lyrics */}
        {tab === 'lyrics' && (
          <div>
            {lyrLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-t2">
                <i className="fas fa-circle-notch fa-spin" />
                <span className="text-sm">Memuat lirik...</span>
              </div>
            )}
            {!lyrLoading && lyrics?.type === 'none' && (
              <div className="text-center py-10 text-t2 text-sm">
                <i className="fas fa-music text-2xl mb-2 block opacity-30" />
                Lirik tidak tersedia
              </div>
            )}
            {!lyrLoading && lyrics?.type === 'synced' && (
              <div ref={lyrRef} className="space-y-1 py-4 text-center">
                {lyrics.data.map((line, i) => (
                  <div key={i}
                    className={`py-1.5 px-2 rounded-lg text-sm transition-all duration-300
                      ${i === activeLyric
                        ? 'text-tx text-base font-bold scale-105 text-g'
                        : i < activeLyric
                          ? 'text-t3'
                          : 'text-t2'}`}>
                    {line.text}
                  </div>
                ))}
              </div>
            )}
            {!lyrLoading && lyrics?.type === 'plain' && (
              <pre className="text-sm text-t2 whitespace-pre-wrap py-4 text-center leading-relaxed">
                {lyrics.data}
              </pre>
            )}
          </div>
        )}

        {/* Queue */}
        {tab === 'queue' && (
          <div className="space-y-1 py-2">
            {queue.length === 0 && (
              <div className="text-center py-10 text-t2 text-sm">
                <i className="fas fa-list-ul text-2xl mb-2 block opacity-30" />
                Antrean kosong
              </div>
            )}
            {queue.map((t, i) => {
              const isNow = t.id === current?.id;
              return (
                <div key={t.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer
                    border transition-all
                    ${isNow ? 'bg-g/8 border-g/20' : 'border-transparent hover:bg-s2'}`}
                  onClick={() => {
                    // Play from queue
                    const { playTrack } = usePlayer();
                  }}>
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={t.thumbnail || PH} alt={t.title}
                      className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${isNow ? 'text-g' : ''}`}>
                      {t.title}
                    </div>
                    <div className="text-xs text-t2 truncate">{t.artist}</div>
                  </div>
                  {isNow && <i className="fas fa-volume-up text-g text-xs" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
