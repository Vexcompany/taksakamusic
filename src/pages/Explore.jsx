// src/pages/Explore.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useApp } from '../context/AppContext';
import sb from '../lib/supabase';
import { PH, rowToTrack, fmt } from '../lib/utils';
import { SkeletonList } from '../components/ui/Skeleton';

export default function Explore() {
  const { playTrack, current } = usePlayer();
  const { showToast, incrementMyPlayCount } = useApp();

  const [tracks, setTracks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const [activeArtist, setActiveArtist] = useState('');

  // Load all tracks from Supabase (same as original onExpSearch)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await sb.get('tracks', 'order=title.asc&limit=500');
        if (!Array.isArray(rows)) { setLoading(false); return; }
        setTracks(rows.map(r => rowToTrack(r, 'db')));
      } catch (e) { showToast('Gagal: ' + e.message); }
      setLoading(false);
    })();
  }, []);

  // Artist chips
  const artists = useMemo(() => {
    const a = [...new Set(tracks.map(t => t.artist).filter(Boolean))].sort();
    return a;
  }, [tracks]);

  // Filtered results
  const filtered = useMemo(() => {
    let r = tracks;
    if (activeArtist) r = r.filter(t => t.artist === activeArtist);
    if (query.trim())  r = r.filter(t =>
      t.title?.toLowerCase().includes(query.toLowerCase()) ||
      t.artist?.toLowerCase().includes(query.toLowerCase()) ||
      t.album?.toLowerCase().includes(query.toLowerCase())
    );
    return r;
  }, [tracks, query, activeArtist]);

  const handlePlay = useCallback(async (t) => {
    await playTrack(t);
    incrementMyPlayCount(t.id);
  }, [playTrack, incrementMyPlayCount]);

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-1">
          <i className="fas fa-compass text-bl2" />
          Explore
        </h1>
        <p className="text-t2 text-xs">Temukan lagu berdasarkan artis atau album</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-s2 border border-white/[0.06] rounded-xl px-3 mb-3
        focus-within:border-g transition-all" style={{ height: 44 }}>
        <i className="fas fa-search text-t2 text-xs" />
        <input
          type="text" value={query}
          onChange={e => { setQuery(e.target.value); setActiveArtist(''); }}
          placeholder="Cari artis, album, atau judul..."
          className="flex-1 bg-transparent border-none outline-none text-tx text-sm
            placeholder:text-t3 font-inter" />
        {query && (
          <button onClick={() => setQuery('')}
            className="text-t2 hover:text-rd text-xs cursor-pointer border-none bg-transparent">
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* Artist chips */}
      {artists.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1.5" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveArtist('')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 cursor-pointer
              border transition-all
              ${!activeArtist
                ? 'bg-g text-black border-g'
                : 'bg-s2 text-t2 border-white/[0.06] hover:bg-s3 hover:text-tx'}`}>
            Semua
          </button>
          {artists.map(a => (
            <button key={a} onClick={() => { setActiveArtist(a === activeArtist ? '' : a); setQuery(''); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 cursor-pointer
                border transition-all whitespace-nowrap
                ${activeArtist === a
                  ? 'bg-p text-white border-p'
                  : 'bg-s2 text-t2 border-white/[0.06] hover:bg-s3 hover:text-tx'}`}>
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <div className="text-xs text-t2 mb-2 font-semibold">
          {filtered.length} lagu
          {activeArtist && <span> oleh <span className="text-p2">{activeArtist}</span></span>}
          {query && <span> untuk "<span className="text-g">{query}</span>"</span>}
        </div>
      )}

      {/* Track list */}
      {loading ? (
        <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2">
          <SkeletonList count={8} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-t2">
          <i className="fas fa-search text-4xl mb-3 block opacity-20" />
          <p className="text-sm">Tidak ditemukan</p>
          <p className="text-xs text-t3 mt-1">Coba kata kunci lain</p>
        </div>
      ) : (
        <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
          {filtered.map((t, i) => {
            const isNow = current?.id === t.id;
            return (
              <div key={t.id} onClick={() => handlePlay(t)}
                className={`grid items-center gap-2 px-3 py-2 rounded-xl cursor-pointer
                  border transition-all
                  ${isNow ? 'bg-g/8 border-g/20' : 'border-transparent hover:bg-s2 hover:border-white/[0.06]'}`}
                style={{ gridTemplateColumns: '24px 44px 1fr auto' }}>
                <div className={`text-center text-xs ${isNow ? 'text-g' : 'text-t3'}`}>
                  {isNow
                    ? <i className="fas fa-volume-up text-g" style={{ fontSize: 10 }} />
                    : i + 1}
                </div>
                <div className="w-11 h-11 rounded-lg overflow-hidden">
                  <img src={t.thumbnail || PH} alt={t.title}
                    className="w-full h-full object-cover" loading="lazy"
                    onError={e => { e.target.src = PH; }} />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${isNow ? 'text-g' : ''}`}>{t.title}</div>
                  <div className="text-[0.68rem] text-t2 truncate">{t.artist}</div>
                  {t.album && <div className="text-[0.6rem] text-t3 truncate">{t.album}</div>}
                </div>
                <div className="text-xs text-t2 whitespace-nowrap">{t.duration || ''}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
