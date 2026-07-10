// src/components/layout/BottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/',         icon: 'fa-home',     label: 'Beranda' },
  { path: '/chart',    icon: 'fa-fire',     label: 'Chart' },
  { path: '/playlist', icon: 'fa-list-ul',  label: 'Playlist' },
  { path: '/party',    icon: 'fa-users',    label: 'Party',  badge: 'LIVE' },
  { path: '/profil',   icon: 'fa-user',     label: 'Profil' },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] px-3 sm:px-5"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 8px)' }}>
      <div className="max-w-[500px] mx-auto bg-bg2/92 backdrop-blur-2xl 
        border border-white/[0.11] rounded-[20px] flex items-center px-2 py-1.5
        shadow-[0_8px_32px_rgba(0,0,0,.5)]">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          return (
            <button key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-1 rounded-[14px] 
                border-none cursor-pointer font-semibold uppercase tracking-wide
                text-[0.52rem] transition-all duration-200
                ${active ? 'text-g bg-g/8' : 'text-t2 bg-transparent hover:text-tx'}`}>
              <div className="relative flex items-center justify-center">
                <i className={`fas ${item.icon} text-[1.05rem] transition-transform ${active ? 'scale-115' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rd text-white 
                    text-[0.45rem] font-black px-1 py-px rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
