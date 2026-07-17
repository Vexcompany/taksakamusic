// src/pages/Home.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useApp } from '../context/AppContext';
import sb from '../lib/supabase';
import { rowToTrack, PH, BACKEND_URL, resizeThumb, fmt } from '../lib/utils';
import { SkeletonCard, SkeletonList } from '../components/ui/Skeleton';

// ── Quick Play Card ─────────────────────────────────────────────
function QPCard({ track, isNow, isAdmin, onPlay, onDelete }) {
  return (
    <div
      onClick={() => onPlay(track)}
      className={`relative bg-s1 border rounded-xl overflow-hidden cursor-pointer group
        transition-all duration-200 hover:border-white/[0.14] hover:-translate-y-0.5
        hover:shadow-[0_8px_24px_rgba(0,0,0,.5)]
        ${isNow ? 'border-g/30 ring-1 ring-g/20' : 'border-white/[0.06]'}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img src={track.thumbnail || PH} alt={track.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={e => { e.target.src = PH; }} />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100
          transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-g flex items-center justify-center
            text-black shadow-[0_0_20px_rgba(29,185,84,.5)] scale-90 group-hover:scale-100 transition-transform">
            <i className={`fas fa-${isNow ? 'pause' : 'play'}`} />
          </div>
        </div>
        {isNow && (
          <div className="absolute top-2 right-2 bg-g text-black text-[0.5rem]
            font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">▶ NOW</div>
        )}
        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); onDelete?.(track.id, track.title); }}
            className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-rd/85 text-white
              text-[0.6rem] flex items-center justify-center cursor-pointer border-none
              opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rd">
            <i className="fas fa-trash-alt" />
          </button>
        )}
      </div>
      <div className="p-2.5">
        <div className={`text-xs font-semibold truncate mb-0.5 ${isNow ? 'text-g' : ''}`}>
          {track.title || '–'}
        </div>
        <div className="text-[0.65rem] text-t2 truncate">{track.artist || '–'}</div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[0.58rem] text-t3 flex items-center gap-1">
            <i className="fas fa-headphones" style={{ fontSize: 7 }} />
            {track.playCount || 0}×
          </span>
          <span className="text-[0.62rem] text-t3">{track.duration || ''}</span>
        </div>
      </div>
    </div>
  );
}

// ── Apple Search Result ──────────────────────────────────────────
function AppleResult({ item, onPlay, loading }) {
  return (
    <div
      onClick={() => !loading && onPlay(item)}
      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer
        border border-transparent hover:bg-s2 hover:border-white/[0.06] transition-all">
      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
        <img src={resizeThumb(item.thumbnail, 100) || PH} alt={item.title}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = PH; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{item.title}</div>
        <div className="text-xs text-t2 truncate">{item.artist}</div>
      </div>
      {item.duration && <span className="text-xs text-t3 flex-shrink-0">{item.duration}</span>}
      {loading
        ? <i className="fas fa-circle-notch fa-spin text-g text-xs" />
        : <div className="w-8 h-8 rounded-full bg-g/15 border border-g/20 flex items-center
            justify-center text-g text-xs flex-shrink-0">
            <i className="fas fa-play" />
          </div>
      }
    </div>
  );
}

// ── Hero Card (Now Playing preview on beranda) ───────────────────
function HeroCard({ track, isPlaying, onPlay, onToggleLike, isLiked, onOpenNP, onShare }) {
  return (
    <div className="mb-5">
      <div className="bg-s1 border border-white/[0.06] rounded-2xl overflow-hidden
        shadow-[0_20px_60px_rgba(0,0,0,.5)]"
        style={{ display: 'grid', gridTemplateColumns: 'clamp(130px,28vw,180px) 1fr' }}>
        {/* Artwork */}
        <div className="relative overflow-hidden cursor-pointer aspect-square" onClick={onOpenNP}>
          <img src={track.thumbnail || PH} alt={track.title}
            className="w-full h-full object-cover transition-transform duration-400 hover:scale-105"
            onError={e => { e.target.src = PH; }} />
          <div className="absolute inset-0 bg-black/35 opacity-0 hover:opacity-100 transition-opacity
            flex items-center justify-center">
            <i className="fas fa-expand-alt text-white text-xl" />
          </div>
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-5">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className="w-1 bg-g rounded-sm eq-bar"
                    style={{ height: [10,20,7,17,13][i] + 'px' }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4 flex flex-col justify-between min-w-0">
          <div>
            {track.source === 'apple' && (
              <div className="inline-flex items-center gap-1 text-[0.55rem] font-black uppercase
                tracking-wider bg-red-500/12 text-red-400 border border-red-500/20 rounded-full
                px-2 py-0.5 mb-1.5">
                <i className="fab fa-apple" /> Apple Music
              </div>
            )}
            <div className="font-syne font-black text-sm sm:text-base leading-tight truncate">
              {track.title || '–'}
            </div>
            <div className="text-t2 text-xs truncate mt-0.5">{track.artist || '–'}</div>
            {track.album && (
              <div className="text-t3 text-[0.65rem] truncate mt-0.5">{track.album}</div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {track.duration && (
                <span className="flex items-center gap-1 text-[0.62rem] text-t2 bg-s2
                  border border-white/[0.06] rounded-full px-2 py-0.5">
                  <i className="far fa-clock" style={{ fontSize: 8 }} />
                  {track.duration}
                </span>
              )}
              {track.playCount > 0 && (
                <span className="flex items-center gap-1 text-[0.62rem] text-t2 bg-s2
                  border border-white/[0.06] rounded-full px-2 py-0.5">
                  <i className="fas fa-headphones" style={{ fontSize: 8 }} />
                  {track.playCount}×
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2">
            <button onClick={onPlay}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-g text-black
                text-xs font-black cursor-pointer border-none w-full justify-center
                hover:bg-g2 transition-all shadow-[0_0_14px_rgba(29,185,84,.25)] mb-2">
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
              {isPlaying ? 'Jeda' : 'Putar'}
            </button>
            <div className="flex items-center gap-1.5 justify-center">
              <button onClick={onToggleLike}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                  cursor-pointer border-none bg-s2 transition-all
                  ${isLiked ? 'text-rd' : 'text-t2 hover:text-rd'}`}>
                <i className={`${isLiked ? 'fas' : 'far'} fa-heart`} />
              </button>
              <button onClick={onShare}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm
                  cursor-pointer border-none bg-s2 text-t2 hover:text-tx transition-all">
                <i className="fas fa-share" />
              </button>
              <button onClick={onOpenNP}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm
                  cursor-pointer border-none bg-s2 text-t2 hover:text-tx transition-all">
                <i className="fas fa-music" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chart mini row ───────────────────────────────────────────────
function ChartRow({ track, rank, myPlays, onPlay, isNow }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div onClick={() => onPlay(track)}
      className={`grid items-center gap-2 px-3 py-2 rounded-xl cursor-pointer
        border transition-all hover:bg-s2
        ${isNow ? 'bg-g/8 border-g/20' : 'border-transparent hover:border-white/[0.06]'}`}
      style={{ gridTemplateColumns: '28px 44px 1fr auto' }}>
      <div className={`text-center font-syne font-black text-xs
        ${rank < 3 ? 'text-yw' : 'text-t2'}`}>
        {rank < 3 ? medals[rank] : rank + 1}
      </div>
      <div className="w-11 h-11 rounded-lg overflow-hidden">
        <img src={track.thumbnail || PH} alt={track.title}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = PH; }} />
      </div>
      <div className="min-w-0">
        <div className={`text-xs font-semibold truncate ${isNow ? 'text-g' : ''}`}>{track.title}</div>
        <div className="text-[0.68rem] text-t2 truncate">{track.artist}</div>
        {myPlays > 0 && (
          <div className="text-[0.6rem] text-p2 mt-0.5">
            <i className="fas fa-user" style={{ fontSize: 8 }} /> Kamu {myPlays}×
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-syne font-bold text-sm text-g">{track.playCount || 0}</div>
        <div className="text-[0.55rem] text-t2 uppercase">putar</div>
      </div>
    </div>
  );
}

// ── Track item for queue/history/liked ──────────────────────────
function TrackRow({ track, idx, onPlay, isNow, onRemove }) {
  return (
    <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer
      border transition-all ${isNow ? 'bg-g/8 border-g/20' : 'border-transparent hover:bg-s2 hover:border-white/[0.06]'}`}
      onClick={() => onPlay(track)}>
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
        <img src={track.thumbnail || PH} alt={track.title}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = PH; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold truncate ${isNow ? 'text-g' : ''}`}>{track.title}</div>
        <div className="text-[0.65rem] text-t2 truncate">{track.artist}</div>
      </div>
      {track.playedAt && (
        <span className="text-[0.6rem] text-t3 flex-shrink-0">{track.playedAt}</span>
      )}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(track.id); }}
          className="w-6 h-6 rounded-lg text-t3 hover:text-rd text-xs flex items-center
            justify-center cursor-pointer border-none bg-transparent transition-colors flex-shrink-0">
          <i className="fas fa-times" />
        </button>
      )}
    </div>
  );
}

// ── Live Activity Item ───────────────────────────────────────────
function ActivityItem({ item, onPlay }) {
  const ini = (item.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-transparent
      hover:bg-s2 hover:border-white/[0.06] transition-all cursor-pointer"
      onClick={() => item.track?.audio_url && onPlay(item.track)}>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-p to-bl flex items-center
        justify-center text-[0.6rem] font-black text-white flex-shrink-0 relative">
        {ini}
        {item.isMe && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-g
            border border-bg" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">
          {item.name}{item.isMe ? ' (Kamu)' : ''}
        </div>
        {item.track ? (
          <div className="text-[0.65rem] text-g flex items-center gap-1 truncate">
            <i className="fas fa-music" style={{ fontSize: 7 }} />
            {item.track.title}
          </div>
        ) : (
          <div className="text-[0.65rem] text-t3">Tidak ada info</div>
        )}
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {[0,1,2].map(i => (
          <span key={i} className="w-0.5 bg-g rounded-sm eq-bar"
            style={{ height: [8,14,6][i] + 'px' }} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function Home() {
  const {
    playTrack, togglePlay, current, isPlaying, toggleLike, isLiked,
    queue, history: histArr, liked, removeFromQueue, dispatch,
  } = usePlayer();
  const { session, showToast, myPlayCounts, incrementMyPlayCount } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tracks, setTracks]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [chartTracks, setChart] = useState([]);
  const [searching, setSearching] = useState(false);
  const [results, setResults]   = useState([]);
  const [streamLoading, setStreamLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'history' | 'liked'
  const [liveActivity, setLiveActivity] = useState([]);
  const [npOpen, setNpOpen]     = useState(false);

  const isAdmin = session?.is_admin;

  // Load quick play tracks
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await sb.get('tracks', 'order=last_played.desc.nullslast&limit=100');
        setTracks(rows.map(r => rowToTrack(r, 'db')));
      } catch (e) { showToast('Gagal memuat lagu: ' + e.message); }
      setLoading(false);
    })();
  }, []);

  // Load mini chart
  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.get('tracks', 'order=play_count.desc&limit=5&play_count=gt.0');
        setChart(rows.map(r => rowToTrack(r, 'db')));
      } catch {}
    })();
  }, []);

  // Load live activity
  useEffect(() => {
    loadActivity();
    const t = setInterval(loadActivity, 30000);
    return () => clearInterval(t);
  }, []);

  const loadActivity = async () => {
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const rows = await sb.get('play_history',
        `played_at=gte.${encodeURIComponent(since)}&order=played_at.desc&limit=30`);
      const seen = new Set();
      const unique = rows.filter(r => {
        if (seen.has(r.user_key)) return false;
        seen.add(r.user_key);
        return true;
      });
      const tids = [...new Set(unique.map(r => r.track_id).filter(Boolean))];
      let tm = {};
      if (tids.length) {
        const tracks = await sb.get('tracks',
          `id=in.(${tids.map(id => encodeURIComponent(id)).join(',')})&select=id,title,artist,audio_url`);
        tracks.forEach(t => { tm[t.id] = t; });
      }
      const userKey = session ? `${session.nama}_${session.generasi}` : '';
      setLiveActivity(unique.slice(0, 8).map(r => ({
        userKey: r.user_key,
        name: r.user_key?.split('_').slice(0,-1).join(' ') || r.user_key || '?',
        track: tm[r.track_id] || null,
        isMe: r.user_key === userKey,
      })));
    } catch {}
  };

  // Handle URL search query
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) doSearch(q);
    else setResults([]);
  }, [searchParams]);

  const doSearch = useCallback(async (q) => {
    if (!q?.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/apple-search?q=${encodeURIComponent(q)}&limit=10`
      );
      if (!res.ok) throw new Error('Pencarian gagal ' + res.status);
      const data = await res.json();
      const list = (data.results || data || []).map(item => ({
        id:        item.trackId   || item.id   || String(Date.now()),
        title:     item.trackName || item.title || 'Unknown',
        artist:    item.artistName|| item.artist|| '–',
        album:     item.collectionName || '',
        thumbnail: resizeThumb(item.artworkUrl100 || item.thumbnail || '', 300),
        duration:  item.trackTimeMillis ? fmt(item.trackTimeMillis / 1000) : item.duration || '0:00',
        appleUrl:  item.trackViewUrl || item.url || '',
        previewUrl:item.previewUrl  || '',
        source:    'apple',
      }));
      setResults(list);
    } catch (e) { showToast('❌ ' + e.message); }
    setSearching(false);
  }, []);

  const playApple = useCallback(async (item) => {
    setStreamLoading(item.id);
    showToast('⏳ Memuat audio...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appleUrl:   item.appleUrl,
          trackId:    item.id,
          title:      item.title,
          artist:     item.artist,
          thumbnail:  item.thumbnail,
          previewUrl: item.previewUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error('Stream HTTP ' + res.status);
      const data = await res.json();
      if (!data.status) throw new Error(data.message || 'Stream gagal');
      const audioUrl = data?.result?.url;
      if (!audioUrl) throw new Error('Gagal mendapatkan URL audio dari R2');
      const track = {
        ...item,
        title:     (data?.result?.title && data.result.title !== 'Unknown') ? data.result.title : item.title,
        artist:    (data?.result?.artist && data.result.artist !== 'Unknown') ? data.result.artist : item.artist,
        duration:  data?.result?.duration || item.duration || '0:00',
        thumbnail: resizeThumb(data?.result?.thumbnail || item.thumbnail, 300),
        audio:     audioUrl,
        audioUrl:  audioUrl,
        source:    'apple',
      };
      await playTrack(track);
      incrementMyPlayCount(track.id);
    } catch (e) {
      showToast('❌ Gagal: ' + e.message);
    }
    setStreamLoading(null);
  }, [playTrack, showToast, incrementMyPlayCount]);

  const handlePlay = useCallback(async (track) => {
    await playTrack(track);
    incrementMyPlayCount(track.id);
  }, [playTrack, incrementMyPlayCount]);

  const adminDeleteTrack = async (id, title) => {
    if (!window.confirm(`Hapus "${title}"?`)) return;
    try {
      await sb.del('tracks', `id=eq.${encodeURIComponent(id)}`);
      setTracks(prev => prev.filter(t => t.id !== id));
      showToast('🗑 Lagu dihapus');
    } catch (e) { showToast('Gagal hapus: ' + e.message); }
  };

  const clearSearch = () => { navigate('/'); };

  const hasQueueContent = queue.length > 0 || histArr.length > 0 || liked.length > 0;
  const searchQ = searchParams.get('q') || '';

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">

      {/* Search results */}
      {results.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 font-syne font-black text-base">
              <i className="fas fa-search text-g text-sm" />
              Hasil Pencarian
              <span className="bg-s3 text-t2 text-[0.65rem] font-bold px-2 py-0.5 rounded-full">
                {results.length}
              </span>
            </h2>
            <button onClick={clearSearch}
              className="text-t2 text-xs hover:text-rd cursor-pointer border-none bg-transparent
                flex items-center gap-1.5">
              <i className="fas fa-times" /> Hapus
            </button>
          </div>
          <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
            {results.map((item) => (
              <AppleResult key={item.id} item={item}
                onPlay={playApple}
                loading={streamLoading === item.id} />
            ))}
          </div>
        </section>
      )}

      {searching && (
        <div className="flex items-center justify-center gap-2 py-12 text-t2">
          <i className="fas fa-circle-notch fa-spin" />
          <span className="text-sm">Mencari lagu...</span>
        </div>
      )}

      {!searching && (
        <>
          {/* Hero — currently playing */}
          {current && (
            <HeroCard
              track={current}
              isPlaying={isPlaying}
              onPlay={togglePlay}
              onToggleLike={toggleLike}
              isLiked={isLiked(current.id)}
              onOpenNP={() => dispatch({ type: 'SET_NP_OPEN', payload: true })}
              onShare={() => showToast('Fitur share segera hadir!')}
            />
          )}

          {/* Shortcuts */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button onClick={() => navigate('/explore')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-s1 border border-white/[0.06] text-t2 text-xs font-semibold
                cursor-pointer hover:bg-s2 hover:text-tx hover:border-bl/30 transition-all">
              <i className="fas fa-compass text-bl2" /> Explore
            </button>
            <button onClick={() => navigate('/livefeed')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-s1 border border-white/[0.06] text-t2 text-xs font-semibold
                cursor-pointer hover:bg-s2 hover:text-tx hover:border-rd/30 transition-all">
              <i className="fas fa-satellite-dish text-rd" /> Live Feed
            </button>
            <button onClick={() => navigate('/vtuber')}
              className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-p/10 border border-p/20 text-p2 text-xs font-bold
                cursor-pointer hover:bg-p/15 hover:border-p/35 transition-all">
              <i className="fas fa-star" /> VTuber Cover Archive
            </button>
          </div>

          {/* Live Activity */}
          {liveActivity.length > 0 && (
            <section className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="flex items-center gap-2 font-syne font-black text-sm">
                  <span className="w-2 h-2 rounded-full bg-rd animate-pulse" />
                  Live Activity
                </h2>
                <button onClick={() => navigate('/livefeed')}
                  className="text-t2 text-xs hover:text-g cursor-pointer border-none bg-transparent
                    flex items-center gap-1">
                  Lihat semua <i className="fas fa-chevron-right text-[0.6rem]" />
                </button>
              </div>
              <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
                {liveActivity.map((item, i) => (
                  <ActivityItem key={i} item={item}
                    onPlay={(t) => handlePlay(rowToTrack(t, 'db'))} />
                ))}
              </div>
            </section>
          )}

          {/* Quick play grid */}
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 font-syne font-black text-base">
                <i className="fas fa-bolt text-yw text-sm" />
                Lagu Database
                <span className="bg-s3 text-t2 text-[0.65rem] font-bold px-2 py-0.5 rounded-full">
                  {tracks.length}
                </span>
              </h2>
              <button onClick={() => {
                setLoading(true);
                sb.get('tracks', 'order=last_played.desc.nullslast&limit=100')
                  .then(rows => setTracks(rows.map(r => rowToTrack(r, 'db'))))
                  .catch(() => {})
                  .finally(() => setLoading(false));
              }} className="text-t2 text-xs hover:text-tx cursor-pointer border-none bg-transparent
                flex items-center gap-1.5">
                <i className="fas fa-sync-alt" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-12 text-t2">
                <i className="fas fa-music text-4xl mb-3 block opacity-30" />
                <p className="text-sm">Belum ada lagu. Cari dulu lewat topbar!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {tracks.map(t => (
                  <QPCard
                    key={t.id}
                    track={t}
                    isNow={current?.id === t.id}
                    isAdmin={isAdmin}
                    onPlay={handlePlay}
                    onDelete={adminDeleteTrack}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Mini chart */}
          {chartTracks.length > 0 && (
            <section className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-2 font-syne font-black text-base">
                  <i className="fas fa-fire text-rd text-sm" />
                  Top Chart
                  <span className="bg-s3 text-t2 text-[0.65rem] font-bold px-2 py-0.5 rounded-full">
                    {chartTracks.length}
                  </span>
                </h2>
                <button onClick={() => navigate('/chart')}
                  className="text-t2 text-xs hover:text-g cursor-pointer border-none bg-transparent
                    flex items-center gap-1.5 font-semibold">
                  Lihat semua <i className="fas fa-chevron-right text-[0.6rem]" />
                </button>
              </div>
              <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
                {chartTracks.map((t, i) => (
                  <ChartRow key={t.id} track={t} rank={i}
                    myPlays={myPlayCounts[t.id] || 0}
                    onPlay={handlePlay}
                    isNow={current?.id === t.id} />
                ))}
              </div>
            </section>
          )}

          {/* Queue / History / Liked tabs */}
          {hasQueueContent && (
            <section className="mb-5">
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-s2 border border-white/[0.06] rounded-xl mb-3">
                {[
                  { key: 'queue',   label: 'Queue',    count: queue.length,   icon: 'fa-list' },
                  { key: 'history', label: 'Riwayat',  count: histArr.length, icon: 'fa-history' },
                  { key: 'liked',   label: 'Disukai',  count: liked.length,   icon: 'fa-heart' },
                ].map(tab => (
                  <button key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                      text-xs font-bold cursor-pointer border-none transition-all
                      ${activeTab === tab.key
                        ? 'bg-s4 text-tx'
                        : 'bg-transparent text-t2 hover:text-tx'}`}>
                    <i className={`fas ${tab.icon}`} />
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[0.58rem] font-black
                      ${activeTab === tab.key ? 'bg-g/20 text-g' : 'bg-s3 text-t3'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Queue panel */}
              {activeTab === 'queue' && (
                <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
                  {queue.length === 0 ? (
                    <div className="text-center py-8 text-t2 text-xs">
                      <i className="fas fa-list text-2xl mb-2 block opacity-20" />
                      Queue kosong
                    </div>
                  ) : queue.map((t) => (
                    <TrackRow key={t.id} track={t}
                      isNow={current?.id === t.id}
                      onPlay={handlePlay}
                      onRemove={(id) => removeFromQueue(id)} />
                  ))}
                </div>
              )}

              {/* History panel */}
              {activeTab === 'history' && (
                <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
                  {histArr.length === 0 ? (
                    <div className="text-center py-8 text-t2 text-xs">
                      <i className="fas fa-history text-2xl mb-2 block opacity-20" />
                      Belum ada riwayat
                    </div>
                  ) : histArr.slice(0, 30).map((t, i) => (
                    <TrackRow key={`${t.id}-${i}`} track={t}
                      isNow={current?.id === t.id}
                      onPlay={handlePlay} />
                  ))}
                </div>
              )}

              {/* Liked panel */}
              {activeTab === 'liked' && (
                <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
                  {liked.length === 0 ? (
                    <div className="text-center py-8 text-t2 text-xs">
                      <i className="far fa-heart text-2xl mb-2 block opacity-20" />
                      Belum ada lagu yang disukai
                    </div>
                  ) : liked.map((t, i) => (
                    <TrackRow key={`${t.id}-${i}`} track={t}
                      isNow={current?.id === t.id}
                      onPlay={handlePlay} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
