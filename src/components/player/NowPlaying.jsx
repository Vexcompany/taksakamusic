// src/components/player/NowPlaying.jsx
import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useApp } from '../../context/AppContext';
import sb from '../../lib/supabase';
import { fmt, PH, getUserKey, getSession } from '../../lib/utils';

// ── Share Modal ──────────────────────────────────────────────────
function ShareModal({ track, onClose }) {
  const { showToast } = useApp();
  const session = getSession();
  const userKey = getUserKey(session);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.get('play_history',
          `user_key=neq.${encodeURIComponent(userKey)}&select=user_key&order=played_at.desc&limit=200`);
        // FIX: guard Array.isArray
        const safeRows = Array.isArray(rows) ? rows : [];
        const uniqueKeys = [...new Set(safeRows.map(r => r.user_key).filter(Boolean))];
        setMembers(uniqueKeys.slice(0, 30).map(k => ({
          key: k,
          name: k.split('_').slice(0, -1).join(' ') || k,
        })));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sendShare = async () => {
    if (!selected.size) { showToast('Pilih minimal 1 anggota'); return; }
    setSending(true);
    const payload = JSON.stringify({
      type: 'track_share',
      track: {
        id: track.id, title: track.title, artist: track.artist,
        thumbnail: track.thumbnail,
        audioUrl: track.audio || track.audioUrl,
        source: track.source || 'db',
      },
    });
    try {
      await Promise.all([...selected].map(toKey =>
        fetch(`${window.SB_URL || ''}/rest/v1/messages`, {
          method: 'POST',
          headers: { ...sb._h(), Prefer: 'return=minimal' },
          body: JSON.stringify({
            from_key: userKey, to_key: toKey,
            message: payload, created_at: new Date().toISOString(),
          }),
        })
      ));
      showToast(`✅ Lagu dibagikan ke ${selected.size} anggota!`);
      onClose();
    } catch (e) { showToast('Gagal berbagi: ' + e.message); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,.65)' }}
      onClick={onClose}>
      <div className="w-full max-w-[480px] bg-s1 border border-white/[0.11] rounded-t-3xl
        flex flex-col max-h-[80dvh]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="font-syne font-black text-base">Bagikan Lagu</div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-s3 text-t2 flex items-center justify-center
              text-xs cursor-pointer border-none hover:bg-s4 hover:text-tx transition-all">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0 bg-g/5">
          <img src={track.thumbnail || PH} alt={track.title}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            onError={e => { e.target.src = PH; }} />
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{track.title}</div>
            <div className="text-[0.65rem] text-t2 truncate">{track.artist}</div>
          </div>
          <i className="fas fa-music text-g text-sm ml-auto flex-shrink-0" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-t2">
              <i className="fas fa-circle-notch fa-spin text-xs" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-t2 text-xs">Tidak ada anggota ditemukan</div>
          ) : members.map(m => (
            <div key={m.key} onClick={() => toggle(m.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                border transition-all mb-1
                ${selected.has(m.key) ? 'bg-g/10 border-g/30' : 'border-transparent hover:bg-s2 hover:border-white/[0.06]'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-p to-bl
                flex items-center justify-center text-[0.6rem] font-black text-white flex-shrink-0">
                {m.name.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 text-sm font-semibold truncate">{m.name}</div>
              {selected.has(m.key) && <i className="fas fa-check text-g text-sm flex-shrink-0" />}
            </div>
          ))}
        </div>

        <div className="px-4 pb-5 pt-3 flex-shrink-0 border-t border-white/[0.06]">
          <button onClick={sendShare} disabled={sending || !selected.size}
            className="w-full py-3 rounded-xl bg-g text-black text-sm font-black cursor-pointer
              border-none hover:bg-g2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {sending
              ? <><i className="fas fa-circle-notch fa-spin mr-2" /> Mengirim...</>
              : `Kirim ke ${selected.size} anggota`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function NowPlaying({ onClose }) {
  const {
    current, isPlaying, progress, duration, isRepeat, isShuffle, isMuted, volume,
    togglePlay, nextTrack, prevTrack, seek, setVolume, toggleMute,
    toggleLike, isLiked, dispatch, fetchLyrics, queue, playTrack,
    removeFromQueue,
  } = usePlayer();
  const { showToast } = useApp();

  const [tab, setTab] = useState('info');
  const [lyrics, setLyrics] = useState(null);
  const [lyrLoading, setLyrLoading] = useState(false);
  const [activeLyric, setActiveLyric] = useState(-1);
  const [shareOpen, setShareOpen] = useState(false);
  // For slide-in animation (port dari web lama: translateY(100%) → translateY(0))
  const [visible, setVisible] = useState(false);
  const lyrRef = useRef(null);
  const progRef = useRef(null);

  // Slide-in on mount (same as web lama np-screen animation)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const liked = current ? isLiked(current.id) : false;

  // Fetch lyrics
  useEffect(() => {
    if (tab !== 'lyrics' || !current || lyrics?.for === current.id) return;
    setLyrLoading(true);
    fetchLyrics(current.title, current.artist).then(r => {
      setLyrics(r ? { ...r, for: current.id } : { type: 'none', data: null, for: current.id });
      setLyrLoading(false);
    });
  }, [tab, current?.id]);

  // Active lyric
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
        lyrRef.current.children[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [progress, lyrics]);

  const handleSeekClick = (e) => {
    const bar = progRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  if (!current) return null;

  return (
    <>
      {/* Fullscreen player — port dari web lama: .np-screen slide from bottom */}
      <div className="fixed inset-0 z-[500] flex flex-col overflow-hidden np-screen-enter"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .4s cubic-bezier(.16,1,.3,1)',
        }}>

        {/* Blurred cover background (port dari web lama .np-bg) */}
        <div className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${current.thumbnail || PH})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(.25) saturate(1.6)',
            transform: 'scale(1.1)',
          }} />
        {/* Gradient overlay */}
        <div className="absolute inset-0 z-0"
          style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,.1) 0%,rgba(0,0,0,.7) 100%)' }} />

        {/* Ambient orbs */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20
            blur-[100px] orb-anim"
            style={{ background: 'rgba(29,185,84,.35)' }} />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full opacity-15
            blur-[80px] orb-anim-r"
            style={{ background: 'rgba(124,92,191,.35)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col flex-1 min-h-0 max-w-[480px] w-full mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3"
            style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 16px)' }}>
            <button onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/[0.14] border border-white/[0.1]
                flex items-center justify-center text-white cursor-pointer border-none
                hover:bg-white/[0.22] transition-all text-sm active:scale-95">
              <i className="fas fa-chevron-down" />
            </button>
            <div className="text-center">
              <div className="text-[0.6rem] uppercase tracking-[2px] text-white/50 font-semibold">
                Sedang Diputar
              </div>
              {current.album && (
                <div className="text-sm font-bold truncate max-w-[200px] text-white/80 mt-0.5">
                  {current.album}
                </div>
              )}
            </div>
            <button onClick={() => setShareOpen(true)}
              className="w-9 h-9 rounded-full bg-white/[0.14] border border-white/[0.1]
                flex items-center justify-center text-white/60 cursor-pointer border-none
                hover:bg-white/[0.22] hover:text-g transition-all text-sm active:scale-95">
              <i className="fas fa-share" />
            </button>
          </div>

          {/* Vinyl artwork (port dari web lama .np-vinyl dengan ::before groove dan ::after center dot) */}
          <div className="flex justify-center px-10 py-2 flex-shrink-0">
            <div className="relative flex-shrink-0"
              style={{
                width: 'min(240px,60vw)',
                height: 'min(240px,60vw)',
              }}>
              {/* Vinyl groove rings (port dari .np-vinyl::before) */}
              <div className="absolute inset-0 rounded-full pointer-events-none z-[1]"
                style={{
                  background: 'repeating-radial-gradient(circle at center,transparent 0,transparent 10px,rgba(0,0,0,.07) 10px,rgba(0,0,0,.07) 11px)',
                }} />
              {/* Cover art with spin */}
              <div className={`w-full h-full rounded-full overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,.75)]
                ${isPlaying ? 'vinyl-spin' : 'vinyl-spin paused'}`}
                style={{ border: '3px solid rgba(255,255,255,.1)' }}>
                <img src={current.thumbnail || PH} alt={current.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = PH; }} />
              </div>
              {/* Center hole (port dari .np-vinyl::after) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-5 h-5 rounded-full z-[2] pointer-events-none"
                style={{ background: 'rgba(10,10,35,.9)', border: '2px solid rgba(255,255,255,.2)' }} />
              {/* Liked flash overlay */}
              {liked && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center z-[3]
                  pointer-events-none"
                  style={{ background: 'rgba(0,0,0,.3)' }}>
                  <i className="fas fa-heart text-rd text-4xl"
                    style={{ filter: 'drop-shadow(0 0 16px rgba(255,77,109,.8))' }} />
                </div>
              )}
            </div>
          </div>

          {/* Info + Like */}
          <div className="px-6 pb-2 flex items-start justify-between gap-2 flex-shrink-0">
            <div className="min-w-0">
              <h2 className="text-xl font-black font-syne truncate text-white">{current.title || '–'}</h2>
              <p className="text-sm truncate mt-0.5" style={{ color: 'rgba(255,255,255,.65)' }}>
                {current.artist || '–'}
              </p>
            </div>
            <button onClick={toggleLike}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                text-lg cursor-pointer border-none bg-transparent transition-all
                ${liked ? 'text-rd scale-110' : 'text-white/50 hover:text-rd hover:scale-110'}`}>
              <i className={`${liked ? 'fas' : 'far'} fa-heart`} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-6 flex-shrink-0">
            <div ref={progRef} onClick={handleSeekClick}
              className="relative h-1.5 rounded-full cursor-pointer group"
              style={{ background: 'rgba(255,255,255,.18)' }}>
              <div className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${pct}%`,
                  background: '#fff',
                }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2
                  w-3.5 h-3.5 bg-white rounded-full shadow-lg
                  opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="flex justify-between mt-1.5 text-xs"
              style={{ color: 'rgba(255,255,255,.42)' }}>
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Main controls */}
          <div className="px-6 py-2 flex items-center justify-center gap-5 flex-shrink-0">
            <button onClick={() => dispatch({ type: 'SET_SHUFFLE' })}
              className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer
                border-none bg-transparent text-xl transition-all
                ${isShuffle ? 'text-g' : 'text-white/50 hover:text-white'}`}>
              <i className="fas fa-random" />
            </button>
            <button onClick={prevTrack}
              className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer
                border-none text-white text-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.1)' }}>
              <i className="fas fa-backward" />
            </button>
            <button onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black
                text-xl cursor-pointer border-none transition-all
                hover:bg-g hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,.4)' }}>
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
            </button>
            <button onClick={nextTrack}
              className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer
                border-none text-white text-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.1)' }}>
              <i className="fas fa-forward" />
            </button>
            <button onClick={() => dispatch({ type: 'SET_REPEAT' })}
              className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer
                border-none bg-transparent text-xl transition-all
                ${isRepeat ? 'text-g' : 'text-white/50 hover:text-white'}`}>
              <i className="fas fa-redo" />
            </button>
          </div>

          {/* Volume */}
          <div className="px-6 pb-2 flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleMute}
              className="w-8 flex-shrink-0 cursor-pointer border-none bg-transparent text-sm"
              style={{ color: 'rgba(255,255,255,.5)' }}>
              <i className={`fas fa-volume-${isMuted ? 'mute' : volume > 0.5 ? 'up' : 'down'}`} />
            </button>
            <input type="range" min="0" max="1" step="0.01" value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full accent-g cursor-pointer" />
          </div>

          {/* Tabs */}
          <div className="px-6 flex-shrink-0">
            <div className="flex rounded-xl p-1 border border-white/[0.08]"
              style={{ background: 'rgba(16,16,44,.6)' }}>
              {[
                { key: 'info',   label: 'Info' },
                { key: 'lyrics', label: 'Lirik' },
                { key: 'queue',  label: `Antrean (${queue.length})` },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                    cursor-pointer border-none transition-all
                    ${tab === t.key
                      ? 'text-white shadow-sm'
                      : 'bg-transparent hover:text-white'}`}
                  style={tab === t.key
                    ? { background: 'rgba(255,255,255,.1)', color: '#fff' }
                    : { background: 'transparent', color: 'rgba(255,255,255,.4)' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 mt-3 min-h-0 scrollbar-none"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}>

            {/* Info */}
            {tab === 'info' && (
              <div className="space-y-2">
                {[
                  ['Judul', current.title],
                  ['Artis', current.artist],
                  ['Album', current.album || '–'],
                  ['Tahun', current.year || '–'],
                  ['Durasi', fmt(duration)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center
                    rounded-xl px-4 py-2.5"
                    style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <span className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,.4)' }}>{label}</span>
                    <span className="text-sm font-medium text-right max-w-[200px] truncate text-white">
                      {val || '–'}
                    </span>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShareOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                      text-xs font-semibold cursor-pointer border-none transition-all hover:text-g"
                    style={{ background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
                    <i className="fas fa-share" /> Bagikan
                  </button>
                  <button onClick={() => showToast('Gunakan menu Playlist untuk tambah lagu!')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                      text-xs font-semibold cursor-pointer border-none transition-all hover:text-p2"
                    style={{ background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
                    <i className="fas fa-list-ul" /> Playlist
                  </button>
                </div>
              </div>
            )}

            {/* Lyrics */}
            {tab === 'lyrics' && (
              <div>
                {lyrLoading && (
                  <div className="flex items-center justify-center gap-2 py-10"
                    style={{ color: 'rgba(255,255,255,.4)' }}>
                    <i className="fas fa-circle-notch fa-spin" />
                    <span className="text-sm">Memuat lirik...</span>
                  </div>
                )}
                {!lyrLoading && lyrics?.type === 'none' && (
                  <div className="text-center py-10 text-sm"
                    style={{ color: 'rgba(255,255,255,.35)' }}>
                    <i className="fas fa-music text-2xl mb-2 block opacity-30" />
                    Lirik tidak tersedia
                  </div>
                )}
                {!lyrLoading && lyrics?.type === 'synced' && (
                  <div ref={lyrRef} className="space-y-1 py-4 text-center">
                    {lyrics.data.map((line, i) => (
                      <div key={i}
                        className="py-1.5 px-2 rounded-lg text-sm transition-all duration-300"
                        style={{
                          color: i === activeLyric
                            ? '#1DB954'
                            : i < activeLyric
                              ? 'rgba(255,255,255,.22)'
                              : 'rgba(255,255,255,.45)',
                          fontSize: i === activeLyric ? '1rem' : '0.875rem',
                          fontWeight: i === activeLyric ? '700' : '400',
                          transform: i === activeLyric ? 'scale(1.04)' : 'scale(1)',
                          textShadow: i === activeLyric ? '0 0 30px rgba(255,255,255,.25)' : 'none',
                        }}>
                        {line.text}
                      </div>
                    ))}
                  </div>
                )}
                {!lyrLoading && lyrics?.type === 'plain' && (
                  <pre className="text-sm whitespace-pre-wrap py-4 text-center leading-relaxed"
                    style={{ color: 'rgba(255,255,255,.6)' }}>
                    {lyrics.data}
                  </pre>
                )}
              </div>
            )}

            {/* Queue */}
            {tab === 'queue' && (
              <div className="space-y-1 py-2">
                {queue.length === 0 && (
                  <div className="text-center py-10 text-sm"
                    style={{ color: 'rgba(255,255,255,.35)' }}>
                    <i className="fas fa-list-ul text-2xl mb-2 block opacity-30" />
                    Antrean kosong
                  </div>
                )}
                {queue.map((t) => {
                  const isNow = t.id === current?.id;
                  return (
                    <div key={t.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer
                        border transition-all`}
                      style={{
                        background: isNow ? 'rgba(29,185,84,.1)' : 'rgba(255,255,255,.04)',
                        borderColor: isNow ? 'rgba(29,185,84,.25)' : 'rgba(255,255,255,.07)',
                      }}
                      onClick={() => playTrack(t)}>
                      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={t.thumbnail || PH} alt={t.title}
                          className="w-full h-full object-cover"
                          onError={e => { e.target.src = PH; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate"
                          style={{ color: isNow ? '#1DB954' : '#EEEEFF' }}>
                          {t.title}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,.5)' }}>
                          {t.artist}
                        </div>
                      </div>
                      {isNow
                        ? <i className="fas fa-volume-up text-g text-xs flex-shrink-0" />
                        : <button onClick={e => { e.stopPropagation(); removeFromQueue(t.id); }}
                            className="w-6 h-6 rounded-lg text-xs flex items-center justify-center
                              cursor-pointer border-none bg-transparent transition-colors flex-shrink-0"
                            style={{ color: 'rgba(255,255,255,.3)' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#FF4D6D'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.3)'}>
                            <i className="fas fa-times" />
                          </button>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareModal track={current} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}
