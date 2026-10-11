import SkeletonCard from "@/components/home/SkeletonCard";

// Shown at once while the home page works out its first results on the server. Mirrors HomePage's frame and
// header, so nothing jumps when the results arrive.
export default function Loading() {
  return (
    <div className="bg-surface-container min-h-dvh flex justify-center">
      <div aria-busy className="w-full max-w-[420px] bg-background min-h-dvh flex flex-col shadow-2xl">
        <header className="bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-4 pt-3 pb-2.5">
          <div className="flex items-center py-1.5">
            <span className="text-[22px] font-extrabold tracking-tight text-primary">
              makan<span className="text-secondary">Apa</span>
            </span>
          </div>
          <div className="mt-2.5 h-12 rounded-xl bg-surface border border-hairline-strong" />
          <div className="mt-2.5 py-1 flex gap-1.5">
            <div className="h-9 w-24 rounded-full bg-surface-container" />
            <div className="h-9 w-28 rounded-full bg-surface-container" />
            <div className="h-9 w-28 rounded-full bg-surface-container" />
          </div>
        </header>
        <main className="flex-1 px-3 pt-3 flex flex-col gap-3">
          <p className="sr-only" role="status">
            Finding meals…
          </p>
          <SkeletonCard />
          <SkeletonCard />
        </main>
      </div>
    </div>
  );
}
