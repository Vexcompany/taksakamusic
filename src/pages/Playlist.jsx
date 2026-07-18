// src/pages/Playlist.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import sb from '../lib/supabase';
import { getUserKey, getSession, PH } from '../lib/utils';

function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useApp();
  const session = getSession();

  const submit = async () => {
    if (!name.trim()) { showToast('Nama playlist tidak boleh kosong'); return; }
    setLoading(true);
    try {
      const row = await fetch(`${window.SB_URL || ''}/rest/v1/playlists`, {
        method: 'POST',
        headers: { ...sb._h(), Prefer: 'return=representation' },
        body: JSON.stringify({
          name: name.trim(),
          owner_name: session?.nama || '?',
          owner_generasi: session?.generasi || '?',
          track_count: 0,
        }),
      }).then(r => r.json());
      showToast('✅ Playlist dibuat!');
      onCreate(Array.isArray(row) ? row[0] : row);
      onClose();
    } catch (e) { showToast('Gagal: ' + e.message); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,.75)' }}
      onClick={onClose}>
      <div className="bg-s2 border border-white/[0.11] rounded-2xl p-5 w-full max-w-[360px]
        shadow-[0_20px_60px_rgba(0,0,0,.8)]"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-syne font-black text-base mb-4">Buat Playlist Baru</h3>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Nama playlist kamu..."
          autoFocus
          className="w-full bg-s1 border border-white/[0.06] rounded-xl px-4 py-3
            text-sm outline-none text-tx placeholder:text-t3
            focus:border-g transition-all mb-4" />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-s3 border border-white/[0.06]
              text-sm font-semibold cursor-pointer border-none text-t2
              hover:bg-s4 transition-all">Batal</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-g text-black
              text-sm font-bold cursor-pointer border-none
              hover:bg-g2 transition-all disabled:opacity-60">
            {loading ? <i className="fas fa-circle-notch fa-spin" /> : 'Buat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaylistDetail({ playlist, onClose }) {
  const { playTrack, addToQueue } = usePlayer();
  const { showToast } = useApp();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.get('playlist_tracks',
          `playlist_id=eq.${playlist.id}&order=position.asc,added_at.asc`);
        setTracks(Array.isArray(rows) ? rows : []);
      } catch {}
      setLoading(false);
    })();
  }, [playlist.id]);

  const playAll = async () => {
    if (!tracks.length) return;
    for (const t of tracks) addToQueue({
      id: t.track_id, title: t.title, artist: t.artist,
      thumbnail: t.thumbnail, audio: t.audio_url, audioUrl: t.audio_url,
      duration: t.duration || '0:00', source: 'db',
    });
    await playTrack({
      id: tracks[0].track_id, title: tracks[0].title, artist: tracks[0].artist,
      thumbnail: tracks[0].thumbnail, audio: tracks[0].audio_url,
      audioUrl: tracks[0].audio_url, source: 'db',
    });
  };

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-bg">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-xl bg-s2 text-t2 flex items-center justify-center
            cursor-pointer border-none text-sm hover:bg-s3 hover:text-tx transition-all">
          <i className="fas fa-arrow-left" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{playlist.name}</div>
          <div className="text-xs text-t2">oleh {playlist.owner_name} · {tracks.length} lagu</div>
        </div>
        {tracks.length > 0 && (
          <button onClick={playAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-g text-black
              text-xs font-bold cursor-pointer border-none hover:bg-g2 transition-all">
            <i className="fas fa-play" /> Putar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-t2">
            <i className="fas fa-circle-notch fa-spin" />
          </div>
        )}
        {!loading && tracks.length === 0 && (
          <div className="text-center py-16 text-t2 text-sm">
            <i className="fas fa-music text-3xl mb-2 block opacity-20" />
            Playlist ini masih kosong
          </div>
        )}
        <div className="space-y-0.5">
          {tracks.map((t, i) => (
            <div key={t.id}
              onClick={() => playTrack({ id: t.track_id, title: t.title, artist: t.artist,
                thumbnail: t.thumbnail, audio: t.audio_url, audioUrl: t.audio_url,
                duration: t.duration || '0:00', source: 'db' })}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer
                border border-transparent hover:bg-s2 hover:border-white/[0.06] transition-all">
              <div className="w-6 text-center text-xs text-t3 font-syne font-bold">{i + 1}</div>
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <img src={t.thumbnail || PH} alt={t.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = PH; }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{t.title}</div>
                <div className="text-[0.68rem] text-t2 truncate">{t.artist}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function PlaylistPage() {
  const { showToast } = useApp();
  const session  = getSession();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [openPl, setOpenPl]       = useState(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const rows = await sb.get('playlists', 'order=created_at.desc');
      setPlaylists(Array.isArray(rows) ? rows : []);
    } catch (e) { showToast('Gagal load playlist: ' + e.message); }
    setLoading(false);
  };

  const onCreate = (pl) => {
    setPlaylists(prev => [pl, ...prev]);
  };

  if (openPl) return <PlaylistDetail playlist={openPl} onClose={() => setOpenPl(null)} />;

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-1">
            <i className="fas fa-list-ul text-p2" />
            Playlist
          </h1>
          <p className="text-t2 text-xs">Playlist kamu & semua anggota Pagaska</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-g text-black
            text-xs font-bold cursor-pointer border-none hover:bg-g2 transition-all
            shadow-[0_0_14px_rgba(29,185,84,.3)]">
          <i className="fas fa-plus" /> Buat
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-t2">
          <i className="fas fa-circle-notch fa-spin" />
        </div>
      )}

      {!loading && playlists.length === 0 && (
        <div className="text-center py-20 text-t2">
          <i className="fas fa-music text-4xl mb-3 block opacity-20" />
          <p className="text-sm font-bold">Belum ada playlist</p>
          <p className="text-xs text-t3 mt-1">Jadilah yang pertama buat playlist!</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 px-5 py-2.5 rounded-full bg-g text-black text-xs font-bold
              cursor-pointer border-none hover:bg-g2 transition-all">
            <i className="fas fa-plus" /> Buat Playlist
          </button>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {playlists.map(pl => (
            <div key={pl.id}
              onClick={() => setOpenPl(pl)}
              className="bg-s1 border border-white/[0.06] rounded-xl p-3 cursor-pointer
                hover:border-p/30 hover:bg-s2 transition-all group">
              {/* Pseudo artwork */}
              <div className="aspect-square rounded-lg bg-gradient-to-br from-p/20 to-g/10
                border border-white/[0.06] flex items-center justify-center mb-2.5 overflow-hidden">
                <i className="fas fa-music text-p2 text-2xl opacity-50
                  group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs font-bold truncate">{pl.name}</div>
              <div className="text-[0.65rem] text-t2 mt-0.5 truncate">
                {pl.track_count || 0} lagu · {pl.owner_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={onCreate} />
      )}
    </div>
  );
}
