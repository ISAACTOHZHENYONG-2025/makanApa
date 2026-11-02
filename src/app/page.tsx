import HomePage from "@/components/home/HomePage";
import { toDecidePayload } from "@/lib/apiClient";
import { decideMatches } from "@/lib/decide";
import { filtersFromSearchParams } from "@/lib/filters";

export default async function Home(props: PageProps<"/">) {
  const initialFilters = filtersFromSearchParams(await props.searchParams);
  // The first results come with the page, so nobody waits for the browser to load and then ask. This is code's
  // reading of the craving (or the AI's, when cached); HomePage asks for the AI's reading afterwards. If it fails,
  // HomePage fetches the results itself. loading.tsx shows a skeleton meanwhile.
  const initialData = await decideMatches({ ...toDecidePayload(initialFilters), skipAi: true }).catch((err) => {
    console.error("Could not work out the first results on the server:", err);
    return undefined;
  });
  // Keyed so new filters in the URL start a fresh page state.
  return <HomePage initialData={initialData} initialFilters={initialFilters} key={JSON.stringify(initialFilters)} />;
}
