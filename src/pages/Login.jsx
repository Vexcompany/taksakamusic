// src/pages/Login.jsx
import { useState, useEffect, useRef } from 'react';
import { SESS_KEY, BACKEND_URL } from '../lib/utils';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000; // 5 menit

// ── Device fingerprint (mirrors login.html) ───────────────────────
function getFingerprint() {
  const nav = window.navigator;
  const parts = [
    nav.userAgent,
    nav.language,
    nav.hardwareConcurrency,
    nav.maxTouchPoints,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset(),
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ── Brute-force helpers ───────────────────────────────────────────
function getAttempts() {
  try { return JSON.parse(localStorage.getItem('pgsk_bf') || '{"count":0,"at":0}'); }
  catch { return { count: 0, at: 0 }; }
}
function setAttempts(data) { localStorage.setItem('pgsk_bf', JSON.stringify(data)); }
function clearAttempts()   { localStorage.removeItem('pgsk_bf'); }

const JABATAN_LIST = [
  'Komandan', 'Wakil Komandan', 'Sekretaris', 'Bendahara',
  'Kadiv Pelatihan', 'Kadiv Humas', 'Kadiv Perlengkapan',
  'Anggota Aktif', 'Alumni', 'Pembina',
];

export default function Login() {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [nama, setNama]       = useState('');
  const [jabatan, setJabatan] = useState('');
  const [gen, setGen]         = useState('');
  const [pw, setPw]           = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [locked, setLocked]   = useState(false);
  const [lockLeft, setLockLeft] = useState(0);
  const timerRef = useRef(null);

  // Check lockout on mount
  useEffect(() => {
    checkLockout();
    return () => clearInterval(timerRef.current);
  }, []);

  const checkLockout = () => {
    const bf = getAttempts();
    if (bf.count >= MAX_ATTEMPTS) {
      const elapsed = Date.now() - bf.at;
      if (elapsed < LOCKOUT_MS) {
        setLocked(true);
        startLockTimer(LOCKOUT_MS - elapsed);
      } else {
        clearAttempts();
        setLocked(false);
      }
    }
  };

  const startLockTimer = (remaining) => {
    setLockLeft(Math.ceil(remaining / 1000));
    timerRef.current = setInterval(() => {
      setLockLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearAttempts();
          setLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (locked) return;
    if (!nama.trim()) { setError('Masukkan nama kamu'); return; }

    setLoading(true);
    setError('');

    try {
      // Fetch config first to get SB URL/KEY
      const cfgRes = await fetch('/api/config');
      if (!cfgRes.ok) throw new Error('Config error');
      const cfg = await cfgRes.json();
      window.SB_URL = cfg.url;
      window.SB_KEY = cfg.key;

      // Fetch user from Supabase
      const res = await fetch(
        `${cfg.url}/rest/v1/members?nama=ilike.${encodeURIComponent(nama.trim())}&limit=1`,
        { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
      );
      if (!res.ok) throw new Error('Login gagal: ' + res.status);
      const rows = await res.json();

      if (!rows?.length) {
        // Bad attempt
        const bf = getAttempts();
        const newCount = bf.count + 1;
        setAttempts({ count: newCount, at: Date.now() });
        if (newCount >= MAX_ATTEMPTS) {
          setLocked(true);
          startLockTimer(LOCKOUT_MS);
          setError(`Terlalu banyak percobaan. Tunggu 5 menit.`);
        } else {
          setError(`Nama tidak ditemukan. (${newCount}/${MAX_ATTEMPTS})`);
        }
        setLoading(false);
        return;
      }

      // Success — build session
      const user = rows[0];
      clearAttempts();

      const fingerprint = getFingerprint();
      const session = {
        nama:       user.nama,
        jabatan:    user.jabatan     || jabatan || '–',
        generasi:   user.generasi    || gen || '?',
        member_id:  user.id,
        is_admin:   user.is_admin    || false,
        fingerprint,
        loginAt:    Date.now(),
      };
      localStorage.setItem(SESS_KEY, JSON.stringify(session));

      // Send Telegram notification (fire & forget)
      fetch(`${BACKEND_URL}/api/notify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama:        user.nama,
          jabatan:     user.jabatan || '–',
          generasi:    user.generasi || '?',
          fingerprint,
          ua:          navigator.userAgent.slice(0, 120),
        }),
      }).catch(() => {});

      window.location.href = '/';
    } catch (e) {
      setError(e.message || 'Login gagal');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!nama.trim())    { setError('Masukkan nama'); return; }
    if (!jabatan.trim()) { setError('Pilih jabatan'); return; }
    if (!gen)            { setError('Pilih generasi'); return; }

    setLoading(true);
    setError('');

    try {
      const cfgRes = await fetch('/api/config');
      if (!cfgRes.ok) throw new Error('Config error');
      const cfg = await cfgRes.json();
      window.SB_URL = cfg.url;
      window.SB_KEY = cfg.key;

      const fp = getFingerprint();

      // Check if name already exists
      const check = await fetch(
        `${cfg.url}/rest/v1/members?nama=ilike.${encodeURIComponent(nama.trim())}&limit=1`,
        { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
      ).then(r => r.json());
      if (check?.length) { setError('Nama sudah terdaftar, coba login'); setLoading(false); return; }

      // Check fingerprint
      const fpCheck = await fetch(
        `${cfg.url}/rest/v1/members?fingerprint=eq.${encodeURIComponent(fp)}&limit=1`,
        { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
      ).then(r => r.json());
      if (fpCheck?.length) {
        setError('Perangkat ini sudah pernah digunakan untuk mendaftar dengan akun lain.');
        setLoading(false);
        return;
      }

      // Register
      const res = await fetch(`${cfg.url}/rest/v1/members`, {
        method: 'POST',
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          nama:        nama.trim(),
          jabatan:     jabatan.trim(),
          generasi:    gen,
          fingerprint: fp,
          is_admin:    false,
          created_at:  new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error('Daftar gagal: ' + txt.slice(0, 100));
      }
      const newUser = await res.json();
      const user = Array.isArray(newUser) ? newUser[0] : newUser;

      const session = {
        nama:      user.nama,
        jabatan:   user.jabatan,
        generasi:  user.generasi,
        member_id: user.id,
        is_admin:  false,
        fingerprint: fp,
        loginAt:   Date.now(),
      };
      localStorage.setItem(SESS_KEY, JSON.stringify(session));

      // Notify
      fetch(`${BACKEND_URL}/api/notify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: user.nama, jabatan: user.jabatan, generasi: user.generasi,
          fingerprint: fp, ua: navigator.userAgent.slice(0, 120), type: 'register',
        }),
      }).catch(() => {});

      window.location.href = '/';
    } catch (e) {
      setError(e.message || 'Pendaftaran gagal');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 relative overflow-hidden bg-bg">
      {/* Ambient orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-[120px] pointer-events-none orb-anim"
        style={{ background: 'rgba(29,185,84,.4)' }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-[100px] pointer-events-none orb-anim-r"
        style={{ background: 'rgba(124,92,191,.4)' }} />

      <div className="relative z-10 w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-g to-p mx-auto mb-4
            flex items-center justify-center shadow-[0_0_40px_rgba(29,185,84,.35)]">
            <i className="fab fa-spotify text-3xl text-white" />
          </div>
          <h1 className="font-syne font-black text-2xl bg-gradient-to-r from-white to-g
            bg-clip-text text-transparent">Pagaska Music</h1>
          <p className="text-t2 text-sm mt-1">Platform musik PAGASKA — SMKN 5 Madiun</p>
        </div>

        {/* Card */}
        <div className="bg-s1/80 backdrop-blur-xl border border-white/[0.09] rounded-2xl p-6
          shadow-[0_20px_60px_rgba(0,0,0,.6)]">

          {/* Tabs */}
          <div className="flex bg-s2 rounded-xl p-1 mb-5">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                  cursor-pointer border-none transition-all
                  ${mode === m ? 'bg-g text-black shadow' : 'bg-transparent text-t2 hover:text-tx'}`}>
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {/* Lockout banner */}
          {locked && (
            <div className="bg-rd/10 border border-rd/25 rounded-xl px-4 py-3 mb-4 text-center">
              <i className="fas fa-lock text-rd mb-1 block" />
              <div className="text-rd text-xs font-bold">Akun dikunci sementara</div>
              <div className="text-t2 text-xs mt-0.5">
                Tunggu {Math.floor(lockLeft / 60)}:{String(lockLeft % 60).padStart(2, '0')} menit
              </div>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            {/* Nama */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-t2 mb-1.5">Nama Lengkap</label>
              <input
                type="text" value={nama}
                onChange={e => setNama(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                disabled={locked}
                className="w-full bg-s2 border border-white/[0.06] rounded-xl px-4 py-3
                  text-sm outline-none text-tx placeholder:text-t3
                  focus:border-g transition-all disabled:opacity-50" />
            </div>

            {/* Jabatan (register only) */}
            {mode === 'register' && (
              <div className="mb-3">
                <label className="block text-xs font-bold text-t2 mb-1.5">Jabatan</label>
                <select value={jabatan} onChange={e => setJabatan(e.target.value)}
                  className="w-full bg-s2 border border-white/[0.06] rounded-xl px-4 py-3
                    text-sm outline-none text-tx focus:border-g transition-all
                    appearance-none cursor-pointer">
                  <option value="">Pilih jabatan...</option>
                  {JABATAN_LIST.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Generasi (register only) */}
            {mode === 'register' && (
              <div className="mb-3">
                <label className="block text-xs font-bold text-t2 mb-1.5">Generasi</label>
                <div className="grid grid-cols-4 gap-2">
                  {['1', '2', '3', '4'].map(g => (
                    <button key={g} type="button"
                      onClick={() => setGen(g)}
                      className={`py-2.5 rounded-xl text-sm font-bold cursor-pointer border transition-all
                        ${gen === g
                          ? 'bg-p text-white border-p shadow-[0_0_12px_rgba(124,92,191,.3)]'
                          : 'bg-s2 text-t2 border-white/[0.06] hover:bg-s3 hover:text-tx'}`}>
                      Gen {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-rd/10 border border-rd/25 rounded-xl px-3 py-2.5 mb-3
                text-rd text-xs flex items-center gap-2">
                <i className="fas fa-exclamation-triangle flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit"
              disabled={loading || locked}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-g to-g2 text-black
                font-bold text-sm cursor-pointer border-none mt-1
                hover:shadow-[0_0_20px_rgba(29,185,84,.4)] hover:scale-[1.01]
                transition-all active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100">
              {loading
                ? <><i className="fas fa-circle-notch fa-spin mr-2" />Memproses...</>
                : mode === 'login' ? '🎵 Masuk ke Pagaska Music' : '✨ Buat Akun'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 text-t3 text-xs">
          Pagaska Music · PASKIBRA Gala Taksaka SMKN 5 Madiun
        </div>
      </div>
    </div>
  );
}
