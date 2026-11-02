type DietBadgesProps = {
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
};

const badgeClass =
  "px-1.5 py-0.5 rounded-[6px] bg-primary-tint text-primary-ink text-[11px] font-bold uppercase tracking-wide leading-none";

const unconfirmedClass =
  "px-1.5 py-0.5 rounded-[6px] bg-amber-tint text-amber-ink text-[11px] font-bold uppercase tracking-wide leading-none";

// "Halal unconfirmed": a ticked diet filter nobody has checked for this venue
export function UnconfirmedBadges({ labels }: { labels: string[] }) {
  return (
    <>
      {labels.map((label) => (
        <span className={unconfirmedClass} key={label}>
          {label}
        </span>
      ))}
    </>
  );
}

export default function DietBadges({ isHalal, isVegetarian, isVegan }: DietBadgesProps) {
  const labels = [isHalal && "Halal", isVegan ? "Vegan" : isVegetarian && "Vegetarian"].filter(Boolean);
  return (
    <>
      {labels.map((label) => (
        <span className={badgeClass} key={String(label)}>
          {label}
        </span>
      ))}
    </>
  );
}
