"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FilterBottomSheet from "@/components/home/FilterBottomSheet";
import { DEFAULT_FILTERS, filtersToSearchParams, type FilterDraft } from "@/lib/filters";

export default function FilterPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);

  return (
    <div className="bg-surface-container min-h-dvh">
      <FilterBottomSheet
        draft={draft}
        onApply={() => router.push(`/?${filtersToSearchParams(draft)}`)}
        onChange={setDraft}
        onClose={() => router.back()}
        open
      />
    </div>
  );
}
