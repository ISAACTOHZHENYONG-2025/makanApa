import type { VenueMatch } from "@/lib/decide/types";
import MaterialIcon from "@/components/ui/MaterialIcon";
import DietBadges, { UnconfirmedBadges } from "./DietBadges";
import { distanceLabel, priceLabel } from "./foodMatch";

type MoreMatchesListProps = {
  // unconfirmed: ticked diet filters nobody has checked for the venue, shown as labels
  items: { match: VenueMatch; unconfirmed: string[] }[];
};

export default function MoreMatchesList({ items }: MoreMatchesListProps) {
  return (
    <ul className="bg-surface-container-lowest rounded-2xl border border-[#E9ECEF] shadow-[0_2px_8px_rgba(30,35,41,0.04)] divide-y divide-[#E9ECEF]">
      {items.map(({ match, unconfirmed }, index) => {
        const distance = distanceLabel(match);
        return (
          <li className="flex items-center gap-3 px-4 py-3" key={`${index}-${match.venueName}`}>
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
              <p className="text-[11px] text-on-surface-variant mt-0.5 tabular-nums">
                <span className="font-bold text-primary">{priceLabel(match)}</span>
                {distance ? ` · ${distance}` : ""}
              </p>
              {match.allergyNotes ? (
                <p className="text-[11px] text-[#D84315] mt-0.5 flex items-start gap-1">
                  <MaterialIcon name="warning" className="text-[13px] shrink-0" />
                  <span>{match.allergyNotes}</span>
                </p>
              ) : null}
            </div>
            <a
              aria-label={`Directions to ${match.venueName}`}
              className="shrink-0 h-9 px-3 rounded-full border-[1.5px] border-primary text-primary text-[12px] font-bold flex items-center gap-1 hover:bg-[#E6F7ED] active:scale-95 transition-transform"
              href={match.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MaterialIcon name="near_me" className="text-[15px]" />
              <span>Directions</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
