import {
  applicationStatusSchema,
  createApplicationRequestSchema,
  type CreateApplicationRequest,
} from "@applyr/contracts";
import { useState, type SubmitEvent } from "react";
import { Link } from "react-router";

import { actionClassNames } from "../../../shared/styles/actionStyles";

interface ApplicationFormProps {
  cancelTo?: string;
  initialValues?: CreateApplicationRequest;
  onSubmit: (input: CreateApplicationRequest) => Promise<void>;
  submitLabel?: string;
}

type ApplicationFormFieldName =
  | "companyName"
  | "companyWebsite"
  | "role"
  | "jobPostLink"
  | "status"
  | "dateApplied"
  | "notes";

type ApplicationFormFieldErrors = Partial<
  Record<ApplicationFormFieldName, string>
>;

interface ValidationIssue {
  message: string;
  path: readonly PropertyKey[];
}

const fieldNameByIssuePath: Partial<Record<string, ApplicationFormFieldName>> =
  {
    "company.name": "companyName",
    "company.website": "companyWebsite",
    role: "role",
    jobPostLink: "jobPostLink",
    status: "status",
    dateApplied: "dateApplied",
    notes: "notes",
  };

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none";
const fieldErrorClassName = "mt-1 text-sm text-danger";

function getFieldErrors(
  issues: readonly ValidationIssue[],
): ApplicationFormFieldErrors {
  const fieldErrors: ApplicationFormFieldErrors = {};

  for (const issue of issues) {
    const issuePath = issue.path.map(String).join(".");
    const fieldName = fieldNameByIssuePath[issuePath];

    if (fieldName !== undefined && fieldErrors[fieldName] === undefined) {
      fieldErrors[fieldName] = issue.message;
    }
  }

  return fieldErrors;
}

function focusFirstInvalidField(
  form: HTMLFormElement,
  fieldErrors: ApplicationFormFieldErrors,
): void {
  const invalidFieldNames = new Set(Object.keys(fieldErrors));
  const firstInvalidField = Array.from(form.elements).find(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      invalidFieldNames.has(element.getAttribute("name") ?? ""),
  );

  firstInvalidField?.focus();
}

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
  const [fieldErrors, setFieldErrors] = useState<ApplicationFormFieldErrors>(
    {},
  );
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
    null,
  );

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFieldErrors({});
    setSubmitErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

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
      const nextFieldErrors = getFieldErrors(validationResult.error.issues);

      setFieldErrors(nextFieldErrors);
      focusFirstInvalidField(form, nextFieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(validationResult.data);
    } catch (error: unknown) {
      setSubmitErrorMessage(
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
      {submitErrorMessage !== null && (
        <p
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {submitErrorMessage}
        </p>
      )}

      <fieldset className="space-y-4 border-b border-border pb-5">
        <legend className="font-display text-lg font-bold text-ink">
          Company
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
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
            {fieldErrors.companyName !== undefined && (
              <p className={fieldErrorClassName}>{fieldErrors.companyName}</p>
            )}
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
            {fieldErrors.companyWebsite !== undefined && (
              <p className={fieldErrorClassName}>
                {fieldErrors.companyWebsite}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-b border-border pb-5">
        <legend className="font-display text-lg font-bold text-ink">
          Position
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
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
            {fieldErrors.role !== undefined && (
              <p className={fieldErrorClassName}>{fieldErrors.role}</p>
            )}
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
            {fieldErrors.jobPostLink !== undefined && (
              <p className={fieldErrorClassName}>{fieldErrors.jobPostLink}</p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-b border-border pb-5">
        <legend className="font-display text-lg font-bold text-ink">
          Tracking
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-gray-800"
              htmlFor="status"
            >
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
            {fieldErrors.status !== undefined && (
              <p className={fieldErrorClassName}>{fieldErrors.status}</p>
            )}
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
            {fieldErrors.dateApplied !== undefined && (
              <p className={fieldErrorClassName}>{fieldErrors.dateApplied}</p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-ink">
          Notes
        </legend>

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
          {fieldErrors.notes !== undefined && (
            <p className={fieldErrorClassName}>{fieldErrors.notes}</p>
          )}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={actionClassNames.primary}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
        <Link to={cancelTo} className={actionClassNames.secondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
