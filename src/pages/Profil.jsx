// src/pages/Profil.jsx
import { useState, useEffect, useRef } from 'react';
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

export default function Profil() {
  const navigate   = useNavigate();
  const { showToast } = useApp();
  const { history: histArr, playTrack } = usePlayer();
  const session    = getSession();
  const userKey    = getUserKey(session);

  const [stats, setStats]       = useState(null);
  const [pins, setPins]         = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);
  const isDesktop    = window.innerWidth >= 1024;

  // Fetch profile stats & pins
  useEffect(() => {
    (async () => {
      try {
        const [histRows, pinRows, avRows] = await Promise.all([
          sb.get('play_history', `user_key=eq.${encodeURIComponent(userKey)}&select=track_id,played_at`),
          sb.get('user_pins', `user_key=eq.${encodeURIComponent(userKey)}&order=position.asc`),
          sb.get('user_avatars', `user_key=eq.${encodeURIComponent(userKey)}&select=avatar_url`),
        ]);
        setStats({
          totalPlays:  histRows.length,
          uniqueTracks: new Set(histRows.map(r => r.track_id)).size,
        });
        setPins(pinRows || []);
        setAvatarUrl(avRows?.[0]?.avatar_url || null);
      } catch {}
    })();
  }, [userKey]);

  const doLogout = () => {
    localStorage.removeItem('pgsk_v2_session');
    localStorage.removeItem('pgsk_admin_session');
    localStorage.removeItem('pgsk_resume_v1');
    window.location.href = '/login';
  };

  // Avatar upload — mirrors PinAvatar logic
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('❌ File terlalu besar (max 2MB)'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('❌ Format tidak didukung'); return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('user_key', userKey);
      const res = await fetch(`${BACKEND_URL}/api/upload-avatar`, {
        method: 'POST', body: formData,
      });
      const data = await res.json();
      if (!data.url) throw new Error(data.message || 'Upload gagal');
      setAvatarUrl(data.url);
      showToast('✅ Foto profil diperbarui!');
    } catch (e) { showToast('❌ ' + e.message); }
    setUploadLoading(false);
  };

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-5">
        <i className="fas fa-user-circle text-p2" />
        Profil Saya
      </h1>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 mb-6">
        {/* Avatar */}
        <div className="relative cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-p/40" />
          ) : (
            <Avatar userKey={userKey} name={session?.nama} size={80} />
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0
            group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
            {uploadLoading
              ? <i className="fas fa-circle-notch fa-spin text-white" />
              : <>
                  <i className="fas fa-camera text-white text-sm" />
                  <span className="text-white text-[0.6rem] font-bold">Ganti</span>
                </>}
          </div>
          <input ref={fileInputRef} type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden" onChange={handleFileChange} />
        </div>

        <div className="text-center">
          <div className="font-syne font-black text-lg">{session?.nama || '–'}</div>
          <div className="text-t2 text-sm">
            {session?.jabatan} · Gen {session?.generasi}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-s1 border border-white/[0.06] rounded-2xl p-4 text-center">
            <div className="font-syne font-black text-2xl text-g">{stats.totalPlays}</div>
            <div className="text-t2 text-xs uppercase tracking-wider mt-1">Total Putar</div>
          </div>
          <div className="bg-s1 border border-white/[0.06] rounded-2xl p-4 text-center">
            <div className="font-syne font-black text-2xl text-p2">{stats.uniqueTracks}</div>
            <div className="text-t2 text-xs uppercase tracking-wider mt-1">Lagu Berbeda</div>
          </div>
        </div>
      )}

      {/* Pin favorit */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <i className="fas fa-thumbtack text-g" /> Pin Favorit
          </h2>
          <span className="text-t3 text-xs">(max 3 pin)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(slot => {
            const pin = pins[slot];
            return (
              <div key={slot}
                className={`aspect-square rounded-xl border overflow-hidden
                  ${pin ? 'border-white/[0.1] cursor-pointer hover:border-p/40 transition-all' : 'border-dashed border-white/[0.1] flex items-center justify-center'}`}>
                {pin ? (
                  <img src={pin.thumbnail || PH} alt={pin.title}
                    className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-plus text-t3 text-lg" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick links */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => navigate('/wrapped')}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2
            py-3 rounded-xl border border-g/30 bg-g/8 text-g text-xs font-semibold
            cursor-pointer hover:bg-g/15 transition-all">
          <i className="fas fa-star" /> Lihat Rekap
        </button>
        <button onClick={() => navigate('/livefeed')}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2
            py-3 rounded-xl border border-white/[0.06] bg-s1 text-t2 text-xs font-semibold
            cursor-pointer hover:bg-s2 hover:text-tx transition-all">
          <i className="fas fa-satellite-dish" /> Live Feed
        </button>
      </div>

      {/* Play history */}
      <section className="mb-5">
        <h2 className="flex items-center gap-2 text-sm font-bold mb-2">
          <i className="fas fa-history text-bl2" /> Riwayat Saya
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

      {/* Keyboard shortcuts (desktop) */}
      {isDesktop && (
        <section className="mb-5">
          <h2 className="flex items-center gap-2 text-sm font-bold mb-3">
            <i className="fas fa-keyboard text-p2" /> Keyboard Shortcuts
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {KB_SHORTCUTS.map(({ key, desc }) => (
              <div key={key}
                className="bg-s1 border border-white/[0.06] rounded-xl p-2.5 text-xs
                  flex items-center gap-2">
                <kbd className="bg-s3 border border-white/[0.1] rounded-md px-1.5 py-0.5
                  font-mono text-[0.68rem] flex-shrink-0 text-tx">
                  {key}
                </kbd>
                <span className="text-t2">{desc}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Logout */}
      <div className="h-px bg-white/[0.06] my-4" />
      <button onClick={doLogout}
        className="w-full py-3 rounded-xl border border-rd/30 bg-transparent text-rd
          text-sm font-semibold cursor-pointer flex items-center justify-center gap-2
          hover:bg-rd/8 transition-all">
        <i className="fas fa-sign-out-alt" /> Keluar
      </button>
    </div>
  );
}
