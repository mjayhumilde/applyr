import { applicationStatusSchema } from "@applyr/contracts";
import type { SubmitEventHandler } from "react";
import { Link } from "react-router";

interface ApplicationFormProps {
  errorMessage: string | null;
  isSubmitting: boolean;
  onSubmit: SubmitEventHandler<HTMLFormElement>;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none";

export function ApplicationForm({
  errorMessage,
  isSubmitting,
  onSubmit,
}: ApplicationFormProps) {
  return (
    <form
      className="mt-6 space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      noValidate
      onSubmit={onSubmit}
    >
      {errorMessage !== null && (
        <p
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <div>
        <label
          className="text-sm font-medium text-gray-800"
          htmlFor="companyName"
        >
          Company name
        </label>
        <input
          className={inputClassName}
          id="companyName"
          maxLength={255}
          name="companyName"
          required
          type="text"
        />
      </div>

      <div>
        <label
          className="text-sm font-medium text-gray-800"
          htmlFor="companyWebsite"
        >
          Company website <span className="text-gray-500">(optional)</span>
        </label>
        <input
          className={inputClassName}
          id="companyWebsite"
          name="companyWebsite"
          placeholder="https://example.com"
          type="url"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-800" htmlFor="role">
          Role
        </label>
        <input
          className={inputClassName}
          id="role"
          maxLength={255}
          name="role"
          required
          type="text"
        />
      </div>

      <div>
        <label
          className="text-sm font-medium text-gray-800"
          htmlFor="jobPostLink"
        >
          Job post link <span className="text-gray-500">(optional)</span>
        </label>
        <input
          className={inputClassName}
          id="jobPostLink"
          name="jobPostLink"
          placeholder="https://example.com/jobs/123"
          type="url"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-800" htmlFor="status">
          Status
        </label>
        <select
          className={inputClassName}
          defaultValue="Applied"
          id="status"
          name="status"
        >
          {applicationStatusSchema.options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="text-sm font-medium text-gray-800"
          htmlFor="dateApplied"
        >
          Date applied
        </label>
        <input
          className={inputClassName}
          id="dateApplied"
          name="dateApplied"
          required
          type="date"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-800" htmlFor="notes">
          Notes <span className="text-gray-500">(optional)</span>
        </label>
        <textarea className={inputClassName} id="notes" name="notes" rows={4} />
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving..." : "Save application"}
        </button>
        <Link
          to="/applications"
          className="rounded-md px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
