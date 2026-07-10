// src/pages/Wrapped.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import sb from '../lib/supabase';
import { PH, getUserKey, getSession } from '../lib/utils';

const PERIODS = [
  { key: 'month', label: 'Bulan ini' },
  { key: 'year',  label: 'Tahun ini' },
  { key: 'all',   label: 'Semua waktu' },
];

function StatCard({ icon, value, label, color = 'text-g' }) {
  return (
    <div className="bg-s1 border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center gap-2">
      <div className={`text-2xl ${color}`}><i className={`fas ${icon}`} /></div>
      <div className={`font-syne font-black text-2xl ${color}`}>{value ?? '–'}</div>
      <div className="text-t2 text-xs uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

export default function Wrapped() {
  const { showToast } = useApp();
  const { playTrack, current } = usePlayer();
  const session = getSession();
  const userKey = getUserKey(session);

  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => { loadWrapped(period); }, [period]);

  const loadWrapped = async (p) => {
    setLoading(true);
    try {
      // Date range
      const now   = new Date();
      let since   = null;
      if (p === 'month') { since = new Date(now); since.setMonth(now.getMonth() - 1); }
      if (p === 'year')  { since = new Date(now); since.setFullYear(now.getFullYear() - 1); }

      // Fetch play history for this user
      let query = `user_key=eq.${encodeURIComponent(userKey)}&order=played_at.desc`;
      if (since) query += `&played_at=gte.${encodeURIComponent(since.toISOString())}`;
      const hist = await sb.get('play_history', query);

      if (!hist?.length) { setStats({ empty: true }); setLoading(false); return; }

      // Aggregate
      const trackCounts = {};
      const artistCounts = {};
      const daySet = new Set();
      const hourBuckets = new Array(24).fill(0);

      hist.forEach(r => {
        if (r.track_id) trackCounts[r.track_id] = (trackCounts[r.track_id] || 0) + 1;
        const d = new Date(r.played_at);
        daySet.add(d.toDateString());
        hourBuckets[d.getHours()]++;
      });

      const totalPlays   = hist.length;
      const uniqTracks   = Object.keys(trackCounts).length;

      // Streak — count consecutive days ending today
      let streak = 0;
      const today = new Date(); today.setHours(0,0,0,0);
      for (let i = 0; ; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        if (daySet.has(d.toDateString())) streak++;
        else break;
      }

      // Fetch track details for top tracks
      const topTrackIds = Object.entries(trackCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
      let topTracks = [];
      if (topTrackIds.length) {
        const rows = await sb.get('tracks',
          `id=in.(${topTrackIds.map(id => encodeURIComponent(id)).join(',')})`);
        topTracks = topTrackIds.map(id => {
          const r = rows.find(x => String(x.id) === String(id));
          return r ? { ...r, myPlays: trackCounts[id] } : null;
        }).filter(Boolean);
      }

      // Artist aggregation from top tracks
      topTracks.forEach(t => {
        if (t.artist) artistCounts[t.artist] = (artistCounts[t.artist] || 0) + (t.myPlays || 1);
      });
      const topArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Time slot analysis
      const slots = [
        { label: 'Dini hari', hours: [0,1,2,3,4,5] },
        { label: 'Pagi', hours: [6,7,8,9,10,11] },
        { label: 'Siang', hours: [12,13,14,15,16,17] },
        { label: 'Malam', hours: [18,19,20,21,22,23] },
      ];
      const slotCounts = slots.map(s => ({
        label: s.label,
        count: s.hours.reduce((sum, h) => sum + hourBuckets[h], 0),
      })).sort((a, b) => b.count - a.count);

      // Estimate total minutes from track durations
      const durationRows = await sb.get('tracks',
        `id=in.(${topTrackIds.slice(0, 20).map(id => encodeURIComponent(id)).join(',')})&select=id,duration`
      ).catch(() => []);
      const durMap = {};
      durationRows.forEach(r => {
        if (r.duration) {
          const [m, s] = r.duration.split(':').map(Number);
          durMap[r.id] = (m || 0) * 60 + (s || 0);
        }
      });
      let totalSecs = 0;
      hist.forEach(r => { totalSecs += durMap[r.track_id] || 210; }); // 3.5min fallback
      const totalMins = Math.round(totalSecs / 60);

      setStats({ totalPlays, totalMins, uniqTracks, streak, topTracks, topArtists, slotCounts });
    } catch (e) {
      showToast('Gagal load rekap: ' + e.message);
      setStats({ empty: true });
    }
    setLoading(false);
  };

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-1">
          <i className="fas fa-star text-g" />
          Rekap Kamu
        </h1>
        <p className="text-t2 text-xs">Statistik musik personalmu di Pagaska</p>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
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

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-t2">
          <i className="fas fa-circle-notch fa-spin" />
          <span className="text-sm">Memuat rekap...</span>
        </div>
      )}

      {!loading && stats?.empty && (
        <div className="text-center py-20 text-t2">
          <i className="fas fa-star text-4xl mb-3 block opacity-20" />
          <p className="text-sm">Belum ada riwayat musik untuk periode ini</p>
          <p className="text-xs text-t3 mt-1">Mulai putar lagu untuk mengisi rekap!</p>
        </div>
      )}

      {!loading && stats && !stats.empty && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard icon="fa-play-circle" value={stats.totalPlays}   label="Total Putar" />
            <StatCard icon="fa-clock"       value={stats.totalMins}    label="Menit Didengar" color="text-bl2" />
            <StatCard icon="fa-music"       value={stats.uniqTracks}   label="Lagu Berbeda"   color="text-p2" />
            <StatCard icon="fa-fire"        value={`${stats.streak}h`} label="Hari Berturut"  color="text-rd" />
          </div>

          {/* Top tracks */}
          {stats.topTracks?.length > 0 && (
            <section className="mb-5">
              <h2 className="flex items-center gap-2 font-syne font-black text-sm mb-2 text-t2 uppercase tracking-widest">
                <i className="fas fa-trophy text-yw" /> Lagu Terfavorit
              </h2>
              <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
                {stats.topTracks.map((t, i) => (
                  <div key={t.id} onClick={() => playTrack({ ...t, audio: t.audio_url, audioUrl: t.audio_url, thumbnail: t.thumbnail || PH, source: 'db' })}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer
                      border transition-all hover:bg-s2
                      ${current?.id === t.id ? 'bg-g/8 border-g/20' : 'border-transparent hover:border-white/[0.06]'}`}>
                    <div className="w-6 text-center font-syne font-black text-xs text-t3">{i + 1}</div>
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={t.thumbnail || PH} alt={t.title}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = PH; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold truncate ${current?.id === t.id ? 'text-g' : ''}`}>{t.title}</div>
                      <div className="text-[0.68rem] text-t2 truncate">{t.artist}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-g font-syne font-bold text-sm">{t.myPlays}×</div>
                      <div className="text-t3 text-[0.55rem]">putar</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top artists */}
          {stats.topArtists?.length > 0 && (
            <section className="mb-5">
              <h2 className="flex items-center gap-2 font-syne font-black text-sm mb-2 text-t2 uppercase tracking-widest">
                <i className="fas fa-microphone text-p2" /> Artis Terbanyak
              </h2>
              <div className="bg-s1 border border-white/[0.06] rounded-2xl p-3 space-y-2">
                {stats.topArtists.map(([artist, count], i) => {
                  const maxCount = stats.topArtists[0][1];
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={artist}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate max-w-[65%]">{artist}</span>
                        <span className="text-[0.65rem] text-t2 font-syne font-bold">{count}×</span>
                      </div>
                      <div className="h-1.5 bg-s3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${['#1DB954','#7C5CBF','#3D8EF8','#FF4D6D','#FFA726'][i]}, transparent)`,
                          }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Time slot */}
          {stats.slotCounts?.length > 0 && (
            <section className="mb-5">
              <h2 className="flex items-center gap-2 font-syne font-black text-sm mb-2 text-t2 uppercase tracking-widest">
                <i className="fas fa-moon text-bl2" /> Waktu Favorit
              </h2>
              <div className="bg-s1 border border-white/[0.06] rounded-2xl p-3 space-y-2">
                {stats.slotCounts.map(({ label, count }, i) => {
                  const max = stats.slotCounts[0].count;
                  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
                  const icons = ['🌙', '☀️', '🌤️', '🌛'];
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{icons[i]} {label}</span>
                        <span className="text-[0.65rem] text-t2 font-syne font-bold">{count}×</span>
                      </div>
                      <div className="h-1.5 bg-s3 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-bl to-p rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
