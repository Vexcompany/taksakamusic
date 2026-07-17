export default function EqBars({ color = 'var(--tw-colors-g, #1DB954)', scale = 1 }) {
  const heights = [10, 20, 7, 17, 13];
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 22 * scale }}>
      {heights.map((h, i) => (
        <span key={i} className="eq-bar rounded-sm"
          style={{
            width: 4 * scale,
            height: h * scale,
            background: color,
            display: 'block',
          }} />
      ))}
    </div>
  );
}
