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

const fieldErrorMessages = {
  companyName: "Enter a company name between 1 and 255 characters.",
  companyWebsite:
    "Enter a website starting with https:// or http://, or leave it blank.",
  role: "Enter a role between 1 and 255 characters.",
  jobPostLink:
    "Enter a job link starting with https:// or http://, or leave it blank.",
  status: "Choose an application status from the list.",
  dateApplied: "Choose a valid application date.",
  notes: "Enter your notes as text, or leave this field blank.",
} satisfies Record<ApplicationFormFieldName, string>;

const inputClassName =
  "mt-1 min-h-11 min-w-0 w-full rounded-control border border-control bg-surface px-3 py-2 text-ink placeholder:text-muted focus:border-action";
const fieldErrorClassName = "mt-1 wrap-break-word text-sm text-danger";

function getFieldErrors(
  issues: readonly ValidationIssue[],
): ApplicationFormFieldErrors {
  const fieldErrors: ApplicationFormFieldErrors = {};

  for (const issue of issues) {
    const issuePath = issue.path.map(String).join(".");
    const fieldName = fieldNameByIssuePath[issuePath];

    if (fieldName !== undefined && fieldErrors[fieldName] === undefined) {
      fieldErrors[fieldName] = fieldErrorMessages[fieldName];
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
      // Wait for the error text and aria-describedby to reach the DOM.
      requestAnimationFrame(() => {
        focusFirstInvalidField(form, nextFieldErrors);
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(validationResult.data);
    } catch (error: unknown) {
      setSubmitErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save the application.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-busy={isSubmitting}
      className="mt-6 min-w-0 space-y-5 rounded-panel border border-border bg-surface p-4 shadow-panel sm:p-6"
      noValidate
      onSubmit={handleSubmit}
    >
      {submitErrorMessage !== null && (
        <p
          className="wrap-break-word rounded-control border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
          role="alert"
        >
          {submitErrorMessage}
          <span className="mt-1 block">
            Your input is still here. Check your applications in a new tab
            before trying again.
          </span>
        </p>
      )}

      <fieldset className="min-w-0 space-y-4 border-b border-border pb-5">
        <legend className="font-display text-lg font-bold text-ink">
          Company
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label
              className="text-sm font-medium text-ink"
              htmlFor="companyName"
            >
              Company name
            </label>
            <input
              aria-describedby={
                fieldErrors.companyName ? "companyName-error" : undefined
              }
              aria-invalid={fieldErrors.companyName !== undefined}
              autoComplete="organization"
              className={inputClassName}
              defaultValue={initialValues?.company.name ?? ""}
              id="companyName"
              maxLength={255}
              name="companyName"
              required
              type="text"
            />
            {fieldErrors.companyName !== undefined && (
              <p className={fieldErrorClassName} id="companyName-error">
                {fieldErrors.companyName}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <label
              className="text-sm font-medium text-ink"
              htmlFor="companyWebsite"
            >
              Company website <span className="text-muted">(optional)</span>
            </label>
            <input
              aria-describedby={
                fieldErrors.companyWebsite ? "companyWebsite-error" : undefined
              }
              aria-invalid={fieldErrors.companyWebsite !== undefined}
              autoCapitalize="none"
              autoComplete="url"
              className={inputClassName}
              defaultValue={initialValues?.company.website ?? ""}
              id="companyWebsite"
              name="companyWebsite"
              placeholder="https://example.com"
              spellCheck={false}
              type="url"
            />
            {fieldErrors.companyWebsite !== undefined && (
              <p className={fieldErrorClassName} id="companyWebsite-error">
                {fieldErrors.companyWebsite}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-4 border-b border-border pb-5">
        <legend className="font-display text-lg font-bold text-ink">
          Position
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label className="text-sm font-medium text-ink" htmlFor="role">
              Role
            </label>
            <input
              aria-describedby={fieldErrors.role ? "role-error" : undefined}
              aria-invalid={fieldErrors.role !== undefined}
              autoComplete="off"
              className={inputClassName}
              defaultValue={initialValues?.role ?? ""}
              id="role"
              maxLength={255}
              name="role"
              required
              type="text"
            />
            {fieldErrors.role !== undefined && (
              <p className={fieldErrorClassName} id="role-error">
                {fieldErrors.role}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <label
              className="text-sm font-medium text-ink"
              htmlFor="jobPostLink"
            >
              Job post link <span className="text-muted">(optional)</span>
            </label>
            <input
              aria-describedby={
                fieldErrors.jobPostLink ? "jobPostLink-error" : undefined
              }
              aria-invalid={fieldErrors.jobPostLink !== undefined}
              autoCapitalize="none"
              autoComplete="off"
              className={inputClassName}
              defaultValue={initialValues?.jobPostLink ?? ""}
              id="jobPostLink"
              name="jobPostLink"
              placeholder="https://example.com/jobs/123"
              spellCheck={false}
              type="url"
            />
            {fieldErrors.jobPostLink !== undefined && (
              <p className={fieldErrorClassName} id="jobPostLink-error">
                {fieldErrors.jobPostLink}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-4 border-b border-border pb-5">
        <legend className="font-display text-lg font-bold text-ink">
          Tracking
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label
              className="text-sm font-medium text-ink"
              htmlFor="status"
            >
              Status
            </label>
            <select
              aria-describedby={
                fieldErrors.status ? "status-error" : undefined
              }
              aria-invalid={fieldErrors.status !== undefined}
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
              <p className={fieldErrorClassName} id="status-error">
                {fieldErrors.status}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <label
              className="text-sm font-medium text-ink"
              htmlFor="dateApplied"
            >
              Date applied
            </label>
            <input
              aria-describedby={
                fieldErrors.dateApplied ? "dateApplied-error" : undefined
              }
              aria-invalid={fieldErrors.dateApplied !== undefined}
              className={inputClassName}
              defaultValue={initialValues?.dateApplied ?? ""}
              id="dateApplied"
              name="dateApplied"
              required
              type="date"
            />
            {fieldErrors.dateApplied !== undefined && (
              <p className={fieldErrorClassName} id="dateApplied-error">
                {fieldErrors.dateApplied}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-4">
        <legend className="font-display text-lg font-bold text-ink">
          Notes
        </legend>

        <div className="min-w-0">
          <label className="text-sm font-medium text-ink" htmlFor="notes">
            Notes <span className="text-muted">(optional)</span>
          </label>
          <textarea
            aria-describedby={fieldErrors.notes ? "notes-error" : undefined}
            aria-invalid={fieldErrors.notes !== undefined}
            className={inputClassName}
            defaultValue={initialValues?.notes ?? ""}
            id="notes"
            name="notes"
            rows={4}
          />
          {fieldErrors.notes !== undefined && (
            <p className={fieldErrorClassName} id="notes-error">
              {fieldErrors.notes}
            </p>
          )}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
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
