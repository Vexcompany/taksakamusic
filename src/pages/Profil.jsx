// src/pages/Profil.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import sb from '../lib/supabase';
import { getUserKey, getSession, PH, BACKEND_URL } from '../lib/utils';
import Avatar from '../components/ui/Avatar';

const KB_SHORTCUTS = [
  { key: 'Space',     desc: 'Play / Pause' },
  { key: '← →',      desc: 'Seek ±10 detik' },
  { key: '↑ ↓',      desc: 'Volume' },
  { key: 'Shift+← →',desc: 'Prev / Next' },
  { key: 'M',        desc: 'Mute toggle' },
  { key: 'S',        desc: 'Shuffle' },
  { key: 'R',        desc: 'Repeat' },
  { key: 'L',        desc: 'Like lagu' },
  { key: 'F',        desc: 'Fullscreen player' },
];

// ── Pin Picker Modal ──────────────────────────────────────────────
function PinPicker({ slot, existingPinId, onSave, onRemove, onClose }) {
  const [tracks, setTracks] = useState([]);
  const [query, setQuery]   = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useApp();

  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.get('tracks',
          'select=id,title,artist,thumbnail&order=title.asc&limit=500');
        setTracks(rows || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = tracks.filter(t => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (t.title || '').toLowerCase().includes(q) ||
           (t.artist || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,.7)' }}
      onClick={onClose}>
      <div className="w-full max-w-[480px] bg-s1 border border-white/[0.11] rounded-t-3xl
        flex flex-col max-h-[80dvh]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="font-syne font-black text-base">
            <i className="fas fa-thumbtack text-g mr-2" />Pin Slot {slot + 1}
          </div>
          <div className="flex items-center gap-2">
            {existingPinId && (
              <button onClick={onRemove}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rd
                  bg-rd/10 border border-rd/20 cursor-pointer hover:bg-rd/20 transition-all">
                Hapus Pin
              </button>
            )}
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg bg-s3 text-t2 flex items-center justify-center
                text-xs cursor-pointer border-none hover:bg-s4 hover:text-tx transition-all">
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mx-4 my-2 bg-s2 border border-white/[0.06]
          rounded-xl px-3 focus-within:border-g transition-all flex-shrink-0" style={{ height: 40 }}>
          <i className="fas fa-search text-t2 text-xs" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cari lagu..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-tx
              placeholder:text-t3 font-inter" />
        </div>

        {/* Track list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 scrollbar-none">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-t2">
              <i className="fas fa-circle-notch fa-spin text-sm" />
            </div>
          ) : filtered.slice(0, 100).map(t => (
            <div key={t.id}
              onClick={() => onSave(t)}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer
                border transition-all mb-0.5
                ${existingPinId === t.id
                  ? 'bg-g/10 border-g/30'
                  : 'border-transparent hover:bg-s2 hover:border-white/[0.06]'}`}>
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                <img src={t.thumbnail || PH} alt={t.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = PH; }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{t.title}</div>
                <div className="text-xs text-t2 truncate">{t.artist}</div>
              </div>
              {existingPinId === t.id && <i className="fas fa-check text-g text-sm flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function Profil() {
  const navigate   = useNavigate();
  const { showToast } = useApp();
  const { history: histArr, playTrack } = usePlayer();
  const session    = getSession();
  const userKey    = getUserKey(session);

  const [stats, setStats]             = useState(null);
  const [pins, setPins]               = useState([null, null, null]);
  const [avatarUrl, setAvatarUrl]     = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pickerSlot, setPickerSlot]   = useState(null); // 0|1|2
  const fileInputRef = useRef(null);
  const isDesktop    = window.innerWidth >= 1024;

  const loadProfile = useCallback(async () => {
    try {
      // FIX: each sb.get() now always returns array, but use .catch() per-request
      // so one failure (e.g. user_pins table issue) doesn't wipe all data
      const [histRows, pinRows, avRows] = await Promise.all([
        sb.get('play_history', `user_key=eq.${encodeURIComponent(userKey)}&select=track_id,played_at`).catch(() => []),
        sb.get('user_pins',    `user_key=eq.${encodeURIComponent(userKey)}&order=position.asc`).catch(() => []),
        sb.get('user_avatars', `user_key=eq.${encodeURIComponent(userKey)}&select=avatar_url`).catch(() => []),
      ]);

      // FIX: guard Array.isArray before .length / .map
      const safeHist = Array.isArray(histRows) ? histRows : [];
      const safePins = Array.isArray(pinRows)  ? pinRows  : [];
      const safeAvs  = Array.isArray(avRows)   ? avRows   : [];

      setStats({
        totalPlays:   safeHist.length,
        uniqueTracks: new Set(safeHist.map(r => r.track_id)).size,
      });

      // Fill 3 slots
      const filled = [null, null, null];
      for (const pin of safePins) {
        const idx = (pin.position || 1) - 1;
        if (idx >= 0 && idx < 3) filled[idx] = pin;
      }
      setPins(filled);
      setAvatarUrl(safeAvs[0]?.avatar_url || null);
    } catch (e) {
      console.log('[Profil] Load error:', e.message);
    }
  }, [userKey]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const doLogout = () => {
    localStorage.removeItem('pgsk_v2_session');
    localStorage.removeItem('pgsk_admin_session');
    localStorage.removeItem('pgsk_resume_v1');
    window.location.href = '/login';
  };

  // Avatar upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('❌ File terlalu besar (max 2MB)'); return; }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      showToast('❌ Format tidak didukung'); return;
    }
    setUploadLoading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      form.append('user_key', userKey);
      const res  = await fetch(`${BACKEND_URL}/api/upload-avatar`, { method: 'POST', body: form });
      const data = await res.json();
      if (!data.url) throw new Error(data.message || 'Upload gagal');
      setAvatarUrl(data.url);
      showToast('✅ Foto profil diperbarui!');
    } catch (e) { showToast('❌ ' + e.message); }
    setUploadLoading(false);
  };

  // Save pin
  const savePin = async (slot, track) => {
    try {
      // Upsert via Supabase
      await fetch(`${window.SB_URL || ''}/rest/v1/user_pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: window.SB_KEY || '',
          Authorization: `Bearer ${window.SB_KEY || ''}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_key:  userKey,
          position:  slot + 1,
          track_id:  track.id,
          title:     track.title,
          artist:    track.artist,
          thumbnail: track.thumbnail,
        }),
      });
      setPickerSlot(null);
      loadProfile();
      showToast(`📌 ${track.title} di-pin!`);
    } catch (e) { showToast('❌ Gagal pin: ' + e.message); }
  };

  // Remove pin
  const removePin = async (slot) => {
    try {
      await fetch(
        `${window.SB_URL || ''}/rest/v1/user_pins?user_key=eq.${encodeURIComponent(userKey)}&position=eq.${slot + 1}`,
        {
          method: 'DELETE',
          headers: { apikey: window.SB_KEY || '', Authorization: `Bearer ${window.SB_KEY || ''}` },
        }
      );
      setPickerSlot(null);
      loadProfile();
      showToast('Pin dihapus');
    } catch (e) { showToast('❌ Gagal hapus pin: ' + e.message); }
  };

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-5">
        <i className="fas fa-user-circle text-p2" /> Profil Saya
      </h1>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 mb-6">
        {/* Avatar clickable */}
        <div className="relative cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-p/40" />
          ) : (
            <Avatar userKey={userKey} name={session?.nama} size={80} />
          )}
          <div className="absolute inset-0 rounded-full bg-black/55 opacity-0
            group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
            {uploadLoading
              ? <i className="fas fa-circle-notch fa-spin text-white" />
              : <>
                  <i className="fas fa-camera text-white text-sm" />
                  <span className="text-white text-[0.6rem] font-bold">Ganti</span>
                </>
            }
          </div>
          <input ref={fileInputRef} type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden" onChange={handleFileChange} />
        </div>
        <div className="text-center">
          <div className="font-syne font-black text-lg">{session?.nama || '–'}</div>
          <div className="text-t2 text-sm">{session?.jabatan} · Gen {session?.generasi}</div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { val: stats.totalPlays,   label: 'Total Putar', color: 'text-g' },
            { val: stats.uniqueTracks, label: 'Lagu Berbeda', color: 'text-p2' },
            { val: histArr.length,     label: 'Sesi Ini', color: 'text-yw' },
          ].map(({ val, label, color }) => (
            <div key={label} className="bg-s1 border border-white/[0.06] rounded-2xl p-3 text-center">
              <div className={`font-syne font-black text-xl ${color}`}>{val}</div>
              <div className="text-t2 text-[0.6rem] uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pin favorit */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <i className="fas fa-thumbtack text-g" /> Pin Favorit
          </h2>
          <span className="text-t3 text-xs">Klik untuk edit</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(slot => {
            const pin = pins[slot];
            return (
              <div key={slot}
                onClick={() => setPickerSlot(slot)}
                className={`aspect-square rounded-xl border overflow-hidden cursor-pointer
                  transition-all group relative
                  ${pin
                    ? 'border-white/[0.1] hover:border-p/40'
                    : 'border-dashed border-white/[0.14] flex items-center justify-center bg-s1 hover:bg-s2 hover:border-p/30'}`}>
                {pin ? (
                  <>
                    <img src={pin.thumbnail || PH} alt={pin.title || ''}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={e => { e.target.src = PH; }} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                      transition-opacity flex flex-col items-center justify-center px-2 text-center">
                      <i className="fas fa-edit text-white text-sm mb-1" />
                      <div className="text-white text-[0.6rem] font-bold truncate w-full px-1">
                        {pin.title}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-t3">
                    <i className="fas fa-plus text-lg" />
                    <span className="text-[0.6rem]">Pin {slot + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button onClick={() => navigate('/wrapped')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-g/30
            bg-g/8 text-g text-xs font-semibold cursor-pointer hover:bg-g/15 transition-all">
          <i className="fas fa-star" /> Rekap Wrapped
        </button>
        <button onClick={() => navigate('/livefeed')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.06]
            bg-s1 text-t2 text-xs font-semibold cursor-pointer hover:bg-s2 hover:text-tx transition-all">
          <i className="fas fa-satellite-dish" /> Live Feed
        </button>
        <button onClick={() => navigate('/vtuber')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-p/20
            bg-p/8 text-p2 text-xs font-semibold cursor-pointer hover:bg-p/15 transition-all">
          <i className="fas fa-star" /> VTuber Archive
        </button>
        <button onClick={() => navigate('/playlist')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.06]
            bg-s1 text-t2 text-xs font-semibold cursor-pointer hover:bg-s2 hover:text-tx transition-all">
          <i className="fas fa-list" /> Playlist
        </button>
      </div>

      {/* Play history */}
      <section className="mb-5">
        <h2 className="flex items-center gap-2 text-sm font-bold mb-2">
          <i className="fas fa-history text-bl2" /> Riwayat Sesi Ini
        </h2>
        {histArr.length === 0 ? (
          <div className="text-center py-8 text-t2 text-xs">Belum ada riwayat</div>
        ) : (
          <div className="bg-s1 border border-white/[0.06] rounded-2xl p-2 space-y-0.5">
            {histArr.slice(0, 20).map((t, i) => (
              <div key={`${t.id}-${i}`}
                onClick={() => playTrack({ ...t, audio: t.audio || t.audioUrl, source: t.source || 'db' })}
                className="flex items-center gap-3 p-2 rounded-xl cursor-pointer
                  border border-transparent hover:bg-s2 hover:border-white/[0.06] transition-all">
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={t.thumbnail || PH} alt={t.title}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src = PH; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{t.title}</div>
                  <div className="text-[0.65rem] text-t2 truncate">{t.artist}</div>
                </div>
                {t.playedAt && <span className="text-[0.6rem] text-t3 flex-shrink-0">{t.playedAt}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Keyboard shortcuts (desktop only) */}
      {isDesktop && (
        <section className="mb-5">
          <h2 className="flex items-center gap-2 text-sm font-bold mb-3">
            <i className="fas fa-keyboard text-p2" /> Keyboard Shortcuts
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {KB_SHORTCUTS.map(({ key, desc }) => (
              <div key={key}
                className="bg-s1 border border-white/[0.06] rounded-xl p-2.5 text-xs flex items-center gap-2">
                <kbd className="bg-s3 border border-white/[0.1] rounded-md px-1.5 py-0.5
                  font-mono text-[0.68rem] flex-shrink-0 text-tx">{key}</kbd>
                <span className="text-t2">{desc}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Logout */}
      <div className="h-px bg-white/[0.06] my-4" />
      <button onClick={doLogout}
        className="w-full py-3 rounded-xl border border-rd/30 bg-transparent text-rd text-sm
          font-semibold cursor-pointer flex items-center justify-center gap-2
          hover:bg-rd/8 transition-all">
        <i className="fas fa-sign-out-alt" /> Keluar
      </button>

      {/* Pin Picker Modal */}
      {pickerSlot !== null && (
        <PinPicker
          slot={pickerSlot}
          existingPinId={pins[pickerSlot]?.track_id}
          onSave={(track) => savePin(pickerSlot, track)}
          onRemove={() => removePin(pickerSlot)}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}
