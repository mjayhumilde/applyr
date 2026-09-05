import { useState } from "react";

import { actionClassNames } from "../../../shared/styles/actionStyles";
import { deleteApplication } from "../api/applications.api";

interface DeleteApplicationButtonProps {
  applicationId: number;
  onDeleted: () => void;
}

export function DeleteApplicationButton({
  applicationId,
  onDeleted,
}: DeleteApplicationButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (isDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this application? This action cannot be undone.",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await deleteApplication(applicationId);
      onDeleted();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete application.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-w-0 sm:max-w-xs">
      <button
        className={`${actionClassNames.danger} w-full sm:w-auto`}
        disabled={isDeleting}
        onClick={() => void handleDelete()}
        type="button"
      >
        {isDeleting ? "Deleting…" : "Delete application"}
      </button>

      {errorMessage !== null && (
        <div className="mt-2 text-sm text-danger wrap-anywhere" role="alert">
          <p>{errorMessage}</p>
          <p>
            Refresh this page to check whether the application was deleted
            before trying again.
          </p>
        </div>
      )}
    </div>
  );
}
