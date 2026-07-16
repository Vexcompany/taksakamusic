// src/lib/utils.js

export const PH = 'https://placehold.co/200x200/0d0d24/1DB954?text=♪';

// BACKEND_URL: pakai env variable (set di Vercel), fallback ke hardcoded
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://verolyz-kingdom3.vercel.app';

export const SESS_KEY = 'pgsk_v2_session';

export function fmt(s) {
  if (isNaN(s) || s === null || s === undefined) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getTimeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'baru saja';
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

export function resizeThumb(url, size = 300) {
  if (!url) return url;
  return url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`);
}

export function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function rowToTrack(r, src = 'db') {
  return {
    id:          r.id,
    title:       r.title,
    artist:      r.artist,
    album:       r.album || '',
    duration:    r.duration || '0:00',
    year:        r.year || '–',
    thumbnail:   resizeThumb(r.thumbnail || PH, 300),
    audio:       r.audio_url || null,
    audioUrl:    r.audio_url || null,
    playCount:   r.play_count || 0,
    searchQuery: r.search_query || '',
    source:      src,
  };
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); }
  catch { return null; }
}

export function getUserKey(session) {
  if (!session) return 'guest';
  return `${session.nama}_${session.generasi}`;
}

// LocalStorage helpers for queue/history/liked
export const LS = {
  q()       { return JSON.parse(localStorage.getItem('pm2_q') || '[]'); },
  sq(v)     { localStorage.setItem('pm2_q', JSON.stringify(v)); },
  h()       { return JSON.parse(localStorage.getItem('pm2_h') || '[]'); },
  sh(v)     { localStorage.setItem('pm2_h', JSON.stringify(v)); },
  l()       { return JSON.parse(localStorage.getItem('pm2_l') || '[]'); },
  sl(v)     { localStorage.setItem('pm2_l', JSON.stringify(v)); },
  sugs()    { return JSON.parse(localStorage.getItem('pm2_s') || '[]'); },
  ssug(v)   { localStorage.setItem('pm2_s', JSON.stringify(v)); },
};

export function parseLRC(lrcText) {
  const lines = [];
  const re = /\[(\d+):(\d+\.\d+)\](.*)/g;
  let m;
  while ((m = re.exec(lrcText)) !== null) {
    const text = m[3].trim();
    if (text) lines.push({ time: parseInt(m[1]) * 60 + parseFloat(m[2]), text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
