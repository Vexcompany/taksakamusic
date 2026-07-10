// src/components/ui/Avatar.jsx
import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { getInitials } from '../../lib/utils';

export default function Avatar({ userKey, name, size = 36, className = '' }) {
  const { getAvatarUrl } = usePlayer();
  const [url, setUrl] = useState(null);
  const ini = getInitials(name || userKey || '?');

  useEffect(() => {
    if (!userKey) return;
    getAvatarUrl(userKey).then(setUrl);
  }, [userKey, getAvatarUrl]);

  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0 };

  if (url) {
    return (
      <img src={url} alt={ini} style={style}
        className={`object-cover ${className}`}
        onError={() => setUrl(null)} />
    );
  }

  return (
    <div style={style}
      className={`bg-gradient-to-br from-p to-g flex items-center justify-center 
        font-bold text-white font-syne overflow-hidden ${className}`}>
      <span style={{ fontSize: size * 0.3 }}>{ini}</span>
    </div>
  );
}
