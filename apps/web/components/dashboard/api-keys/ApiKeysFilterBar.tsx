import { FilterDropdown, type FilterOption } from "@/components/common/FilterDropdown";
import { Icon } from "@/components/common/Icon";

export function ApiKeysFilterBar({
  onProjectChange,
  onSearchChange,
  onStatusChange,
  projectFilter,
  projectOptions,
  searchQuery,
  statusFilter,
  statusOptions,
}: {
  onProjectChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  projectFilter: string;
  projectOptions: FilterOption[];
  searchQuery: string;
  statusFilter: string;
  statusOptions: FilterOption[];
}) {
  return (
    <section className="mt-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-slate-400 lg:w-80">
        <Icon name="search" className="size-5 shrink-0" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search API keys..."
          value={searchQuery}
        />
      </div>
      <FilterDropdown
        ariaLabel="Filter API keys by project"
        icon="cube"
        onChange={onProjectChange}
        options={projectOptions}
        value={projectFilter}
        widthClassName="w-full lg:w-56"
      />
      <FilterDropdown
        ariaLabel="Filter API keys by status"
        icon="list"
        onChange={onStatusChange}
        options={statusOptions}
        value={statusFilter}
        widthClassName="w-full lg:w-48"
      />
    </section>
  );
}
