import {
  applicationStatusSchema,
  type ApplicationStatus,
} from "@applyr/contracts";

import { actionClassNames } from "../../../shared/styles/actionStyles";
import {
  applicationListSortSchema,
  type ApplicationListSort,
} from "../schemas/applicationListSearchParams";

interface ApplicationFiltersProps {
  companyQuery: string;
  dateApplied: string;
  onClear: () => void;
  onCompanyQueryChange: (value: string) => void;
  onDateAppliedChange: (value: string) => void;
  onSortChange: (value: ApplicationListSort) => void;
  onStatusChange: (value: ApplicationStatus | "") => void;
  resultCount: number;
  sort: ApplicationListSort;
  status: ApplicationStatus | "";
}

const inputClassName =
  "mt-1 min-h-11 min-w-0 w-full rounded-control border border-control bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-action";

const countFormatter = new Intl.NumberFormat();

export function ApplicationFilters({
  companyQuery,
  dateApplied,
  onClear,
  onCompanyQueryChange,
  onDateAppliedChange,
  onSortChange,
  onStatusChange,
  resultCount,
  sort,
  status,
}: ApplicationFiltersProps) {
  const hasActiveFilters =
    companyQuery !== "" || dateApplied !== "" || status !== "";

  function changeStatus(value: string): void {
    if (value === "") {
      onStatusChange("");
      return;
    }

    const statusResult = applicationStatusSchema.safeParse(value);

    if (statusResult.success) {
      onStatusChange(statusResult.data);
    }
  }

  function changeSort(value: string): void {
    const sortResult = applicationListSortSchema.safeParse(value);

    if (sortResult.success) {
      onSortChange(sortResult.data);
    }
  }

  return (
    <section
      aria-label="Application filters"
      className="rounded-panel border border-border bg-surface p-3 shadow-panel sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ink">Filter and sort</h2>
        <p
          aria-live="polite"
          className="font-data text-sm font-semibold text-muted tabular-nums"
        >
          {countFormatter.format(resultCount)}{" "}
          {resultCount === 1 ? "application" : "applications"}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(8rem,1fr))_auto] lg:items-end">
        <div className="sm:col-span-2 lg:col-span-1">
          <label
            className="text-sm font-medium text-ink"
            htmlFor="companyFilter"
          >
            Company
          </label>
          <input
            autoComplete="off"
            className={inputClassName}
            id="companyFilter"
            maxLength={255}
            name="company"
            onChange={(event) => onCompanyQueryChange(event.target.value)}
            placeholder="Search companies"
            type="search"
            value={companyQuery}
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-ink"
            htmlFor="statusFilter"
          >
            Status
          </label>
          <select
            className={inputClassName}
            id="statusFilter"
            name="status"
            onChange={(event) => changeStatus(event.target.value)}
            value={status}
          >
            <option value="">All statuses</option>
            {applicationStatusSchema.options.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="text-sm font-medium text-ink"
            htmlFor="dateAppliedFilter"
          >
            Date applied
          </label>
          <input
            className={inputClassName}
            id="dateAppliedFilter"
            name="dateApplied"
            onChange={(event) => onDateAppliedChange(event.target.value)}
            type="date"
            value={dateApplied}
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-ink"
            htmlFor="sortApplications"
          >
            Sort
          </label>
          <select
            className={inputClassName}
            id="sortApplications"
            name="sort"
            onChange={(event) => changeSort(event.target.value)}
            value={sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="status">Status</option>
          </select>
        </div>

        <button
          className={`${actionClassNames.secondary} w-full sm:w-auto`}
          disabled={!hasActiveFilters}
          onClick={onClear}
          type="button"
        >
          Clear filters
        </button>
      </div>
    </section>
  );
}
