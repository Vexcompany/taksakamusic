# 🎵 Pagaska Music v2 — React + Tailwind + Vite

Platform musik PASKIBRA Gala Taksaka SMKN 5 Kota Madiun.  
Dimigrasi dari vanilla HTML/JS ke React 19 + Tailwind CSS 3 + Vite 6.

---

## 🚀 Quick Start

```bash
npm install
npm run dev        # development (localhost:5173)
npm run build      # production build
npm run preview    # preview build
```

---

## 📁 Struktur Project

```
pagaska-music/
├── api/                    # Vercel Serverless Functions (dari original)
│   ├── config.js           # /api/config — return SB URL & KEY
│   ├── sb.js               # /api/sb — Supabase proxy
│   ├── sb-proxy.js
│   └── sb-rpc.js
├── public/
│   ├── favicon.ico
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service Worker
├── src/
│   ├── context/
│   │   ├── PlayerContext.jsx   # Audio engine, queue, history, liked
│   │   └── AppContext.jsx      # Session, toast, global state
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx      # App shell
│   │   │   ├── Topbar.jsx      # Header + search
│   │   │   └── BottomNav.jsx   # Bottom navigation
│   │   ├── player/
│   │   │   ├── MiniPlayer.jsx  # Mini player bar
│   │   │   └── NowPlaying.jsx  # Fullscreen now playing
│   │   └── ui/
│   │       ├── Avatar.jsx      # User avatar component
│   │       ├── EqBars.jsx      # EQ animation
│   │       ├── Skeleton.jsx    # Loading skeletons
│   │       ├── Toast.jsx       # Toast notification
│   │       └── TrackItem.jsx   # Reusable track row
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.js  # Keyboard controls
│   │   └── useRealtime.js           # Supabase Realtime
│   ├── lib/
│   │   ├── supabase.js     # Supabase REST client
│   │   └── utils.js        # Helpers (fmt, rowToTrack, LS, dll)
│   ├── pages/
│   │   ├── Home.jsx        # Beranda + quick play + search results
│   │   ├── Chart.jsx       # Top chart dengan filter period
│   │   ├── Wrapped.jsx     # Rekap personal stats
│   │   ├── Explore.jsx     # Browse by artist/album
│   │   ├── LiveFeed.jsx    # Siapa sedang memutar apa
│   │   ├── Chat.jsx        # Chat & share lagu
│   │   ├── Party.jsx       # Party mode
│   │   ├── Playlist.jsx    # Playlist management
│   │   ├── Profil.jsx      # User profile + pin + history
│   │   └── Login.jsx       # Login & register + brute-force protection
│   ├── App.jsx             # Routing + auth guard + config loader
│   ├── main.jsx
│   └── index.css           # Global styles + Tailwind
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── vercel.json             # SPA rewrite + security headers
```

---

## 🌐 Deploy ke Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

Atau push ke GitHub dan connect ke Vercel Dashboard.

**Framework Preset:** Vite  
**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Install Command:** `npm install`

---

## ⚙️ Environment Variables

Set di Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Keterangan |
|----------|-----------|
| `SUPABASE_URL` | URL project Supabase kamu |
| `SUPABASE_SERVICE_KEY` | Service role key Supabase |
| `SUPABASE_ANON_KEY` | Anon key Supabase |
| `THERESAV_KEY` | API key theresav (opsional) |
| `TG_BOT_TOKEN` | Telegram bot token (notif login) |
| `TG_CHAT_ID` | Telegram chat ID tujuan notif |

> **Catatan:** Env variables ini diakses oleh `/api/config.js` dan serverless functions lain.  
> File `.env` untuk dev lokal — buat `.env.local` berdasarkan `/api/config.js` yang sudah ada.

---

## 🎵 Fitur

- ✅ Audio player (play/pause/skip/seek/volume/mute/shuffle/repeat)
- ✅ Apple Music search & streaming via Verolyz backend
- ✅ Quick Play grid dari Supabase
- ✅ Top Chart dengan filter (Semua / Minggu ini / Bulan ini)
- ✅ Rekap personal (statistik, top tracks, top artists, waktu favorit)
- ✅ Explore by artist/album
- ✅ Live Feed — siapa sedang memutar apa
- ✅ Real-time Chat & share lagu
- ✅ Party Mode
- ✅ Playlist management
- ✅ User Profile + avatar upload + pin favorit
- ✅ Login & Register + brute-force protection + device fingerprinting
- ✅ Media Session API (lockscreen controls)
- ✅ Synced & plain lyrics via LRCLib
- ✅ Keyboard shortcuts (Space, ←→, ↑↓, M, S, R, L)
- ✅ Supabase Realtime (presence + chat)
- ✅ PWA (Service Worker + manifest)
- ✅ Dark theme, responsive, safe area support
