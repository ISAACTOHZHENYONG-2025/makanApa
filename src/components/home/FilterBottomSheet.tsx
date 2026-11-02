"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import {
  BUDGET_RANGE,
  DEFAULT_FILTERS,
  DIET_TOGGLES,
  DISTANCE_OPTIONS,
  type FilterDraft,
} from "@/lib/filters";

type FilterBottomSheetProps = {
  open: boolean;
  draft: FilterDraft;
  onChange: (next: FilterDraft) => void;
  onClose: () => void;
  onApply: () => void;
  // Put the cursor in the craving box when the sheet opens
  focusCraving?: boolean;
};

type HalalChoice = "halal" | "non-halal" | "any";

// Each choice writes the same tag ids the chips used to.
const HALAL_CHOICES: { value: HalalChoice; label: string; tag: string | null }[] = [
  { value: "halal", label: "Halal only", tag: "Halal" },
  { value: "non-halal", label: "Non-halal only", tag: "Non-Halal" },
  { value: "any", label: "Any", tag: null },
];

function halalChoice(tags: string[]): HalalChoice {
  const halal = tags.includes("Halal");
  const nonHalal = tags.includes("Non-Halal");
  if (halal && !nonHalal) return "halal";
  if (nonHalal && !halal) return "non-halal";
  return "any";
}

function budgetTier(budget: number) {
  return budget <= 10 ? "Bajet" : budget <= 18 ? "Standard" : "Feast";
}

const inputClass =
  "w-full h-12 pl-11 pr-11 rounded-xl bg-surface border border-hairline-strong text-sm text-on-surface placeholder:text-muted outline-none transition-shadow focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,177,79,0.15)] [&::-webkit-search-cancel-button]:hidden";

export default function FilterBottomSheet({
  open,
  draft,
  onChange,
  onClose,
  onApply,
  focusCraving,
}: FilterBottomSheetProps) {
  const titleId = useId();
  const halalLabelId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cravingRef = useRef<HTMLInputElement>(null);
  // A drag that starts inside the sheet and ends on the backdrop must not close it.
  const pressedBackdrop = useRef(false);

  // showModal() makes the page behind inert, traps Tab and returns focus to the opener on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      if (focusCraving) cravingRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, focusCraving]);

  const renderTag = ({ id, label }: { id: string; label: string }) => {
    const active = draft.tags.includes(id);
    return (
      <button
        aria-pressed={active}
        className={`flex items-center gap-1 px-3 h-9 rounded-full text-xs transition-all active:scale-95 ${
          active
            ? "font-bold bg-primary-tint text-primary-ink border-[1.5px] border-primary"
            : "font-semibold bg-surface text-on-surface border border-hairline hover:bg-surface-container"
        }`}
        key={id}
        onClick={() =>
          onChange({
            ...draft,
            tags: active ? draft.tags.filter((item) => item !== id) : [...draft.tags, id],
          })
        }
        type="button"
      >
        {active ? <MaterialIcon name="check" className="text-[15px]" /> : null}
        {label}
      </button>
    );
  };

  const chooseHalal = (choice: HalalChoice) => {
    const tag = HALAL_CHOICES.find((option) => option.value === choice)?.tag;
    const rest = draft.tags.filter((item) => item !== "Halal" && item !== "Non-Halal");
    onChange({ ...draft, tags: tag ? [tag, ...rest] : rest });
  };

  const onHalalKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + HALAL_CHOICES.length) % HALAL_CHOICES.length;
    chooseHalal(HALAL_CHOICES[next].value);
    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };

  const currentHalal = halalChoice(draft.tags);

  return (
    <dialog
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 top-auto mx-auto my-0 p-0 border-0 w-full max-w-[420px] max-h-none h-[82dvh] bg-surface text-on-surface rounded-t-[28px] shadow-level-3 overflow-hidden open:flex flex-col backdrop:bg-black/60 backdrop:backdrop-blur-[2px] translate-y-full open:translate-y-0 starting:open:translate-y-full transition-[translate,display,overlay] transition-discrete duration-300 motion-reduce:transition-none"
      id="bottom-sheet"
      onCancel={(event) => {
        // Let the parent decide; the effect above closes the dialog once `open` is false.
        event.preventDefault();
        onClose();
      }}
      // Covers a second Escape, which some browsers close without firing `cancel`.
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(event) => {
        // Only the backdrop reports the dialog itself as the target.
        if (event.target === event.currentTarget && pressedBackdrop.current) onClose();
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      ref={dialogRef}
    >
      <form
        className="flex flex-col flex-1 min-h-0"
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        {/* No drag handle: the sheet can't be swiped down, so the close button and the backdrop dismiss it */}
        <div className="pl-5 pr-2 pt-3 pb-2 flex items-center justify-between border-b border-hairline shrink-0">
          <h2 className="text-[19px] font-bold tracking-tight text-on-surface" id={titleId}>
            Filters
          </h2>
          <button
            aria-label="Close filters"
            className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5 no-scrollbar">
          <div>
            <label className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5" htmlFor="craving-input">
              <MaterialIcon name="restaurant" className="text-primary text-[17px]" />
              What are you craving?
            </label>
            <div className="relative">
              <MaterialIcon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-muted pointer-events-none"
              />
              <input
                autoComplete="off"
                className={inputClass}
                enterKeyHint="search"
                id="craving-input"
                maxLength={100}
                onChange={(event) => onChange({ ...draft, craving: event.target.value })}
                placeholder="sec17, chinese, rice · zus · bak kut teh"
                ref={cravingRef}
                type="search"
                value={draft.craving}
              />
              {draft.craving ? (
                <button
                  aria-label="Clear craving"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:bg-surface-container"
                  onClick={() => onChange({ ...draft, craving: "" })}
                  type="button"
                >
                  <MaterialIcon name="close" className="text-[18px]" />
                </button>
              ) : null}
            </div>
            <p className="text-xs text-muted mt-1.5 px-1">Leave empty for anything.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border border-hairline">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5" htmlFor="budget-input">
                <MaterialIcon name="payments" className="text-primary text-[17px]" />
                Budget ceiling
              </label>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-fill text-white shadow-sm tabular-nums">
                {`RM${draft.budget} (${budgetTier(draft.budget)})`}
              </span>
            </div>
            <input
              aria-valuetext={`RM${draft.budget}, ${budgetTier(draft.budget)}`}
              className="w-full accent-primary h-2 cursor-pointer my-2"
              id="budget-input"
              max={BUDGET_RANGE.max}
              min={BUDGET_RANGE.min}
              onChange={(event) => onChange({ ...draft, budget: Number(event.target.value) })}
              step={1}
              type="range"
              value={draft.budget}
            />
            <div className="flex justify-between text-xs font-semibold text-on-surface-variant px-0.5 tabular-nums">
              <span>RM{BUDGET_RANGE.min} (Bajet)</span>
              <span>RM{BUDGET_RANGE.max} (Feast)</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <MaterialIcon name="near_me" className="text-primary text-[17px]" />
              How far will you go?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {DISTANCE_OPTIONS.map(({ km, label }) => {
                const selected = draft.maxDistanceKm === km;
                return (
                  <button
                    aria-pressed={selected}
                    className={`h-11 text-center rounded-full text-xs transition-all active:scale-95 tabular-nums ${
                      selected
                        ? "font-bold bg-primary-fill hover:bg-primary-fill-hover text-white shadow-sm"
                        : "font-semibold bg-surface-container text-on-surface-variant hover:bg-hairline"
                    }`}
                    key={label}
                    onClick={() => onChange({ ...draft, maxDistanceKm: km })}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-2 px-1">
              Measured from the campus centre. Google Maps gives your real route by walking, bus, LRT or car.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5" id={halalLabelId}>
              <MaterialIcon name="verified" className="text-primary text-[17px]" />
              Halal
            </p>
            <div
              aria-labelledby={halalLabelId}
              className="flex p-1 rounded-full bg-surface-container"
              role="radiogroup"
            >
              {HALAL_CHOICES.map(({ value, label }, index) => {
                const selected = currentHalal === value;
                return (
                  <button
                    aria-checked={selected}
                    className={`flex-1 h-11 px-2 rounded-full text-xs transition-all ${
                      selected
                        ? "font-bold bg-surface shadow-level-1 text-on-surface"
                        : "font-semibold text-on-surface-variant hover:text-on-surface"
                    }`}
                    key={value}
                    onClick={() => chooseHalal(value)}
                    onKeyDown={(event) => onHalalKeyDown(event, index)}
                    role="radio"
                    tabIndex={selected ? 0 : -1}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-1.5 px-1">Venues still to be checked appear under See more.</p>
          </div>

          <div>
            <p className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <MaterialIcon name="eco" className="text-primary text-[17px]" />
              More diet filters
            </p>
            <div className="flex flex-wrap gap-2">{DIET_TOGGLES.map(renderTag)}</div>
          </div>
        </div>

        <div className="shrink-0 p-4 bg-surface border-t border-hairline flex items-center gap-3">
          <button
            className="h-12 px-4 rounded-full text-xs font-bold text-on-surface bg-surface-container hover:bg-hairline active:scale-95 transition-all shrink-0"
            onClick={() => onChange(DEFAULT_FILTERS)}
            type="button"
          >
            Reset
          </button>
          <button
            className="flex-1 h-12 px-4 rounded-full bg-primary-fill hover:bg-primary-fill-hover text-white font-bold text-sm shadow-md shadow-primary/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            type="submit"
          >
            <MaterialIcon name="search" className="text-[18px]" />
            <span>Show results</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
