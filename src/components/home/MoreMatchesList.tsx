import type { VenueMatch } from "@/app/api/decide/route";
import MaterialIcon from "@/components/ui/MaterialIcon";
import DietBadges, { UnconfirmedBadges } from "./DietBadges";
import { distanceLabel, priceLabel } from "./foodMatch";

type MoreMatchesListProps = {
  // unconfirmed: ticked diet filters nobody has checked for the venue, shown as labels
  items: { match: VenueMatch; unconfirmed: string[] }[];
};

export default function MoreMatchesList({ items }: MoreMatchesListProps) {
  return (
    <ul className="bg-surface rounded-2xl border border-hairline shadow-level-1 divide-y divide-hairline">
      {items.map(({ match, unconfirmed }) => {
        const distance = distanceLabel(match);
        return (
          <li className="flex items-center gap-3 px-4 py-3" key={match.venueId ?? match.venueName}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-on-surface truncate">{match.venueName}</p>
                <DietBadges isHalal={match.isHalal} isVegan={match.isVegan} isVegetarian={match.isVegetarian} />
              </div>
              {unconfirmed.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  <UnconfirmedBadges labels={unconfirmed} />
                </div>
              ) : null}
              <p className="text-xs text-on-surface-variant mt-0.5 tabular-nums">
                <span className="font-bold text-primary-ink">{priceLabel(match)}</span>
                {distance ? ` · ${distance}` : ""}
              </p>
              {match.allergyNotes ? (
                <p className="text-xs text-flame-ink mt-0.5 flex items-start gap-1">
                  <MaterialIcon name="warning" className="text-[13px] shrink-0 mt-px" />
                  <span>{match.allergyNotes}</span>
                </p>
              ) : null}
            </div>
            <a
              className="shrink-0 h-9 px-3 rounded-full border-[1.5px] border-primary text-primary-ink text-xs font-bold flex items-center gap-1 hover:bg-primary-tint active:scale-95 transition-transform"
              href={match.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MaterialIcon name="near_me" className="text-[15px]" />
              <span>Directions</span>
              <MaterialIcon name="open_in_new" className="text-[13px]" />
              <span className="sr-only">{` to ${match.venueName} (opens Google Maps)`}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
