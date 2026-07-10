// src/pages/Party.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import sb from '../lib/supabase';
import { getUserKey, getSession, PH, rowToTrack } from '../lib/utils';
import Avatar from '../components/ui/Avatar';

export default function Party() {
  const { showToast }  = useApp();
  const { playTrack }  = usePlayer();
  const session        = getSession();
  const userKey        = getUserKey(session);

  const [joined, setJoined]   = useState(false);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [partyQueue, setPartyQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [voteCount, setVoteCount]   = useState(0);
  const [loading, setLoading]       = useState(false);
  const channelRef = useRef(null);
  const pollRef    = useRef(null);

  // Poll party state
  const loadPartyState = useCallback(async () => {
    try {
      // Active members (joined in last 5 minutes)
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const rows = await sb.get('party_members',
        `joined_at=gte.${encodeURIComponent(since)}&order=joined_at.desc`).catch(() => []);
      setOnlineMembers(rows || []);

      // Now playing
      const np = await sb.get('party_state', 'limit=1&order=updated_at.desc').catch(() => []);
      if (np?.[0]) setNowPlaying(np[0]);

      // Queue
      const q = await sb.get('party_queue', 'order=added_at.asc&limit=20&played=eq.false').catch(() => []);
      setPartyQueue(q || []);

      // Votes
      if (np?.[0]?.track_id) {
        const v = await sb.get('skip_votes',
          `track_id=eq.${encodeURIComponent(np[0].track_id)}`).catch(() => []);
        setVoteCount(v?.length || 0);
      }
    } catch {}
  }, []);

  const joinParty = async () => {
    setLoading(true);
    try {
      await fetch(`${window.SB_URL || ''}/rest/v1/party_members?on_conflict=user_key`, {
        method: 'POST',
        headers: { ...sb._h(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_key:  userKey,
          name:      session?.nama || userKey,
          joined_at: new Date().toISOString(),
        }),
      });
      setJoined(true);
      showToast('🎉 Bergabung ke Pagaska Party!');
      await loadPartyState();

      // Auto-play nowPlaying if exists
      if (nowPlaying?.audio_url) {
        await playTrack(rowToTrack(nowPlaying, 'db'));
      }
    } catch (e) { showToast('Gagal: ' + e.message); }
    setLoading(false);
  };

  const leaveParty = async () => {
    try {
      await sb.del('party_members', `user_key=eq.${encodeURIComponent(userKey)}`);
    } catch {}
    setJoined(false);
    showToast('Keluar dari party');
  };

  const addToPartyQueue = async () => {
    const { current } = usePlayer();
    if (!current) { showToast('Tidak ada lagu yang sedang diputar'); return; }
    try {
      await fetch(`${window.SB_URL || ''}/rest/v1/party_queue`, {
        method: 'POST',
        headers: { ...sb._h(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          track_id:  current.id,
          title:     current.title,
          artist:    current.artist,
          thumbnail: current.thumbnail,
          audio_url: current.audio || current.audioUrl,
          added_by:  userKey,
          added_at:  new Date().toISOString(),
          played:    false,
        }),
      });
      showToast('✅ Lagu ditambahkan ke antrian party!');
      loadPartyState();
    } catch (e) { showToast('Gagal: ' + e.message); }
  };

  const voteSkip = async () => {
    if (!nowPlaying?.track_id) return;
    try {
      await fetch(`${window.SB_URL || ''}/rest/v1/skip_votes?on_conflict=user_key,track_id`, {
        method: 'POST',
        headers: { ...sb._h(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_key: userKey, track_id: nowPlaying.track_id }),
      });
      showToast('Vote skip dikirim!');
      loadPartyState();
    } catch (e) { showToast('Gagal: ' + e.message); }
  };

  useEffect(() => {
    loadPartyState();
    pollRef.current = setInterval(loadPartyState, 10000);
    return () => {
      clearInterval(pollRef.current);
      if (joined) leaveParty();
    };
  }, []);

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Party header */}
      <div className="bg-gradient-to-br from-p/15 to-g/8 border border-p/20
        rounded-2xl p-5 mb-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-rd animate-pulse" />
          <span className="text-rd text-[0.65rem] font-black uppercase tracking-widest">Party Mode</span>
        </div>
        <h1 className="font-syne font-black text-2xl mb-1">🎉 Pagaska Party</h1>
        <p className="text-t2 text-xs">Dengarkan musik bersama semua anggota secara realtime</p>

        {/* Online members */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="flex -space-x-2">
            {onlineMembers.slice(0, 5).map((m, i) => (
              <div key={m.user_key || i}
                className="w-7 h-7 rounded-full border-2 border-bg overflow-hidden">
                <Avatar userKey={m.user_key} name={m.name} size={28} />
              </div>
            ))}
          </div>
          <span className="text-t2 text-xs font-semibold">
            {onlineMembers.length} anggota online
          </span>
        </div>
      </div>

      {/* Now playing */}
      {nowPlaying && (
        <div className="bg-s1 border border-white/[0.06] rounded-2xl p-4 mb-4">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-t2 mb-3
            flex items-center gap-1.5">
            <i className="fas fa-volume-up text-g" /> Sedang Diputar di Party
          </div>
          <div className="flex items-center gap-3 mb-3">
            <img src={nowPlaying.thumbnail || PH} alt={nowPlaying.title}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              onError={e => { e.target.src = PH; }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{nowPlaying.title || '–'}</div>
              <div className="text-t2 text-xs">{nowPlaying.artist || '–'}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-t2 text-xs">{voteCount} vote skip</span>
            <button onClick={voteSkip}
              className="px-3 py-1.5 rounded-lg border border-rd/30 text-rd text-xs
                font-semibold cursor-pointer bg-transparent hover:bg-rd/8 transition-all">
              <i className="fas fa-forward" /> Skip
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {!joined ? (
          <button onClick={joinParty} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-g text-black text-sm font-bold cursor-pointer border-none
              hover:bg-g2 transition-all disabled:opacity-60 shadow-[0_0_14px_rgba(29,185,84,.3)]">
            {loading ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-sign-in-alt" />}
            Gabung Party
          </button>
        ) : (
          <>
            <button onClick={addToPartyQueue}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                border border-g/30 text-g text-sm font-semibold cursor-pointer bg-transparent
                hover:bg-g/8 transition-all">
              <i className="fas fa-plus" /> Tambah Lagu
            </button>
            <button onClick={leaveParty}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                border border-rd/30 text-rd text-sm font-semibold cursor-pointer bg-transparent
                hover:bg-rd/8 transition-all">
              <i className="fas fa-sign-out-alt" /> Keluar
            </button>
          </>
        )}
      </div>

      {/* Party queue */}
      <div className="bg-s1 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="text-sm font-bold flex items-center gap-2">
            <i className="fas fa-list text-g" />
            Antrian Lagu
            <span className="bg-s3 text-t2 text-[0.65rem] font-bold px-2 py-0.5 rounded-full">
              {partyQueue.length}
            </span>
          </div>
          <button onClick={loadPartyState}
            className="text-t2 text-sm hover:text-tx cursor-pointer border-none bg-transparent">
            <i className="fas fa-sync-alt" />
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {partyQueue.length === 0 ? (
            <div className="text-center py-10 text-t2 text-sm">
              <i className="fas fa-music text-2xl mb-2 block opacity-20" />
              Belum ada lagu di antrian
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {partyQueue.map((t, i) => (
                <div key={t.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl
                    border border-transparent hover:bg-s2 transition-all">
                  <div className="w-5 text-center text-xs text-t3 font-syne font-bold">{i + 1}</div>
                  <img src={t.thumbnail || PH} alt={t.title}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    onError={e => { e.target.src = PH; }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{t.title}</div>
                    <div className="text-[0.65rem] text-t2 truncate">{t.artist}</div>
                  </div>
                  <div className="text-[0.6rem] text-t3">oleh {t.added_by?.split('_').slice(0,-1).join(' ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
