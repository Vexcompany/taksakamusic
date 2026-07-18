// src/components/layout/Topbar.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import Notifications from '../ui/Notifications';
import { useApp } from '../../context/AppContext';
import { getInitials } from '../../lib/utils';

export default function Topbar({ onSearch }) {
  const { session, userKey, showToast } = useApp();
  const navigate = useNavigate();
  const [query, setQuery]     = useState('');
  const [expanded, setExpanded] = useState(false);
  const [pdOpen, setPdOpen]   = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const ini = getInitials(session?.nama);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) { showToast('Masukkan kata kunci pencarian'); return; }
    navigate('/?q=' + encodeURIComponent(query.trim()));
  };

  const doLogout = () => {
    localStorage.removeItem('pgsk_v2_session');
    localStorage.removeItem('pgsk_admin_session');
    localStorage.removeItem('pgsk_resume_v1');
    window.location.href = '/login';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[200] bg-bg/88 backdrop-blur-2xl
      border-b border-white/[0.06]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2 px-4 max-w-[900px] mx-auto"
        style={{ height: 'clamp(52px,7vw,60px)' }}>

        {/* Brand */}
        <a onClick={() => navigate('/')} href="#"
          className="flex items-center gap-2.5 no-underline text-tx flex-shrink-0 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-g to-p flex items-center 
            justify-center text-sm text-white shadow-[0_0_20px_rgba(29,185,84,.28)]">
            <i className="fab fa-spotify" />
          </div>
          <span className="font-syne font-black text-sm bg-gradient-to-r from-white to-g
            bg-clip-text text-transparent hidden sm:block">
            Pagaska
          </span>
        </a>

        {/* Search */}
        <form onSubmit={handleSearch} className={`flex-1 flex items-center gap-2 
          bg-s1 border border-white/[0.06] rounded-full px-3.5 
          transition-all duration-200 focus-within:border-g focus-within:shadow-[0_0_0_3px_rgba(29,185,84,.08)]
          ${expanded ? 'min-w-0' : 'max-w-[42px] sm:max-w-none overflow-hidden justify-center'}`}
          style={{ height: 'clamp(36px,5vw,42px)' }}
          onClick={() => { if (!expanded) { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50); } }}>
          <i className="fas fa-search text-t2 text-xs flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari lagu di Pagaska Music..."
            onBlur={() => { if (!query) setExpanded(false); }}
            className={`flex-1 bg-transparent border-none outline-none text-tx 
              font-inter text-sm placeholder:text-t3
              ${expanded ? 'w-auto opacity-100' : 'w-0 opacity-0 sm:w-auto sm:opacity-100'}`}
          />
          <button type="submit" disabled={loading}
            className="h-8 px-3 rounded-full border-none bg-gradient-to-r from-g to-g2 
              text-black font-bold text-xs cursor-pointer flex items-center gap-1 
              transition-all hover:scale-105 hover:shadow-[0_4px_14px_rgba(29,185,84,.28)]
              disabled:opacity-60 flex-shrink-0 hidden sm:flex">
            {loading
              ? <i className="fas fa-circle-notch fa-spin" />
              : <><i className="fas fa-search" /><span>Cari</span></>}
          </button>
        </form>

        {/* Right icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Notifications */}
          <Notifications />
          {/* Chat button */}
          <button onClick={() => navigate('/chat')}
            className="w-11 h-11 rounded-xl bg-s1 border border-white/[0.06] text-t2 
              flex items-center justify-center text-sm cursor-pointer
              hover:bg-s2 hover:text-tx transition-all relative">
            <i className="fas fa-comment-dots" />
          </button>

          {/* User pill */}
          <div onClick={() => setPdOpen(!pdOpen)}
            className="flex items-center gap-2 bg-s1 border border-white/[0.06] rounded-full 
              pl-1 pr-3 h-11 cursor-pointer hover:bg-s2 hover:border-white/[0.11] transition-all">
            <Avatar userKey={userKey} name={session?.nama} size={30} />
            <span className="text-xs font-semibold max-w-[72px] truncate hidden sm:block">
              {(session?.nama || '').split(' ')[0]}
            </span>
            <i className="fas fa-caret-down text-t3 text-[10px]" />
          </div>
        </div>
      </div>

      {/* Profile dropdown */}
      {pdOpen && (
        <>
          <div className="fixed inset-0 z-[299]" onClick={() => setPdOpen(false)} />
          <div className="absolute top-full right-3 mt-2 bg-s2 border border-white/[0.11] 
            rounded-2xl py-1.5 min-w-[210px] shadow-[0_14px_40px_rgba(0,0,0,.7)] z-[300]
            animate-[dropIn_.2s_cubic-bezier(.16,1,.3,1)]">
            <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
              <div className="text-sm font-bold">{session?.nama || '–'}</div>
              <div className="text-xs text-t2">{session?.jabatan} · Gen {session?.generasi}</div>
            </div>
            {[
              { icon: 'fa-user', color: 'text-p2', label: 'Profil Saya', to: '/profil' },
              { icon: 'fa-users', color: 'text-pink-400', label: 'Party Mode', to: '/party' },
              { icon: 'fa-compass', color: 'text-bl2', label: 'Explore', to: '/explore' },
              { icon: 'fa-satellite-dish', color: 'text-rd', label: 'Sedang Diputar', to: '/livefeed' },
            ].map(item => (
              <div key={item.to} onClick={() => { navigate(item.to); setPdOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold 
                  hover:bg-s3 cursor-pointer transition-colors rounded-xl mx-1">
                <i className={`fas ${item.icon} ${item.color}`} />
                {item.label}
              </div>
            ))}
            <div className="h-px bg-white/[0.06] my-1" />
            <div onClick={doLogout}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold 
                text-rd hover:bg-rd/8 cursor-pointer rounded-xl mx-1 transition-colors">
              <i className="fas fa-sign-out-alt" />
              Keluar
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}

