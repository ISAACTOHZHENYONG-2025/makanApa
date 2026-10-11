import MaterialIcon from "@/components/ui/MaterialIcon";
import type { FilterDraft } from "@/lib/filters";

type HomeHeaderProps = {
  filters: FilterDraft;
  onOpenFilters: () => void;
  onOpenSearch: () => void;
};

const chipClass =
  "shrink-0 flex items-center gap-1 h-9 px-3 rounded-full bg-primary-tint border border-primary/40 text-primary-ink text-[12px] font-bold";

export default function HomeHeader({ filters, onOpenFilters, onOpenSearch }: HomeHeaderProps) {
  const craving = filters.craving.trim();

  return (
    <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-4 pt-3 pb-2.5">
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center py-0.5">
          <h1 className="text-[22px] font-extrabold tracking-tight text-primary">
            makan<span className="text-secondary">Apa</span>
          </h1>
        </div>
      </div>

      <button
        aria-label={craving ? `Search, ${craving}` : undefined}
        className="mt-2.5 w-full h-12 flex items-center gap-2 px-3 rounded-xl bg-surface border border-hairline-strong text-left text-sm"
        onClick={onOpenSearch}
        type="button"
      >
        <MaterialIcon name="search" className="text-[20px] text-on-surface-variant" />
        <span className={`flex-1 truncate ${craving ? "text-on-surface font-semibold" : "text-muted"}`}>
          {craving || "What are you craving?"}
        </span>
      </button>

      <div className="mt-2.5 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1">
        <button
          className="shrink-0 flex items-center gap-1 h-9 px-3 rounded-full bg-on-surface text-white text-[12px] font-bold shadow-sm"
          onClick={onOpenFilters}
          type="button"
        >
          <MaterialIcon name="tune" className="text-[15px]" />
          <span>Filters</span>
        </button>
        <button className={`${chipClass} tabular-nums`} onClick={onOpenFilters} type="button">
          <MaterialIcon name="payments" className="text-[15px] text-primary" />
          <span>Max RM{filters.budget}</span>
        </button>
        <button className={`${chipClass} tabular-nums`} onClick={onOpenFilters} type="button">
          <MaterialIcon name="near_me" className="text-[15px] text-primary" />
          <span>{filters.maxDistanceKm === null ? "Any distance" : `Within ${filters.maxDistanceKm} km`}</span>
        </button>
        {filters.tags.map((tag) => (
          <button className={chipClass} key={tag} onClick={onOpenFilters} type="button">
            <MaterialIcon name="verified" className="text-[15px] text-primary" />
            <span>{tag}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
