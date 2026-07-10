// src/pages/LiveFeed.jsx
import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useApp } from '../context/AppContext';
import sb from '../lib/supabase';
import { PH, getUserKey, getSession, getTimeAgo, rowToTrack } from '../lib/utils';
import Avatar from '../components/ui/Avatar';

const POLL_MS = 15000;

export default function LiveFeed() {
  const { playTrack } = usePlayer();
  const { showToast }  = useApp();
  const session  = getSession();
  const userKey  = getUserKey(session);

  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  // Load live feed — same logic as original loadLiveFeed()
  const loadFeed = async () => {
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const rows = await sb.get('play_history',
        `played_at=gte.${encodeURIComponent(since)}&order=played_at.desc&limit=50`);

      // Deduplicate per user_key (most recent only)
      const seen   = new Set();
      const unique = rows.filter(r => {
        if (seen.has(r.user_key)) return false;
        seen.add(r.user_key);
        return true;
      });

      if (!unique.length) { setItems([]); setLoading(false); return; }

      // Fetch track details
      const tids   = [...new Set(unique.map(r => r.track_id).filter(Boolean))];
      const tracks = tids.length
        ? await sb.get('tracks',
            `id=in.(${tids.map(id => encodeURIComponent(id)).join(',')})&select=id,title,artist,thumbnail,audio_url,duration`)
        : [];
      const tm = {};
      tracks.forEach(t => { tm[t.id] = t; });

      setItems(unique.map(r => ({
        userKey:  r.user_key,
        name:     r.user_key?.split('_').slice(0, -1).join(' ') || r.user_key || '?',
        track:    tm[r.track_id] || null,
        playedAt: r.played_at,
        isMe:     r.user_key === userKey,
      })));
    } catch (e) {
      console.warn('[LiveFeed]', e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFeed();
    timerRef.current = setInterval(loadFeed, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  const handlePlayTrack = async (t) => {
    if (!t?.audio_url) { showToast('Audio tidak tersedia'); return; }
    await playTrack(rowToTrack(t, 'db'));
  };

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-1">
            <i className="fas fa-satellite-dish text-rd" />
            Sedang Diputar
          </h1>
          <p className="text-t2 text-xs">Anggota aktif mendengarkan saat ini</p>
        </div>
        <button onClick={() => { setLoading(true); loadFeed(); }}
          className="w-9 h-9 rounded-xl bg-s2 border border-white/[0.06] text-t2 text-sm
            flex items-center justify-center cursor-pointer border-none hover:bg-s3 hover:text-tx transition-all">
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {/* Live badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-rd/10 border border-rd/25
          rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rd animate-pulse" />
          <span className="text-rd text-[0.65rem] font-bold uppercase tracking-wider">Live</span>
        </div>
        <span className="text-t3 text-xs">Diperbarui setiap 15 detik</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-t2">
          <i className="fas fa-circle-notch fa-spin" />
          <span className="text-sm">Memuat...</span>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-20 text-t2">
          <i className="fas fa-headphones text-4xl mb-3 block opacity-20" />
          <p className="text-sm font-semibold">Belum ada yang mendengarkan saat ini</p>
          <p className="text-xs text-t3 mt-1">Mulai putar lagu dan kamu akan muncul di sini!</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.userKey}
              className="flex items-center gap-3 bg-s1 border border-white/[0.06]
                rounded-2xl p-3.5 transition-all hover:border-white/[0.11] hover:bg-s2">

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar userKey={item.userKey} name={item.name} size={44} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
                  bg-g border-2 border-bg" />
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold truncate">
                    {item.name}
                    {item.isMe && (
                      <span className="text-g text-[0.68rem] font-normal ml-1">(kamu)</span>
                    )}
                  </span>
                </div>
                {item.track ? (
                  <div className="text-xs text-t2 truncate mt-0.5">
                    {item.track.title}
                    {item.track.artist && <span className="text-t3"> · {item.track.artist}</span>}
                  </div>
                ) : (
                  <div className="text-xs text-t3 mt-0.5">Memutar lagu</div>
                )}
                <div className="text-[0.62rem] text-t3 mt-0.5">{getTimeAgo(item.playedAt)}</div>
              </div>

              {/* Track thumbnail */}
              {item.track?.thumbnail && (
                <div
                  onClick={() => handlePlayTrack(item.track)}
                  className="flex-shrink-0 relative cursor-pointer group">
                  <img src={item.track.thumbnail} alt={item.track.title}
                    className="w-11 h-11 rounded-lg object-cover"
                    onError={e => { e.target.src = PH; }} />
                  <div className="absolute inset-0 bg-black/40 rounded-lg
                    opacity-0 group-hover:opacity-100 transition-opacity
                    flex items-center justify-center">
                    <i className="fas fa-play text-white text-xs" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
