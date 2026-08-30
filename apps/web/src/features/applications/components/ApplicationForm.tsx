import {
  applicationStatusSchema,
  createApplicationRequestSchema,
  type CreateApplicationRequest,
} from "@applyr/contracts";
import { useState, type SubmitEvent } from "react";
import { Link } from "react-router";

interface ApplicationFormProps {
  cancelTo?: string;
  initialValues?: CreateApplicationRequest;
  onSubmit: (input: CreateApplicationRequest) => Promise<void>;
  submitLabel?: string;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none";

function getTextValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function emptyStringToNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : trimmedValue;
}

export function ApplicationForm({
  cancelTo = "/applications",
  initialValues,
  onSubmit,
  submitLabel = "Save application",
}: ApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const validationResult = createApplicationRequestSchema.safeParse({
      company: {
        name: getTextValue(formData, "companyName"),
        website: emptyStringToNull(getTextValue(formData, "companyWebsite")),
      },
      role: getTextValue(formData, "role"),
      jobPostLink: emptyStringToNull(getTextValue(formData, "jobPostLink")),
      status: getTextValue(formData, "status"),
      dateApplied: getTextValue(formData, "dateApplied"),
      notes: emptyStringToNull(getTextValue(formData, "notes")),
    });

    if (!validationResult.success) {
      setErrorMessage(
        validationResult.error.issues[0]?.message ??
          "Please check the form and try again",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(validationResult.data);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save application",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="mt-6 space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      noValidate
      onSubmit={handleSubmit}
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
          defaultValue={initialValues?.company.name ?? ""}
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
          defaultValue={initialValues?.company.website ?? ""}
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
          defaultValue={initialValues?.role ?? ""}
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
          defaultValue={initialValues?.jobPostLink ?? ""}
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
          defaultValue={initialValues?.status ?? "Applied"}
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
          defaultValue={initialValues?.dateApplied ?? ""}
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
        <textarea
          className={inputClassName}
          defaultValue={initialValues?.notes ?? ""}
          id="notes"
          name="notes"
          rows={4}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <Link
          to={cancelTo}
          className="rounded-md px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
