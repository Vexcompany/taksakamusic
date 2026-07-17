export function SkeletonCard() {
  return (
    <div className="bg-s1 border border-white/[0.06] rounded-xl p-3 overflow-hidden">
      <div className="skeleton rounded-lg aspect-square mb-2.5 w-full" />
      <div className="skeleton rounded h-2.5 w-4/5 mb-2" />
      <div className="skeleton rounded h-2 w-3/5 mb-2" />
      <div className="skeleton rounded h-2 w-2/5" />
    </div>
  );
}

export function SkeletonTrack() {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent">
      <div className="skeleton rounded-lg w-11 h-11 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="skeleton rounded h-2.5 w-3/4" />
        <div className="skeleton rounded h-2 w-1/2" />
      </div>
      <div className="skeleton rounded h-2 w-8" />
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return <>{Array.from({ length: count }).map((_, i) => <SkeletonTrack key={i} />)}</>;
}
