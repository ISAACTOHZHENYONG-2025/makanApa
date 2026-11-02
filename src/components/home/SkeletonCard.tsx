// Placeholder for a venue card while results load. Shared by HomePage and app/loading.tsx.
export default function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl border border-hairline overflow-hidden motion-safe:animate-pulse">
      <div className="aspect-video bg-surface-container" />
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="h-4 w-2/3 rounded bg-surface-container" />
        <div className="h-3 w-1/2 rounded bg-surface-container" />
        <div className="h-12 rounded-xl bg-surface-container-low" />
      </div>
    </div>
  );
}
