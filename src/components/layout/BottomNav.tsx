import Link from "next/link";
import { groupEnabled } from "@/lib/featureFlags";
import MaterialIcon from "@/components/ui/MaterialIcon";

type Tab = "explore" | "group";

type BottomNavProps = {
  active: Tab;
  actionLabel?: string;
  actionBadge?: string;
  pulse?: boolean;
  disabled?: boolean;
  onAction?: () => void;
};

// Group mode is hidden for the MVP; NEXT_PUBLIC_ENABLE_GROUP=true brings back the tab, the
// /group page and the group API routes together. The nav bar only shows when more than one tab
// is enabled.
const TABS: { id: Tab; href: string; icon: string; label: string; enabled: boolean }[] = [
  { id: "explore", href: "/", icon: "explore", label: "Explore", enabled: true },
  { id: "group", href: "/group", icon: "groups", label: "Group", enabled: groupEnabled },
];

export default function BottomNav({
  active,
  actionLabel,
  actionBadge,
  pulse = false,
  disabled = false,
  onAction,
}: BottomNavProps) {
  const tabs = TABS.filter((tab) => tab.enabled);

  return (
    <div className="fixed bottom-0 inset-x-0 max-w-[420px] mx-auto z-40 pointer-events-none flex flex-col">
      {actionLabel ? (
        <button
          className={`pointer-events-auto w-[calc(100%-2rem)] h-[52px] mx-auto mb-4 px-4 rounded-full bg-primary-fill hover:bg-primary-fill-hover active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 text-on-primary font-bold text-sm flex items-center justify-between shadow-level-3 transition-all ${
            pulse && !disabled ? "animate-pulse" : ""
          }`}
          disabled={disabled}
          onClick={onAction}
          type="button"
        >
          <span className="flex items-center gap-1.5">
            <MaterialIcon name="bolt" className="text-[20px]" />
            <span>{actionLabel}</span>
          </span>
          {actionBadge ? (
            <span className="bg-black/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums">
              {actionBadge}
            </span>
          ) : null}
        </button>
      ) : null}
      {tabs.length > 1 ? (
        <nav
          className="pointer-events-auto grid items-center bg-surface border-t border-hairline shadow-level-3 px-3 pt-2 pb-4"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => (
            <Link
              className={`flex flex-col items-center gap-0.5 ${
                active === tab.id ? "text-primary-ink" : "text-on-surface-variant hover:text-on-surface"
              }`}
              href={tab.href}
              key={tab.id}
            >
              <MaterialIcon name={tab.icon} className="text-[22px]" />
              <span className={`text-[11px] tracking-tight ${active === tab.id ? "font-bold" : "font-medium"}`}>
                {tab.label}
              </span>
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
