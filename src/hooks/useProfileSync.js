// src/hooks/useProfileSync.js
// Port dari sync.js — sinkronisasi liked + queue ke Supabase user_profiles
import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getUserKey, getSession } from '../lib/utils';

const SYNC_INTERVAL = 45000;

export function useProfileSync() {
  const { liked, queue, current } = usePlayer();
  const session = getSession();
  const userKey = getUserKey(session);
  const timerRef = useRef(null);
  const isSyncingRef = useRef(false);

  const push = async () => {
    if (!userKey || userKey === 'guest' || isSyncingRef.current) return;
    if (!window.SB_URL || !window.SB_KEY) return;
    isSyncingRef.current = true;
    try {
      await fetch(`${window.SB_URL}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: window.SB_KEY,
          Authorization: `Bearer ${window.SB_KEY}`,
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_key:    userKey,
          nama:        session?.nama || '',
          generasi:    String(session?.generasi || ''),
          liked_songs: liked,
          queue:       queue.slice(0, 50),
          last_track:  current,
          updated_at:  new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.log('[Sync] Push error:', e.message);
    }
    isSyncingRef.current = false;
  };

  useEffect(() => {
    if (!userKey || userKey === 'guest_undefined') return;

    // Auto push every 45s
    timerRef.current = setInterval(push, SYNC_INTERVAL);

    // Push on page hide
    const onHide = () => push();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onHide);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [userKey]);

  // Push saat liked atau queue berubah (debounced)
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(push, 500);
  }, [liked.length, queue.length]);

  return { push };
}
