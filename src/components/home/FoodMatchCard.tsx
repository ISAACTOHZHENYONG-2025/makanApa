import MaterialIcon from "@/components/ui/MaterialIcon";
import DietBadges from "./DietBadges";
import type { FoodMatch } from "./foodMatch";
import VenuePhoto from "./VenuePhoto";

type FoodMatchCardProps = {
  match: FoodMatch;
  insightLabel: string;
};

export default function FoodMatchCard({ match, insightLabel }: FoodMatchCardProps) {
  const isTop = match.rank === 1;

  return (
    <article className="bg-surface rounded-2xl shadow-level-1 border border-hairline overflow-hidden flex flex-col">
      <VenuePhoto foods={match.serves} name={match.title} preload={isTop} venueId={match.venueId}>
        {match.distanceShort ? (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-surface/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-level-1 text-xs font-bold text-on-surface tabular-nums">
            <MaterialIcon name="location_on" className="text-[14px] text-primary" />
            <span>{match.distanceShort}</span>
          </div>
        ) : null}
        <div
          className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-white text-[11px] font-extrabold tracking-wide shadow-level-1 ${
            isTop ? "bg-primary-fill" : "bg-on-surface"
          }`}
        >
          #{match.rank} MATCH
        </div>
      </VenuePhoto>

      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-[16px] font-bold text-on-surface leading-tight">{match.title}</h3>
              <DietBadges isHalal={match.isHalal} isVegan={match.isVegan} isVegetarian={match.isVegetarian} />
            </div>
            {match.distanceLabel ? (
              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5 tabular-nums">
                <MaterialIcon name="location_on" className="text-[13px] text-primary shrink-0" />
                <span>{match.distanceLabel}</span>
              </p>
            ) : null}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[18px] font-black leading-none text-primary-ink tabular-nums">{match.price}</div>
            <span
              className={`text-xs font-semibold px-1 py-0.5 rounded inline-block mt-0.5 tabular-nums ${
                match.priceWithinBudget ? "bg-primary-tint text-primary-ink" : "bg-amber-tint text-amber-ink"
              }`}
            >
              {match.priceNote}
            </span>
          </div>
        </div>

        {/* Nothing to say when nobody has filled in what the venue serves */}
        {match.serves ? (
          <div className="bg-surface-container border border-hairline rounded-xl p-2.5 min-w-0">
            <span className="text-[11px] uppercase tracking-wider font-bold text-primary-ink block leading-none">
              Serves
            </span>
            {/* Two lines before cutting off, so a longer list like "chicken chop, fries, nugget…" still shows */}
            <span className="mt-1 text-[13px] font-bold text-on-surface leading-snug line-clamp-2 capitalize">
              {match.serves}
            </span>
          </div>
        ) : null}

        <div className="rounded-xl p-2.5 bg-amber-tint border border-amber/40 text-on-surface flex items-start gap-2">
          <MaterialIcon name="lightbulb" className="text-[18px] text-amber shrink-0 mt-px" />
          <p className="text-xs leading-snug">
            <strong className="text-amber-ink font-bold">{insightLabel}:</strong> {match.insight}
          </p>
        </div>

        {match.allergyNotes ? (
          <div className="rounded-xl p-2.5 bg-flame-tint border border-flame/30 text-flame-ink flex items-start gap-2">
            <MaterialIcon name="warning" className="text-[16px] shrink-0 mt-0.5" />
            <p className="text-xs leading-snug">
              <strong className="font-bold">Allergy note:</strong> {match.allergyNotes}
            </p>
          </div>
        ) : null}

        <a
          className="h-12 px-3 rounded-full bg-primary-fill hover:bg-primary-fill-hover text-white text-[14px] font-bold flex items-center justify-center gap-1.5 shadow-level-1 active:scale-95 transition-transform"
          href={match.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MaterialIcon name="near_me" className="text-[17px]" />
          <span>Directions</span>
          <MaterialIcon name="open_in_new" className="text-[14px]" />
          <span className="sr-only"> (opens Google Maps)</span>
        </a>
      </div>
    </article>
  );
}
