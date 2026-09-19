import type { Resume } from "@applyr/contracts";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { actionClassNames } from "../../../shared/styles/actionStyles";
import { downloadResume } from "../api/resumes.api";
import { ResumePreview } from "./ResumePreview";

interface ResumePreviewModalProps {
  resume: Resume;
  onClose: () => void;
}

export function ResumePreviewModal({
  resume,
  onClose,
}: ResumePreviewModalProps) {
  const headingId = useId();
  const fileNameId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const downloadRequestRef = useRef<AbortController | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const closePreview = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    // showModal provides the top layer, inert background and native focus return.
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    dialog.showModal();
    closeButtonRef.current?.focus({ preventScroll: true });
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      downloadRequestRef.current?.abort();
      dialog.close();
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  async function handleDownload(): Promise<void> {
    if (downloadRequestRef.current !== null) {
      return;
    }

    const controller = new AbortController();
    downloadRequestRef.current = controller;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      await downloadResume(resume, controller.signal);
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setDownloadError(
          error instanceof Error
            ? error.message
            : "Unable to download the resume.",
        );
      }
    } finally {
      downloadRequestRef.current = null;
      if (!controller.signal.aborted) {
        setIsDownloading(false);
      }
    }
  }

  return (
    <dialog
      aria-describedby={fileNameId}
      aria-labelledby={headingId}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none flex-col overflow-hidden border-0 bg-canvas p-0 text-ink backdrop:bg-ink/60 open:flex"
      onClose={(event) => {
        // Ignore a queued cleanup event if Strict Mode already reopened it.
        if (!event.currentTarget.open) {
          onClose();
        }
      }}
      ref={dialogRef}
    >
      <header className="flex max-h-[50dvh] shrink-0 flex-wrap items-center gap-3 overflow-auto border-b border-border bg-surface px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" id={headingId}>
              Resume preview
            </h2>
            <span className="rounded border border-action/20 bg-canvas px-2 py-0.5 font-data text-xs font-bold text-action">
              {resume.mediaType === "application/pdf" ? "PDF" : "DOCX"}
            </span>
          </div>
          <p
            className="mt-1 truncate font-data text-xs text-muted sm:text-sm"
            id={fileNameId}
            title={resume.fileName}
          >
            {resume.fileName}
          </p>
        </div>
        <button
          className={`${actionClassNames.primary} order-3 w-full shrink-0 sm:order-2 sm:w-auto`}
          disabled={isDownloading}
          onClick={() => void handleDownload()}
          type="button"
        >
          {isDownloading ? "Downloading…" : "Download original"}
        </button>
        <button
          aria-label="Close resume preview"
          className={`${actionClassNames.secondary} order-2 shrink-0 sm:order-3`}
          onClick={closePreview}
          ref={closeButtonRef}
          type="button"
        >
          Close
        </button>
        {downloadError !== null ? (
          <p
            className="order-4 w-full text-sm text-danger wrap-anywhere"
            role="alert"
          >
            {downloadError} Try Download original again, or close this preview
            and refresh the resume details.
          </p>
        ) : null}
        <p className="sr-only" role="status">
          {isDownloading ? "Preparing the original file…" : ""}
        </p>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-5">
        <ResumePreview onClose={closePreview} resume={resume} />
      </div>
    </dialog>
  );
}
