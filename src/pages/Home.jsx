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
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden">
        <img src={track.thumbnail || PH} alt={track.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={e => { e.target.src = PH; }} />

        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100
          transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-g flex items-center justify-center
            text-black shadow-[0_0_20px_rgba(29,185,84,.5)] scale-90 group-hover:scale-100 transition-transform">
            <i className={`fas fa-${isNow ? 'pause' : 'play'}`} />
          </div>
        </div>

        {/* Now playing badge */}
        {isNow && (
          <div className="absolute top-2 right-2 bg-g text-black text-[0.5rem]
            font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">▶ NOW</div>
        )}

        {/* Admin delete */}
        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); onDelete?.(track.id, track.title); }}
            className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-rd/85 text-white
              text-[0.6rem] flex items-center justify-center cursor-pointer border-none
              opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rd">
            <i className="fas fa-trash-alt" />
          </button>
        )}
      </div>

      {/* Info */}
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
function AppleResult({ item, idx, onPlay, loading }) {
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
      {loading && <i className="fas fa-circle-notch fa-spin text-g text-xs" />}
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

// ══════════════════════════════════════════════════════════════════
export default function Home() {
  const { playTrack, current, isPlaying } = usePlayer();
  const { session, showToast, myPlayCounts, incrementMyPlayCount } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tracks, setTracks]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [chartTracks, setChart] = useState([]);
  const [searchQ, setSearchQ]   = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults]   = useState([]);
  const [streamLoading, setStreamLoading] = useState(null); // track id being streamed

  const isAdmin = session?.is_admin;

  // ── Load quick play tracks ─────────────────────────────────────
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

  // ── Load mini chart ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.get('tracks', 'order=play_count.desc&limit=5&play_count=gt.0');
        setChart(rows.map(r => rowToTrack(r, 'db')));
      } catch {}
    })();
  }, []);

  // ── Handle URL search query ────────────────────────────────────
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setSearchQ(q); doSearch(q); }
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
      // Save to Supabase
      _saveTrackToSupabase(track, audioUrl);
    } catch (e) {
      showToast('❌ Gagal: ' + e.message);
    }
    setStreamLoading(null);
  }, [playTrack, showToast, incrementMyPlayCount]);

  const _saveTrackToSupabase = async (track, audioUrl) => {
    try {
      await fetch(`${window.SB_URL || ''}/rest/v1/tracks?on_conflict=id`, {
        method: 'POST',
        headers: {
          ...sb._h(),
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          id:            track.id,
          title:         track.title,
          artist:        track.artist,
          thumbnail:     track.thumbnail || null,
          duration:      track.duration  || null,
          audio_url:     audioUrl,
          last_played:   new Date().toISOString(),
          search_query:  track.searchQuery || null,
          searched_by:   session?.nama || null,
          source:        'apple',
        }),
      });
    } catch {}
  };

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

  const clearSearch = () => { setSearchQ(''); setResults([]); navigate('/'); };

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
            {results.map((item, i) => (
              <AppleResult key={item.id} item={item} idx={i}
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

      {/* Quick play grid */}
      {!searching && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 font-syne font-black text-base">
              <i className="fas fa-bolt text-g text-sm" />
              Quick Play
              <span className="bg-s3 text-t2 text-[0.65rem] font-bold px-2 py-0.5 rounded-full">
                {tracks.length}
              </span>
            </h2>
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
      )}

      {/* Mini chart */}
      {!searching && chartTracks.length > 0 && (
        <section className="mb-6">
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
    </div>
  );
}
