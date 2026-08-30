import { useState } from "react";

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
    const shouldDelete = window.confirm(
      "Delete this application? This action cannot be undone.",
    );

    if (!shouldDelete || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await deleteApplication(applicationId);
      onDeleted();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete application",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isDeleting}
        onClick={() => void handleDelete()}
        type="button"
      >
        {isDeleting ? "Deleting..." : "Delete application"}
      </button>

      {errorMessage !== null && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
