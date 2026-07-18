// src/lib/supabase.js
// Supabase REST client — mirrors the original sb object in index.html
// Config is fetched from /api/config (Vercel serverless)
// FIX: sb.get() always returns an array — guards against null/non-array Supabase responses

let SB_URL = '';
let SB_KEY = '';
let _configured = false;

const sb = {
  _h() {
    return {
      'Content-Type': 'application/json',
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: 'return=representation',
    };
  },
  _b() { return `${SB_URL}/rest/v1/`; },

  async req(method, table, query, body) {
    const url = this._b() + table + (query ? '?' + query : '');
    const res = await fetch(url, {
      method,
      headers: this._h(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) throw new Error(data?.message || data?.error || 'HTTP ' + res.status);
    return data;
  },

  // FIX: GET always returns an array — Supabase returns [] for no rows,
  // but can return null or an object on edge cases (e.g. RLS block, malformed query).
  async get(table, query) {
    const data = await this.req('GET', table, query);
    if (Array.isArray(data)) return data;
    if (data === null || data === undefined) return [];
    // Supabase occasionally returns a single object (count query, etc.) — wrap it
    if (typeof data === 'object' && !Array.isArray(data)) {
      // If it looks like an error object, throw
      if (data.message || data.error) throw new Error(data.message || data.error);
      return [data];
    }
    return [];
  },

  post(table, body)        { return this.req('POST',   table, '',    body); },
  patch(table, query, body){ return this.req('PATCH',  table, query, body); },
  del(table, query)        { return this.req('DELETE', table, query); },

  async rpc(fnName, params) {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: this._h(),
      body: JSON.stringify(params),
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) throw new Error(data?.message || 'RPC error');
    return data;
  },
};

export async function loadConfig() {
  if (_configured) return { SB_URL, SB_KEY };
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Config fetch failed: ' + res.status);
  const cfg = await res.json();
  SB_URL = cfg.url;
  SB_KEY = cfg.key;
  _configured = true;
  return { SB_URL, SB_KEY, theresavKey: cfg.theresavKey };
}

export function getConfig() { return { SB_URL, SB_KEY }; }
export { sb };
export default sb;
