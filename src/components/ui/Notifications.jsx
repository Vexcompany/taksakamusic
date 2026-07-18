// src/components/ui/Notifications.jsx
// Port dari notif.js — bell icon + dropdown notifikasi
import { useState, useEffect, useRef, useCallback } from 'react';
import { getSession } from '../../lib/utils';

function timeAgo(ts) {
  try {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60)   return 'Baru saja';
    if (diff < 3600) return Math.floor(diff / 60) + 'm lalu';
    if (diff < 86400) return Math.floor(diff / 3600) + 'j lalu';
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const TYPE_ICON  = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', promo: 'fa-gift' };
const TYPE_COLOR = { info: 'text-bl2', success: 'text-g', warning: 'text-yw', promo: 'text-p2' };

export default function Notifications() {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pgsk_notif_read') || '[]'); } catch { return []; }
  });
  const bellRef = useRef(null);
  const session = getSession();

  const unreadCount = notifs.filter(n => !readIds.includes(n.id)).length;

  const loadNotifs = useCallback(async () => {
    if (!session || !window.SB_URL || !window.SB_KEY) return;
    const uk = `${session.nama}_${session.generasi}`;
    try {
      const res = await fetch(
        `${window.SB_URL}/rest/v1/notifications?or=(target_user.eq.all,target_user.eq.${encodeURIComponent(uk)})&order=created_at.desc&limit=30`,
        { headers: { apikey: window.SB_KEY, Authorization: `Bearer ${window.SB_KEY}` } }
      );
      if (res.status === 404 || !res.ok) return;
      const rows = await res.json();
      if (Array.isArray(rows)) setNotifs(rows);
    } catch {}
  }, [session?.nama, session?.generasi]);

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 30000);
    return () => clearInterval(t);
  }, [loadNotifs]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const markAllRead = () => {
    const ids = notifs.map(n => n.id);
    setReadIds(ids);
    localStorage.setItem('pgsk_notif_read', JSON.stringify(ids));
  };

  const handleOpen = () => {
    setOpen(v => {
      if (!v) { markAllRead(); loadNotifs(); }
      return !v;
    });
  };

  return (
    <div ref={bellRef} className="relative">
      {/* Bell button */}
      <button onClick={handleOpen}
        className="w-11 h-11 rounded-xl bg-s1 border border-white/[0.06] text-t2
          flex items-center justify-center text-sm cursor-pointer
          hover:bg-s2 hover:text-tx transition-all relative">
        <i className="fas fa-bell" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rd border border-bg" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-s1 border border-white/[0.11]
          rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,.7)] z-[500] overflow-hidden
          max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]
            flex-shrink-0">
            <div className="font-syne font-black text-sm">
              <i className="fas fa-bell text-g mr-1.5" />Notifikasi
            </div>
            <button onClick={markAllRead}
              className="text-g text-xs cursor-pointer bg-none border-none font-semibold">
              Tandai dibaca
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 scrollbar-none">
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-t2">
                <i className="fas fa-bell-slash text-2xl mb-2 block opacity-30" />
                <div className="text-xs">Belum ada notifikasi</div>
              </div>
            ) : notifs.map(n => {
              const isRead = readIds.includes(n.id);
              const iconCls = TYPE_ICON[n.type] || 'fa-bell';
              const colCls  = TYPE_COLOR[n.type] || 'text-g';
              return (
                <div key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-white/[0.04] items-start
                    ${isRead ? '' : 'bg-g/[0.03]'}`}>
                  <div className={`w-8 h-8 rounded-full bg-s3 flex items-center justify-center
                    flex-shrink-0 mt-0.5 ${colCls}`}>
                    <i className={`fas ${iconCls} text-xs`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs ${isRead ? 'font-medium' : 'font-bold'} mb-0.5`}>
                      {n.title}
                    </div>
                    <div className="text-[0.65rem] text-t2 leading-relaxed">{n.body}</div>
                    <div className="text-[0.6rem] text-t3 mt-1 opacity-70">{timeAgo(n.created_at)}</div>
                  </div>
                  {!isRead && <span className="w-2 h-2 rounded-full bg-g flex-shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
