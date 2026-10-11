import MaterialIcon from "@/components/ui/MaterialIcon";
import { DIET_TAGS, type FilterDraft } from "@/lib/filters";

type HomeHeaderProps = {
  filters: FilterDraft;
  // Applies new filters straight away, e.g. after a remove button
  onChange: (next: FilterDraft) => void;
  onOpenFilters: () => void;
  onOpenSearch: () => void;
};

const chipClass =
  "shrink-0 flex items-center gap-1 h-9 px-3 rounded-full bg-primary-tint border border-primary/40 text-primary-ink text-[12px] font-bold";

// "Non-Halal" -> "Non-halal": the label the filter sheet shows
const tagLabel = (tag: string) => DIET_TAGS.find((t) => t.id === tag)?.label ?? tag;

export default function HomeHeader({ filters, onChange, onOpenFilters, onOpenSearch }: HomeHeaderProps) {
  const craving = filters.craving.trim();

  return (
    <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-4 pt-3 pb-2">
      {/* Logo and search share a row, so the sticky header leaves more of a phone screen for results */}
      <div className="flex items-center gap-3">
        <h1 className="shrink-0 text-[20px] font-extrabold tracking-tight text-primary">
          makan<span className="text-secondary">Apa</span>
        </h1>
        <div className="relative min-w-0 flex-1">
          <button
            aria-label={craving ? `Search, ${craving}` : undefined}
            className={`w-full h-12 flex items-center gap-2 pl-3 rounded-xl bg-surface border border-hairline-strong text-left text-sm ${
              craving ? "pr-11" : "pr-3"
            }`}
            onClick={onOpenSearch}
            type="button"
          >
            <MaterialIcon name="search" className="text-[20px] text-on-surface-variant" />
            <span className={`flex-1 truncate ${craving ? "text-on-surface font-semibold" : "text-muted"}`}>
              {craving || "What are you craving?"}
            </span>
          </button>
          {craving ? (
            <button
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              onClick={() => onChange({ ...filters, craving: "" })}
              type="button"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1">
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
        {filters.tags.map((tag) => {
          const label = tagLabel(tag);
          return (
            // Two buttons side by side: the label opens the sheet, the cross removes the filter
            <div className={`${chipClass} pr-1`} key={tag}>
              <button className="flex items-center gap-1 h-full" onClick={onOpenFilters} type="button">
                <MaterialIcon name="verified" className="text-[15px] text-primary" />
                <span>{label}</span>
              </button>
              <button
                aria-label={`Remove ${label} filter`}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary/15"
                onClick={() => onChange({ ...filters, tags: filters.tags.filter((t) => t !== tag) })}
                type="button"
              >
                <MaterialIcon name="close" className="text-[16px]" />
              </button>
            </div>
          );
        })}
      </div>
    </header>
  );
}
