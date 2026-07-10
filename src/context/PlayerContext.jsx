// src/context/PlayerContext.jsx
// Audio engine ported from index.html — all original logic preserved

import { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react';
import { LS, fmt, PH, BACKEND_URL } from '../lib/utils';
import sb from '../lib/supabase';
import { getSession, getUserKey } from '../lib/utils';

const PlayerContext = createContext(null);

const initialState = {
  queue:      LS.q(),
  history:    LS.h(),
  liked:      LS.l(),
  qi:         -1,
  current:    null,
  isPlaying:  false,
  isShuffle:  false,
  isRepeat:   false,
  isMuted:    false,
  volume:     0.7,
  progress:   0,
  duration:   0,
  lrcLines:   [],
  npOpen:     false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT':    return { ...state, current: action.payload };
    case 'SET_PLAYING':    return { ...state, isPlaying: action.payload };
    case 'SET_SHUFFLE':    return { ...state, isShuffle: !state.isShuffle };
    case 'SET_REPEAT':     return { ...state, isRepeat: !state.isRepeat };
    case 'SET_MUTED':      return { ...state, isMuted: !state.isMuted };
    case 'SET_VOLUME':     return { ...state, volume: action.payload };
    case 'SET_PROGRESS':   return { ...state, progress: action.payload };
    case 'SET_DURATION':   return { ...state, duration: action.payload };
    case 'SET_QI':         return { ...state, qi: action.payload };
    case 'SET_NP_OPEN':    return { ...state, npOpen: action.payload };
    case 'SET_LRC':        return { ...state, lrcLines: action.payload };
    case 'SET_QUEUE': {
      LS.sq(action.payload);
      return { ...state, queue: action.payload };
    }
    case 'SET_HISTORY': {
      LS.sh(action.payload);
      return { ...state, history: action.payload };
    }
    case 'SET_LIKED': {
      LS.sl(action.payload);
      return { ...state, liked: action.payload };
    }
    default: return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const audioRef  = useRef(new Audio());
  const progRef   = useRef(null);
  const stateRef  = useRef(state);
  const session   = getSession();
  const userKey   = getUserKey(session);

  // Keep stateRef synced
  useEffect(() => { stateRef.current = state; }, [state]);

  // Init audio element
  useEffect(() => {
    const audio = audioRef.current;
    audio.crossOrigin = 'anonymous';
    audio.volume = state.volume;

    const onPlay   = () => dispatch({ type: 'SET_PLAYING', payload: true });
    const onPause  = () => { if (!audio.ended) dispatch({ type: 'SET_PLAYING', payload: false }); };
    const onEnded  = () => { const s = stateRef.current; s.isRepeat ? audio.play() : nextTrack(); };
    const onTimeUpdate = () => {
      dispatch({ type: 'SET_PROGRESS', payload: audio.currentTime });
      dispatch({ type: 'SET_DURATION', payload: audio.duration || 0 });
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  // ── Avatar cache ──────────────────────────────────────────────
  const _avatarCache = useRef({});
  const getAvatarUrl = useCallback(async (key) => {
    if (key in _avatarCache.current) return _avatarCache.current[key];
    try {
      const rows = await sb.get('user_avatars', `user_key=eq.${encodeURIComponent(key)}&select=avatar_url&limit=1`);
      const url = rows?.[0]?.avatar_url || null;
      _avatarCache.current[key] = url;
      return url;
    } catch { _avatarCache.current[key] = null; return null; }
  }, []);

  // ── Play track ───────────────────────────────────────────────
  const playTrack = useCallback(async (track) => {
    if (!track) return;
    const audio = audioRef.current;
    const src = track.audio || track.audioUrl || track.audio_url;
    if (!src) return;

    // Stop current
    audio.pause();
    audio.src = '';
    await new Promise(r => setTimeout(r, 50));

    // Add to queue if not present
    const s = stateRef.current;
    let newQueue = [...s.queue];
    if (!newQueue.some(x => x.id === track.id)) {
      newQueue.push(track);
      if (newQueue.length > 60) newQueue = newQueue.slice(0, 60);
    }
    const newQi = newQueue.findIndex(x => x.id === track.id);
    dispatch({ type: 'SET_QUEUE', payload: newQueue });
    dispatch({ type: 'SET_QI', payload: newQi });
    dispatch({ type: 'SET_CURRENT', payload: track });

    // Set audio
    audio.src = src;
    audio.volume = s.volume;
    audio.muted  = s.isMuted;

    try { await audio.play(); }
    catch (e) { console.warn('[Player] play error:', e.message); return; }

    // Media Session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:   track.title  || 'Unknown',
        artist:  track.artist || 'Unknown',
        album:   track.album  || 'Pagaska Music',
        artwork: track.thumbnail ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }] : [],
      });
      navigator.mediaSession.setActionHandler('play',          () => audio.play());
      navigator.mediaSession.setActionHandler('pause',         () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack',     () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (e) => { audio.currentTime = e.seekTime; });
    }

    // History
    addToHistory(track);

    // Increment play count
    if (track.source !== 'vtuber') {
      try {
        await fetch(`${window.SB_URL || ''}/rest/v1/rpc/increment_play_count`, {
          method: 'POST',
          headers: sb._h(),
          body: JSON.stringify({ track_id: track.id }),
        }).catch(() => {});
      } catch {}
    }

    // Broadcast now playing to Supabase presence
    try {
      if (window.__presenceChannel) {
        window.__presenceChannel.track({
          user_key: userKey,
          track:  track.title,
          artist: track.artist,
          online: true,
        }).catch(() => {});
      }
    } catch {}
  }, [userKey]);

  // ── Add to history ───────────────────────────────────────────
  const addToHistory = useCallback((track) => {
    const entry = { ...track, playedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) };
    const s = stateRef.current;
    let newHist = s.history.filter(x => x.id !== track.id);
    newHist.unshift(entry);
    if (newHist.length > 30) newHist = newHist.slice(0, 30);
    dispatch({ type: 'SET_HISTORY', payload: newHist });

    // Save to Supabase
    if (userKey && userKey !== 'guest' && track.source !== 'vtuber') {
      fetch(`${window.SB_URL || ''}/rest/v1/play_history`, {
        method: 'POST',
        headers: { ...sb._h(), Prefer: 'return=minimal,resolution=ignore-duplicates' },
        body: JSON.stringify({ user_key: userKey, track_id: String(track.id), played_at: new Date().toISOString(), duration_played: null }),
      }).catch(() => {});
    }
  }, [userKey]);

  // ── Queue controls ───────────────────────────────────────────
  const addToQueue = useCallback((track) => {
    const s = stateRef.current;
    if (s.queue.some(x => x.id === track.id)) return;
    const newQ = [...s.queue, track].slice(0, 60);
    dispatch({ type: 'SET_QUEUE', payload: newQ });
  }, []);

  const removeFromQueue = useCallback((id) => {
    const s = stateRef.current;
    const newQ = s.queue.filter(t => t.id !== id);
    const newQi = s.current ? newQ.findIndex(t => t.id === s.current.id) : -1;
    dispatch({ type: 'SET_QUEUE', payload: newQ });
    dispatch({ type: 'SET_QI', payload: newQi });
  }, []);

  // ── Playback controls ─────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!stateRef.current.current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const nextTrack = useCallback(() => {
    const s = stateRef.current;
    if (!s.queue.length) return;
    const newQi = s.isShuffle
      ? Math.floor(Math.random() * s.queue.length)
      : (s.qi < s.queue.length - 1 ? s.qi + 1 : 0);
    playTrack(s.queue[newQi]);
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    const s = stateRef.current;
    if (!s.queue.length) return;
    const audio = audioRef.current;
    // If > 3s into song, restart instead of going back
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const newQi = s.isShuffle
      ? Math.floor(Math.random() * s.queue.length)
      : (s.qi > 0 ? s.qi - 1 : s.queue.length - 1);
    playTrack(s.queue[newQi]);
  }, [playTrack]);

  const seek = useCallback((pct) => {
    const audio = audioRef.current;
    if (audio.duration) audio.currentTime = pct * audio.duration;
  }, []);

  const setVolume = useCallback((v) => {
    const audio = audioRef.current;
    audio.volume = v;
    dispatch({ type: 'SET_VOLUME', payload: v });
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    audio.muted = !audio.muted;
    dispatch({ type: 'SET_MUTED' });
  }, []);

  // ── Like ──────────────────────────────────────────────────────
  const toggleLike = useCallback(() => {
    const s = stateRef.current;
    if (!s.current) return;
    const idx = s.liked.findIndex(l => l.id === s.current.id);
    let newLiked;
    if (idx > -1) {
      newLiked = s.liked.filter((_, i) => i !== idx);
      sb.del('liked', `user_key=eq.${userKey}&track_id=eq.${encodeURIComponent(s.current.id)}`).catch(() => {});
    } else {
      newLiked = [s.current, ...s.liked];
      fetch(`${window.SB_URL || ''}/rest/v1/liked?on_conflict=user_key,track_id`, {
        method: 'POST',
        headers: { ...sb._h(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_key: userKey, track_id: s.current.id }),
      }).catch(() => {});
    }
    dispatch({ type: 'SET_LIKED', payload: newLiked });
  }, [userKey]);

  const isLiked = useCallback((id) => {
    return stateRef.current.liked.some(l => l.id === id);
  }, []);

  // ── Resume state ─────────────────────────────────────────────
  const saveResume = useCallback(() => {
    const s = stateRef.current;
    const audio = audioRef.current;
    if (!s.current?.audio) return;
    try {
      localStorage.setItem('pgsk_resume_v1', JSON.stringify({
        ...s.current,
        currentTime: audio.currentTime || 0,
        isPlaying:   !audio.paused,
        savedAt:     Date.now(),
      }));
    } catch {}
  }, []);

  const restoreResume = useCallback(async () => {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('pgsk_resume_v1') || 'null'); }
    catch { return false; }
    if (!saved?.audio) return false;

    const track = {
      id:        saved.id,
      title:     saved.title     || '–',
      artist:    saved.artist    || '–',
      album:     saved.album     || '',
      duration:  saved.duration  || '0:00',
      year:      saved.year      || '–',
      thumbnail: saved.thumbnail || PH,
      audio:     saved.audio,
      audioUrl:  saved.audio,
      source:    saved.source    || 'db',
    };

    dispatch({ type: 'SET_CURRENT', payload: track });
    const audio = audioRef.current;
    audio.src = track.audio;
    audio.volume = stateRef.current.volume;

    await new Promise(resolve => {
      const onMeta = () => {
        audio.removeEventListener('loadedmetadata', onMeta);
        const ct = Math.min(saved.currentTime || 0, audio.duration || 0);
        try { audio.currentTime = ct; } catch {}
        resolve(true);
      };
      audio.addEventListener('loadedmetadata', onMeta);
      setTimeout(() => resolve(false), 5000);
    });

    // Restore queue + qi if not set
    if (stateRef.current.queue.length === 0) {
      dispatch({ type: 'SET_QUEUE', payload: [track] });
      dispatch({ type: 'SET_QI',    payload: 0 });
    }

    return true;
  }, []);

  // ── Lyrics ───────────────────────────────────────────────────
  const fetchLyrics = useCallback(async (title, artist) => {
    try {
      const r = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}&limit=1`);
      const data = await r.json();
      if (data?.length && data[0].syncedLyrics) {
        const { parseLRC } = await import('../lib/utils');
        return { type: 'synced', data: parseLRC(data[0].syncedLyrics) };
      }
      if (data?.length && data[0].plainLyrics) return { type: 'plain', data: data[0].plainLyrics };
    } catch {}
    return null;
  }, []);

  // Save on visibility change & beforeunload
  useEffect(() => {
    const onHide = () => saveResume();
    window.addEventListener('beforeunload', onHide);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    const interval = setInterval(saveResume, 3000);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      clearInterval(interval);
    };
  }, [saveResume]);

  const value = {
    ...state,
    audioRef,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleLike,
    isLiked,
    addToQueue,
    removeFromQueue,
    dispatch,
    saveResume,
    restoreResume,
    fetchLyrics,
    getAvatarUrl,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
