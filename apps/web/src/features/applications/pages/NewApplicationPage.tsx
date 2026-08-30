import { createApplicationRequestSchema } from "@applyr/contracts";
import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";

import { createApplication } from "../api/applications.api";
import { ApplicationForm } from "../components/ApplicationForm";

function getTextValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function emptyStringToNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : trimmedValue;
}

const NewApplicationPage = () => {
  const navigate = useNavigate();
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
      await createApplication(validationResult.data);
      navigate("/applications", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create application",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl p-6 sm:p-10">
      <Link
        to="/applications"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        Back to applications
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-gray-900">Add application</h1>

      <ApplicationForm
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default NewApplicationPage;
