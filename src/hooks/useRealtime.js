// src/hooks/useRealtime.js
// Mirrors initRealtime() from index.html — uses Supabase JS SDK via CDN script

import { useEffect, useRef } from 'react';
import { getUserKey, getSession } from '../lib/utils';

export function useRealtime({ onMessage, onPresence } = {}) {
  const session  = getSession();
  const userKey  = getUserKey(session);
  const clientRef  = useRef(null);
  const msgChRef   = useRef(null);
  const presChRef  = useRef(null);

  useEffect(() => {
    if (!window.SB_URL || !window.SB_KEY) return;
    if (!window.supabase?.createClient) return;

    try {
      const client = window.supabase.createClient(window.SB_URL, window.SB_KEY, {
        realtime: { params: { eventsPerSecond: 10 } },
      });
      clientRef.current = client;

      // Messages channel
      const msgCh = client.channel('messages-rt')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          onMessage?.(payload.new);
        })
        .subscribe();
      msgChRef.current = msgCh;

      // Presence channel
      const presCh = client.channel('presence-rt', { config: { presence: { key: userKey } } })
        .on('presence', { event: 'sync' }, () => {
          const state = presCh.presenceState();
          onPresence?.(state);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            presCh.track({
              user_key: userKey,
              online:   true,
              name:     session?.nama || userKey,
            });
          }
        });
      presChRef.current = presCh;
      window.__presenceChannel = presCh;
    } catch (e) {
      console.warn('[Realtime]', e.message);
    }

    return () => {
      try {
        if (msgChRef.current)  clientRef.current?.removeChannel(msgChRef.current);
        if (presChRef.current) clientRef.current?.removeChannel(presChRef.current);
        window.__presenceChannel = null;
      } catch {}
    };
  }, [window.SB_URL, window.SB_KEY]);
}
