import {
  createApplicationEventRequestSchema,
  type ApplicationEvent,
} from "@applyr/contracts";
import { useState, type SubmitEvent } from "react";

import { createApplicationEvent } from "../api/applications.api";

interface ApplicationEventFormProps {
  applicationId: number;
  onCreated: (applicationId: number, event: ApplicationEvent) => void;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none";

function getTextValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

export function ApplicationEventForm({
  applicationId,
  onCreated,
}: ApplicationEventFormProps) {
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const validationResult = createApplicationEventRequestSchema.safeParse({
      eventType: getTextValue(formData, "eventType"),
      eventDate: getTextValue(formData, "eventDate"),
    });

    if (!validationResult.success) {
      setErrorMessage(
        validationResult.error.issues[0]?.message ??
          "Please check the event and try again",
      );
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
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create event",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      noValidate
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-semibold text-gray-900">Add event</h2>

      {errorMessage !== null && (
        <p
          className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="text-sm font-medium text-gray-800"
            htmlFor="eventType"
          >
            Event type
          </label>
          <input
            className={inputClassName}
            id="eventType"
            maxLength={255}
            name="eventType"
            placeholder="Interview scheduled"
            required
            type="text"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-gray-800"
            htmlFor="eventDate"
          >
            Event date
          </label>
          <input
            className={inputClassName}
            id="eventDate"
            name="eventDate"
            required
            type="date"
          />
        </div>
      </div>

      <button
        className="mt-4 rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving..." : "Add event"}
      </button>
    </form>
  );
}
