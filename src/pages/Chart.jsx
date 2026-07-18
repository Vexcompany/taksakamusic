// src/pages/Chart.jsx
import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useApp } from '../context/AppContext';
import sb from '../lib/supabase';
import { rowToTrack, PH } from '../lib/utils';
import { SkeletonList } from '../components/ui/Skeleton';

const PERIODS = [
  { key: 'all',   label: 'Semua' },
  { key: 'week',  label: 'Minggu ini' },
  { key: 'month', label: 'Bulan ini' },
];

export default function Chart() {
  const { playTrack, current } = usePlayer();
  const { showToast, myPlayCounts, incrementMyPlayCount } = useApp();
  const [period, setPeriod]   = useState('all');
  const [tracks, setTracks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadChart(period); }, [period]);

  const loadChart = async (p) => {
    setLoading(true);
    try {
      let rows = [];
      if (p === 'all') {
        rows = await sb.get('tracks', 'order=play_count.desc&limit=100&play_count=gt.0');
      } else {
        const now   = new Date();
        const since = new Date(now);
        if (p === 'week')  since.setDate(now.getDate() - 7);
        if (p === 'month') since.setMonth(now.getMonth() - 1);
        const si = since.toISOString();
        const hist = await sb.get('play_history',
          `played_at=gte.${encodeURIComponent(si)}&select=track_id`);
        // FIX: guard Array.isArray (sb.get() now always returns array, but belt+suspenders)
        if (!Array.isArray(hist) || !hist.length) { setTracks([]); setLoading(false); return; }
        const cm = {};
        hist.forEach(h => { cm[h.track_id] = (cm[h.track_id] || 0) + 1; });
        const ids = Object.keys(cm);
        const tr = await sb.get('tracks',
          `id=in.(${ids.map(id => encodeURIComponent(id)).join(',')})`);
        rows = (Array.isArray(tr) ? tr : [])
          .map(t => ({ ...t, play_count: cm[t.id] || 0 }))
          .filter(t => t.play_count > 0)
          .sort((a, b) => b.play_count - a.play_count)
          .slice(0, 50);
      }
      setTracks((Array.isArray(rows) ? rows : []).map(r => rowToTrack(r, 'db')));
    } catch (e) {
      showToast('Gagal load chart: ' + e.message);
      setTracks([]);
    }
    setLoading(false);
  };

  const handlePlay = async (t) => {
    await playTrack(t);
    incrementMyPlayCount(t.id);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-1">
          <i className="fas fa-fire text-rd" />
          Top Chart Pagaska
        </h1>
        <p className="text-t2 text-xs">Lagu paling banyak diputar oleh semua anggota</p>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider
              flex-shrink-0 cursor-pointer border transition-all
              ${period === p.key
                ? 'bg-g text-black border-g shadow-[0_0_14px_rgba(29,185,84,.3)]'
                : 'bg-s2 text-t2 border-white/[0.06] hover:bg-s3 hover:text-tx'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2">
          <SkeletonList count={10} />
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-t2">
          <i className="fas fa-fire text-4xl mb-3 block opacity-20" />
          <p className="text-sm">Belum ada data untuk periode ini</p>
        </div>
      ) : (
        <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
          {tracks.map((t, i) => {
            const isNow  = current?.id === t.id;
            const mine   = myPlayCounts[t.id] || 0;
            const rankCls = i === 0 ? 'text-yw' : i === 1 ? 'text-t2' : i === 2 ? 'text-p2' : 'text-t3';

            return (
              <div key={t.id} onClick={() => handlePlay(t)}
                className={`grid items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                  border transition-all
                  ${isNow ? 'bg-g/8 border-g/20' : 'border-transparent hover:bg-s2 hover:border-white/[0.06]'}`}
                style={{ gridTemplateColumns: '28px 44px 1fr auto' }}>

                {/* Rank */}
                <div className={`text-center font-syne font-black text-sm ${rankCls}`}>
                  {i < 3 ? medals[i] : i + 1}
                </div>

                {/* Thumb */}
                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={t.thumbnail || PH} alt={t.title}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src = PH; }} />
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${isNow ? 'text-g' : ''}`}>{t.title}</div>
                  <div className="text-[0.68rem] text-t2 truncate">{t.artist}</div>
                  {mine > 0 && (
                    <div className="text-[0.6rem] text-p2 mt-0.5">
                      <i className="fas fa-user" style={{ fontSize: 7 }} /> Kamu {mine}×
                    </div>
                  )}
                </div>

                {/* Play count */}
                <div className="text-right flex-shrink-0">
                  <div className="font-syne font-bold text-sm text-g">{t.playCount || 0}</div>
                  <div className="text-[0.55rem] text-t2 uppercase">putar</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
