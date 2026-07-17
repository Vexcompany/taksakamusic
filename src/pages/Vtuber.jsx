// src/pages/Vtuber.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const PH_VT = 'https://placehold.co/62x62/0d0d24/9b7fe8?text=♪';

function extractYtId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function VtuberCard({ cover }) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const ytId = cover.youtube_id || extractYtId(cover.youtube_url);
  const thumb = cover.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : PH_VT);

  const links = [
    cover.sosmed_youtube   && { url: cover.sosmed_youtube,   cls: 'bg-red-500/10 text-red-400 border border-red-500/20',       icon: 'fab fa-youtube',   label: 'YouTube' },
    cover.sosmed_twitter   && { url: cover.sosmed_twitter,   cls: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',       icon: 'fab fa-twitter',   label: 'Twitter' },
    cover.sosmed_instagram && { url: cover.sosmed_instagram, cls: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',    icon: 'fab fa-instagram', label: 'Instagram' },
    cover.sosmed_tiktok    && { url: cover.sosmed_tiktok,    cls: 'bg-white/[0.06] text-tx border border-white/[0.11]',        icon: 'fab fa-tiktok',   label: 'TikTok' },
    cover.donasi_saweria   && { url: cover.donasi_saweria,   cls: 'bg-yw/10 text-yw border border-yw/20',                      icon: 'fas fa-mug-hot',  label: 'Saweria' },
    cover.donasi_trakteer  && { url: cover.donasi_trakteer,  cls: 'bg-rd/10 text-rd border border-rd/20',                     icon: 'fas fa-heart',    label: 'Trakteer' },
    cover.donasi_sociabuzz && { url: cover.donasi_sociabuzz, cls: 'bg-bl2/10 text-bl2 border border-bl2/20',                  icon: 'fas fa-users',    label: 'Sociabuzz' },
  ].filter(Boolean);

  return (
    <div className="bg-s1 border border-white/[0.06] rounded-xl p-3 sm:p-4 hover:border-p/35 transition-all">
      {/* Top row: thumb + info */}
      <div className="flex gap-3 items-start">
        {/* Thumbnail */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 relative bg-s3 group">
          <img src={thumb} alt={cover.title} loading="lazy"
            className="w-full h-full object-cover"
            onError={e => { e.target.src = PH_VT; }} />
          {ytId && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40
              opacity-0 group-hover:opacity-100 transition-opacity">
              <i className="fab fa-youtube text-red-400 text-lg" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate mb-0.5">{cover.title || '–'}</div>
          <div className="text-xs text-t2 mb-2">
            orig. {cover.original_artist || '–'}{cover.cover_year ? ` · ${cover.cover_year}` : ''}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-p/12 border border-p/20
              rounded-full px-2.5 py-0.5 text-p2 text-[0.65rem] font-bold">
              <i className="fas fa-star" style={{ fontSize: 7 }} />
              {cover.vtuber_name || '–'}
            </span>
            {cover.agency && (
              <span className="text-[0.62rem] text-t2">{cover.agency}</span>
            )}
          </div>

          {/* YouTube button */}
          {ytId && (
            <button
              onClick={() => setEmbedOpen(v => !v)}
              className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-[0.68rem] font-bold cursor-pointer border transition-all
                ${embedOpen
                  ? 'bg-red-500/18 border-red-500/30 text-red-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}>
              <i className="fab fa-youtube" />
              {embedOpen ? 'Tutup Video' : 'Putar Video'}
            </button>
          )}

          {/* Social/Donation links */}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full
                    text-[0.62rem] font-bold no-underline hover:opacity-75 transition-opacity ${l.cls}`}>
                  <i className={l.icon} />
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-3 px-3 py-2 bg-p/5 border-l-2 border-p/30 rounded-r-lg
        text-[0.62rem] text-t2 leading-relaxed">
        {cover.copyright_text || `© ${cover.agency || 'agensi terkait'}. Arsip non-komersial.`}
      </div>

      {/* YouTube embed */}
      {embedOpen && ytId && (
        <div className="mt-3 relative w-full rounded-xl overflow-hidden bg-black"
          style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full border-0"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={cover.title}
          />
        </div>
      )}
    </div>
  );
}

export default function Vtuber() {
  const navigate   = useNavigate();
  const { showToast } = useApp();

  const [covers, setCovers]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [agencyFilter, setAgencyFilter] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${window.SB_URL || ''}/rest/v1/vtuber_covers?order=created_at.desc&limit=200` +
          `&select=id,title,original_artist,vtuber_name,agency,thumbnail,cover_year,` +
          `copyright_text,youtube_url,youtube_id,sosmed_youtube,sosmed_twitter,` +
          `sosmed_instagram,sosmed_tiktok,donasi_saweria,donasi_trakteer,donasi_sociabuzz`,
          {
            headers: {
              apikey: window.SB_KEY || '',
              Authorization: `Bearer ${window.SB_KEY || ''}`,
            },
          }
        );
        const data = await res.json();
        setCovers(Array.isArray(data) ? data : []);
      } catch (e) {
        showToast('Gagal memuat VTuber: ' + e.message);
      }
      setLoading(false);
    })();
  }, []);

  const agencies = useMemo(() =>
    [...new Set(covers.map(c => c.agency).filter(Boolean))].sort(),
    [covers]
  );

  const filtered = useMemo(() => {
    let r = covers;
    if (agencyFilter) r = r.filter(c => c.agency === agencyFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(c =>
        (c.title         || '').toLowerCase().includes(q) ||
        (c.vtuber_name   || '').toLowerCase().includes(q) ||
        (c.agency        || '').toLowerCase().includes(q) ||
        (c.original_artist || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [covers, query, agencyFilter]);

  return (
    <div className="px-4 py-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate('/')}
          className="w-9 h-9 rounded-xl bg-s2 border border-white/[0.06] text-t2
            flex items-center justify-center text-sm cursor-pointer border-none
            hover:bg-s3 hover:text-tx transition-all">
          <i className="fas fa-arrow-left" />
        </button>
        <div>
          <h1 className="flex items-center gap-2 font-syne font-black text-xl leading-none">
            <i className="fas fa-star text-yw" />
            VTuber Cover Archive
          </h1>
          <p className="text-t2 text-xs mt-0.5">Koleksi lagu cover oleh VTuber favorit.</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-s2 border border-white/[0.06] rounded-xl px-3 mb-3
        focus-within:border-p transition-all" style={{ height: 44 }}>
        <i className="fas fa-search text-t2 text-xs" />
        <input
          type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari judul, VTuber, agensi..."
          className="flex-1 bg-transparent border-none outline-none text-tx text-sm
            placeholder:text-t3 font-inter" />
        {query && (
          <button onClick={() => setQuery('')}
            className="text-t2 hover:text-rd text-xs cursor-pointer border-none bg-transparent">
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* Agency chips */}
      {agencies.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setAgencyFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 cursor-pointer
              border transition-all ${!agencyFilter
                ? 'bg-p text-white border-p'
                : 'bg-s2 text-t2 border-white/[0.06] hover:bg-s3 hover:text-tx'}`}>
            Semua
          </button>
          {agencies.map(a => (
            <button key={a}
              onClick={() => setAgencyFilter(a === agencyFilter ? null : a)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 cursor-pointer
                border transition-all ${agencyFilter === a
                  ? 'bg-p text-white border-p'
                  : 'bg-s2 text-t2 border-white/[0.06] hover:bg-s3 hover:text-tx'}`}>
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-t2">
          <i className="fas fa-circle-notch fa-spin" />
          <span className="text-sm">Memuat cover archive...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-t2">
          <i className="fas fa-star text-4xl mb-3 block opacity-20" />
          <p className="text-sm">
            {query || agencyFilter ? 'Tidak ada hasil yang cocok' : 'Belum ada data VTuber cover'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(c => (
            <VtuberCard key={c.id} cover={c} />
          ))}
        </div>
      )}
    </div>
  );
}
