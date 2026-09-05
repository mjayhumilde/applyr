import {
  createApplicationEventRequestSchema,
  type ApplicationEvent,
} from "@applyr/contracts";
import { useState, type SubmitEvent } from "react";
import { z } from "zod";

import { actionClassNames } from "../../../shared/styles/actionStyles";
import { createApplicationEvent } from "../api/applications.api";

interface ApplicationEventFormProps {
  applicationId: number;
  onCreated: (applicationId: number, event: ApplicationEvent) => void;
}

const eventPresetSchema = z.enum([
  "Interview",
  "Follow-up",
  "Offer",
  "Rejection",
  "Custom",
]);

type EventPreset = z.infer<typeof eventPresetSchema>;
type EventFormField = "eventPreset" | "customEventType" | "eventDate";

interface EventFormError {
  field: EventFormField | null;
  message: string;
}

const defaultEventPreset: EventPreset = "Interview";
const inputClassName =
  "mt-1 min-h-11 min-w-0 w-full rounded-control border border-control bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-action disabled:opacity-60";

function getTextValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

export function ApplicationEventForm({
  applicationId,
  onCreated,
}: ApplicationEventFormProps) {
  const [eventPreset, setEventPreset] =
    useState<EventPreset>(defaultEventPreset);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<EventFormError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function showFieldError(
    form: HTMLFormElement,
    field: EventFormField,
    message: string,
  ): void {
    setFormError({ field, message });

    // Focus after React renders the error used by aria-describedby.
    requestAnimationFrame(() => {
      const control = form.elements.namedItem(field);

      if (control instanceof HTMLElement) {
        control.focus();
      }
    });
  }

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const presetResult = eventPresetSchema.safeParse(
      getTextValue(formData, "eventPreset"),
    );

    if (!presetResult.success) {
      showFieldError(
        form,
        "eventPreset",
        "Choose an event type from the list.",
      );
      return;
    }

    const validationResult = createApplicationEventRequestSchema.safeParse({
      eventType:
        presetResult.data === "Custom"
          ? getTextValue(formData, "customEventType")
          : presetResult.data,
      eventDate: getTextValue(formData, "eventDate"),
    });

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];

      if (issue?.path[0] === "eventType") {
        showFieldError(
          form,
          presetResult.data === "Custom" ? "customEventType" : "eventPreset",
          "Enter an event name between 1 and 255 characters.",
        );
      } else if (issue?.path[0] === "eventDate") {
        showFieldError(form, "eventDate", "Choose a valid event date.");
      } else {
        setFormError({
          field: null,
          message: "Check the event details and try again.",
        });
      }

      return;
    }

    const submittedApplicationId = applicationId;

    try {
      setIsSubmitting(true);
      const createdEvent = await createApplicationEvent(
        submittedApplicationId,
        validationResult.data,
      );

      onCreated(submittedApplicationId, createdEvent);
      form.reset();
      setEventPreset(defaultEventPreset);
      setSuccessMessage(`${createdEvent.eventType} logged.`);
    } catch (error: unknown) {
      setFormError({
        field: null,
        message:
          error instanceof Error
            ? error.message
            : "Unable to log the event.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-busy={isSubmitting}
      aria-labelledby="log-event-heading"
      className="min-w-0 rounded-panel border border-border bg-surface p-4 shadow-panel sm:p-5"
      noValidate
      onSubmit={handleSubmit}
    >
      <h2
        className="font-display text-xl font-bold text-ink"
        id="log-event-heading"
      >
        Log an event
      </h2>
      <p className="mt-1 text-sm text-muted">
        Record a milestone or next step.
      </p>

      {formError !== null && (
        <p
          className="mt-3 wrap-break-word rounded-control border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
          id="event-form-error"
          role="alert"
        >
          {formError.message}
          {formError.field === null && (
            <span className="mt-1 block">
              Your input is still here. Check this application in a new tab
              before logging the event again.
            </span>
          )}
        </p>
      )}

      <fieldset className="mt-4 min-w-0" disabled={isSubmitting}>
        <legend className="sr-only">Event details</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label
              className="text-sm font-semibold text-ink"
              htmlFor="eventPreset"
            >
              Event type
            </label>
            <select
              aria-describedby={
                formError?.field === "eventPreset"
                  ? "event-form-error"
                  : undefined
              }
              aria-invalid={formError?.field === "eventPreset"}
              className={inputClassName}
              id="eventPreset"
              name="eventPreset"
              onChange={(event) => {
                const presetResult = eventPresetSchema.safeParse(
                  event.target.value,
                );

                if (presetResult.success) {
                  setEventPreset(presetResult.data);
                  setFormError(null);
                  setSuccessMessage(null);
                }
              }}
              required
              value={eventPreset}
            >
              {eventPresetSchema.options.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label
              className="text-sm font-semibold text-ink"
              htmlFor="eventDate"
            >
              Event date
            </label>
            <input
              aria-describedby={
                formError?.field === "eventDate"
                  ? "event-form-error"
                  : undefined
              }
              aria-invalid={formError?.field === "eventDate"}
              className={inputClassName}
              id="eventDate"
              name="eventDate"
              required
              type="date"
            />
          </div>
          {eventPreset === "Custom" && (
            <div className="min-w-0 sm:col-span-2">
              <label
                className="text-sm font-semibold text-ink"
                htmlFor="customEventType"
              >
                Event name
              </label>
              <input
                aria-describedby={
                  formError?.field === "customEventType"
                    ? "event-form-error"
                    : undefined
                }
                aria-invalid={formError?.field === "customEventType"}
                autoComplete="off"
                className={inputClassName}
                id="customEventType"
                maxLength={255}
                name="customEventType"
                placeholder="e.g. Take-home assignment"
                required
                type="text"
              />
            </div>
          )}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          className={`${actionClassNames.primary} w-full sm:w-auto`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Logging…" : "Log event"}
        </button>
        <p
          aria-atomic="true"
          className="min-w-0 wrap-break-word text-sm font-semibold text-success"
          role="status"
        >
          {successMessage}
        </p>
      </div>
      <p className="mt-3 text-xs text-muted">
        Logging an event does not change the application status.
      </p>
    </form>
  );
}
