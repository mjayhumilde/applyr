import {
  applicationStatusSchema,
  type ApplicationStatus,
} from "@applyr/contracts";

interface ApplicationFiltersProps {
  companyQuery: string;
  dateApplied: string;
  onClear: () => void;
  onCompanyQueryChange: (value: string) => void;
  onDateAppliedChange: (value: string) => void;
  onStatusChange: (value: ApplicationStatus | "") => void;
  status: ApplicationStatus | "";
}

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none";

export function ApplicationFilters({
  companyQuery,
  dateApplied,
  onClear,
  onCompanyQueryChange,
  onDateAppliedChange,
  onStatusChange,
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

  return (
    <section
      aria-label="Application filters"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            className="text-sm font-medium text-gray-800"
            htmlFor="companyFilter"
          >
            Company
          </label>
          <input
            className={inputClassName}
            id="companyFilter"
            onChange={(event) => onCompanyQueryChange(event.target.value)}
            placeholder="Search companies"
            type="search"
            value={companyQuery}
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-gray-800"
            htmlFor="statusFilter"
          >
            Status
          </label>
          <select
            className={inputClassName}
            id="statusFilter"
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
            className="text-sm font-medium text-gray-800"
            htmlFor="dateAppliedFilter"
          >
            Date applied
          </label>
          <input
            className={inputClassName}
            id="dateAppliedFilter"
            onChange={(event) => onDateAppliedChange(event.target.value)}
            type="date"
            value={dateApplied}
          />
        </div>
      </div>

      <button
        className="mt-4 text-sm font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        disabled={!hasActiveFilters}
        onClick={onClear}
        type="button"
      >
        Clear filters
      </button>
    </section>
  );
}
