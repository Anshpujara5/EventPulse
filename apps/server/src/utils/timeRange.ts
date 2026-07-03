// Maps a header time-range token to a Postgres interval literal, or null when
// the range means "no time filter" (all time / unknown). Kept tiny and shared
// so the events and analytics controllers stay in sync.

export type TimeRangeToken = "24h" | "7d" | "30d" | "all";

export function rangeToInterval(range: unknown): string | null {
  switch (range) {
    case "24h":
      return "24 hours";
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    default:
      // "all", missing, or anything unexpected → no time filter.
      return null;
  }
}
