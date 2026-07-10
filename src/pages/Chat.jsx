// src/pages/Chat.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import sb from '../lib/supabase';
import { getUserKey, getSession, getTimeAgo, PH } from '../lib/utils';
import Avatar from '../components/ui/Avatar';

function ChatRoom({ otherKey, otherName, onClose }) {
  const { showToast }  = useApp();
  const { playTrack }  = usePlayer();
  const session        = getSession();
  const userKey        = getUserKey(session);

  const [msgs, setMsgs]     = useState([]);
  const [input, setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const [online, setOnline]   = useState(false);
  const msgsRef = useRef(null);
  const pollRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const q = `or=(and(from_key.eq.${encodeURIComponent(userKey)},to_key.eq.${encodeURIComponent(otherKey)}),and(from_key.eq.${encodeURIComponent(otherKey)},to_key.eq.${encodeURIComponent(userKey)}))&order=created_at.asc&limit=100`;
      const rows = await sb.get('messages', q);
      setMsgs(rows || []);
      // Mark as read
      fetch(`${window.SB_URL || ''}/rest/v1/messages?from_key=eq.${encodeURIComponent(otherKey)}&to_key=eq.${encodeURIComponent(userKey)}&read_at=is.null`, {
        method: 'PATCH',
        headers: { ...sb._h(), Prefer: 'return=minimal' },
        body: JSON.stringify({ read_at: new Date().toISOString() }),
      }).catch(() => {});
      setTimeout(() => {
        msgsRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
      }, 100);
    } catch {}
  }, [userKey, otherKey]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await fetch(`${window.SB_URL || ''}/rest/v1/messages`, {
        method: 'POST',
        headers: { ...sb._h(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          from_key: userKey,
          to_key:   otherKey,
          message:  text,
          created_at: new Date().toISOString(),
        }),
      });
      loadMessages();
    } catch { showToast('Gagal kirim pesan'); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]
        bg-bg/90 backdrop-blur-xl"
        style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-xl bg-s2 border border-white/[0.06] text-t2
            flex items-center justify-center cursor-pointer border-none text-sm
            hover:bg-s3 hover:text-tx transition-all">
          <i className="fas fa-arrow-left" />
        </button>
        <Avatar userKey={otherKey} name={otherName} size={36} />
        <div>
          <div className="text-sm font-bold">{otherName}</div>
          <div className="flex items-center gap-1.5 text-xs text-t2">
            <span className="w-1.5 h-1.5 rounded-full bg-g" />
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{ paddingBottom: 16 }}>
        {msgs.length === 0 && (
          <div className="text-center text-t2 text-sm py-10">
            <i className="fas fa-comments text-2xl mb-2 block opacity-30" />
            Mulai percakapan dengan {otherName}!
          </div>
        )}
        {msgs.map((m, i) => {
          const isMe = m.from_key === userKey;
          // Check if it's a track share message (JSON format)
          let shared = null;
          try {
            const parsed = JSON.parse(m.message);
            if (parsed.type === 'track_share') shared = parsed;
          } catch {}

          return (
            <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {shared ? (
                  <div onClick={() => playTrack({
                    ...shared.track,
                    audio: shared.track.audioUrl || shared.track.audio,
                    audioUrl: shared.track.audioUrl || shared.track.audio,
                    source: 'db',
                  })}
                    className={`flex items-center gap-2 rounded-2xl p-2.5 cursor-pointer
                      border transition-all hover:border-g/30
                      ${isMe
                        ? 'bg-g/15 border-g/20 rounded-tr-sm'
                        : 'bg-s2 border-white/[0.06] rounded-tl-sm'}`}>
                    <img src={shared.track.thumbnail || PH} alt={shared.track.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={e => { e.target.src = PH; }} />
                    <div className="min-w-0">
                      <div className="text-[0.65rem] text-g font-bold mb-0.5">
                        <i className="fas fa-music" /> Berbagi lagu
                      </div>
                      <div className="text-xs font-semibold truncate">{shared.track.title}</div>
                      <div className="text-[0.65rem] text-t2 truncate">{shared.track.artist}</div>
                    </div>
                    <i className="fas fa-play text-g text-sm flex-shrink-0" />
                  </div>
                ) : (
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${isMe
                      ? 'bg-g text-black rounded-tr-sm font-medium'
                      : 'bg-s2 border border-white/[0.06] rounded-tl-sm'}`}>
                    {m.message}
                  </div>
                )}
                <div className={`text-[0.6rem] text-t3 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                  {getTimeAgo(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-bg"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
        <input
          type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ketik pesan..."
          className="flex-1 bg-s2 border border-white/[0.06] rounded-xl px-4 py-2.5
            text-sm outline-none text-tx placeholder:text-t3
            focus:border-g transition-all" />
        <button onClick={send} disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-xl bg-g text-black flex items-center justify-center
            cursor-pointer border-none font-bold text-sm transition-all
            hover:bg-g2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
          {sending
            ? <i className="fas fa-circle-notch fa-spin text-xs" />
            : <i className="fas fa-paper-plane" />}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ChatPage() {
  const { showToast } = useApp();
  const session  = getSession();
  const userKey  = getUserKey(session);

  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [openChat, setOpenChat]   = useState(null); // { key, name }

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      // Get unique message partners
      const sent = await sb.get('messages',
        `from_key=eq.${encodeURIComponent(userKey)}&select=to_key,created_at&order=created_at.desc`);
      const recv = await sb.get('messages',
        `to_key=eq.${encodeURIComponent(userKey)}&select=from_key,created_at,read_at&order=created_at.desc`);

      const map = {};
      sent.forEach(m => {
        const k = m.to_key;
        if (!map[k] || new Date(m.created_at) > new Date(map[k].lastAt)) {
          map[k] = { key: k, lastAt: m.created_at, unread: 0 };
        }
      });
      recv.forEach(m => {
        const k = m.from_key;
        if (!map[k] || new Date(m.created_at) > new Date(map[k].lastAt)) {
          map[k] = { ...map[k], key: k, lastAt: m.created_at };
        }
        if (!m.read_at) map[k] = { ...map[k], unread: (map[k]?.unread || 0) + 1 };
      });

      const list = Object.values(map)
        .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
        .map(c => ({
          ...c,
          name: c.key.split('_').slice(0, -1).join(' ') || c.key,
        }));

      setContacts(list);
    } catch (e) { showToast('Gagal muat chat: ' + e.message); }
    setLoading(false);
  };

  if (openChat) {
    return <ChatRoom otherKey={openChat.key} otherName={openChat.name}
      onClose={() => { setOpenChat(null); loadContacts(); }} />;
  }

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-syne font-black text-xl mb-1">
          <i className="fas fa-comment-dots text-bl2" />
          Chat & Share Lagu
        </h1>
        <p className="text-t2 text-xs">Bagikan lagu ke sesama anggota Pagaska</p>
      </div>

      {/* Taksaka AI bot entry */}
      <div className="bg-gradient-to-r from-g/8 to-p/8 border border-g/25 rounded-2xl
        p-3.5 mb-3 flex items-center gap-3 cursor-pointer hover:border-g/40 transition-all">
        <div className="relative w-11 h-11 flex-shrink-0">
          <div className="absolute top-0 left-0 w-7 h-7 rounded-full z-10
            bg-gradient-to-br from-g to-g2 flex items-center justify-center
            text-[0.5rem] font-black text-white border-2 border-bg">KT</div>
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full
            bg-gradient-to-br from-p to-p2 flex items-center justify-center
            text-[0.5rem] font-black text-white border-2 border-bg">DT</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Grup Taksaka</div>
          <div className="text-xs text-t2">Kak Taksaka & Dokter Taksaka siap membantu...</div>
        </div>
        <div className="text-g text-xs font-bold flex-shrink-0">Online</div>
      </div>

      {/* Divider */}
      {contacts.length > 0 && (
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-t3 text-[0.65rem] font-semibold uppercase tracking-wider px-2">
            Percakapan
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-t2">
          <i className="fas fa-circle-notch fa-spin text-xs" />
          <span className="text-sm">Memuat chat...</span>
        </div>
      )}

      {/* Contact list */}
      {!loading && contacts.length === 0 && (
        <div className="text-center py-12 text-t2">
          <i className="fas fa-comment-slash text-3xl mb-2 block opacity-20" />
          <p className="text-sm">Belum ada percakapan</p>
          <p className="text-xs text-t3 mt-1">Mulai ngobrol dari profil anggota</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-1">
          {contacts.map(c => (
            <div key={c.key}
              onClick={() => setOpenChat(c)}
              className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer
                border border-transparent hover:bg-s2 hover:border-white/[0.06] transition-all">
              <div className="relative flex-shrink-0">
                <Avatar userKey={c.key} name={c.name} size={44} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                  bg-g border-2 border-bg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-xs text-t2 truncate mt-0.5">{getTimeAgo(c.lastAt)}</div>
              </div>
              {c.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-g flex items-center justify-center
                  text-black text-[0.6rem] font-black flex-shrink-0">
                  {c.unread > 9 ? '9+' : c.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
