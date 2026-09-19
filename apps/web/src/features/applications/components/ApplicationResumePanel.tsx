import type { Resume } from "@applyr/contracts";
import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";

import { actionClassNames } from "../../../shared/styles/actionStyles";
import {
  downloadResume,
  getResume,
  removeResume,
  uploadResume,
  validateResumeFile,
} from "../api/resumes.api";
import { ResumePreviewModal } from "./ResumePreviewModal";

interface ApplicationResumePanelProps {
  applicationId: number;
}

type ResumeState =
  | { status: "loading" }
  | { status: "ready"; resume: Resume | null }
  | { status: "error"; message: string };

type PendingAction = "upload" | "remove" | "download" | null;

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(bytes / 1024))} KiB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ApplicationResumePanel(props: ApplicationResumePanelProps) {
  // A route change gets fresh form state and cleans up the previous requests.
  return <ResumePanelContent key={props.applicationId} {...props} />;
}

function ResumePanelContent({ applicationId }: ApplicationResumePanelProps) {
  const headingId = useId();
  const fileInputId = useId();
  const hintId = useId();
  const errorId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionRequestsRef = useRef(new Set<AbortController>());
  const [state, setState] = useState<ResumeState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isBusy = pendingAction !== null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadResume(): Promise<void> {
      try {
        const resume = await getResume(applicationId, controller.signal);

        if (!controller.signal.aborted) {
          setState({ status: "ready", resume });
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message: errorMessage(error, "Unable to load the resume details."),
          });
        }
      }
    }

    void loadResume();
    return () => controller.abort();
  }, [applicationId, requestVersion]);

  useEffect(() => {
    const requests = actionRequestsRef.current;

    return () => {
      for (const controller of requests) {
        controller.abort();
      }
      requests.clear();
    };
  }, []);

  function refreshResume(): void {
    if (actionRequestsRef.current.size > 0) {
      return;
    }

    setIsPreviewOpen(false);
    setActionError(null);
    setSuccessMessage(null);
    setState({ status: "loading" });
    setRequestVersion((version) => version + 1);
  }

  async function handleUpload(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (actionRequestsRef.current.size > 0 || state.status !== "ready") {
      return;
    }

    if (selectedFile === null) {
      setFileError("Choose a PDF or DOCX file to upload.");
      fileInputRef.current?.focus();
      return;
    }

    try {
      validateResumeFile(selectedFile);
    } catch (error: unknown) {
      setFileError(errorMessage(error, "Choose a PDF or DOCX file."));
      fileInputRef.current?.focus();
      return;
    }

    const isReplacing = state.resume !== null;

    if (
      isReplacing &&
      !window.confirm("Replace this resume? The current file will be removed.")
    ) {
      return;
    }

    const controller = new AbortController();
    actionRequestsRef.current.add(controller);
    setPendingAction("upload");
    setActionError(null);
    setFileError(null);
    setSuccessMessage(null);
    setIsPreviewOpen(false);

    try {
      const resume = await uploadResume(
        applicationId,
        selectedFile,
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setState({ status: "ready", resume });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setSuccessMessage(
          isReplacing ? "Resume replaced." : "Resume uploaded.",
        );
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setActionError(errorMessage(error, "Unable to upload the resume."));
      }
    } finally {
      actionRequestsRef.current.delete(controller);
      if (!controller.signal.aborted) {
        setPendingAction(null);
      }
    }
  }

  async function handleRemove(): Promise<void> {
    if (
      actionRequestsRef.current.size > 0 ||
      !window.confirm("Remove this resume? This file cannot be recovered.")
    ) {
      return;
    }

    const controller = new AbortController();
    actionRequestsRef.current.add(controller);
    setPendingAction("remove");
    setActionError(null);
    setSuccessMessage(null);
    setIsPreviewOpen(false);

    try {
      await removeResume(applicationId, controller.signal);

      if (!controller.signal.aborted) {
        setState({ status: "ready", resume: null });
        setSuccessMessage("Resume removed.");
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setActionError(errorMessage(error, "Unable to remove the resume."));
      }
    } finally {
      actionRequestsRef.current.delete(controller);
      if (!controller.signal.aborted) {
        setPendingAction(null);
      }
    }
  }

  async function handleDownload(resume: Resume): Promise<void> {
    if (actionRequestsRef.current.size > 0) {
      return;
    }

    const controller = new AbortController();
    actionRequestsRef.current.add(controller);
    setPendingAction("download");
    setActionError(null);
    setSuccessMessage(null);

    try {
      await downloadResume(resume, controller.signal);
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setActionError(errorMessage(error, "Unable to download the resume."));
      }
    } finally {
      actionRequestsRef.current.delete(controller);
      if (!controller.signal.aborted) {
        setPendingAction(null);
      }
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-panel border border-border bg-surface p-5 shadow-panel sm:p-6"
    >
      <h2 className="text-xl font-bold text-ink" id={headingId}>
        Resume used
      </h2>
      <p className="mt-1 text-sm text-muted">
        Keep the version you sent with this application.
      </p>

      {state.status === "loading" ? (
        <p className="mt-4 text-sm text-muted" role="status">
          Loading resume details…
        </p>
      ) : state.status === "error" ? (
        <div className="mt-4">
          <p className="text-sm text-danger wrap-anywhere" role="alert">
            {state.message}
          </p>
          <button
            className={`${actionClassNames.secondary} mt-3`}
            onClick={refreshResume}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {state.resume !== null ? (
            <div className="mt-4 min-w-0 rounded-control border border-border bg-canvas p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 rounded border border-action/20 bg-surface px-2 py-1 font-data text-xs font-bold text-action">
                  {state.resume.mediaType === "application/pdf"
                    ? "PDF"
                    : "DOCX"}
                </span>
                <div className="min-w-0">
                  <p className="font-data text-sm font-semibold text-ink wrap-anywhere">
                    {state.resume.fileName}
                  </p>
                  <p className="mt-1 font-data text-xs leading-relaxed text-muted">
                    {formatFileSize(state.resume.byteSize)}
                    <span aria-hidden="true"> · </span>
                    Uploaded{" "}
                    <time dateTime={state.resume.uploadedAt}>
                      {new Date(state.resume.uploadedAt).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </time>
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  aria-haspopup="dialog"
                  className={`${actionClassNames.secondary} w-full sm:w-auto`}
                  disabled={isBusy}
                  onClick={() => setIsPreviewOpen(true)}
                  type="button"
                >
                  View resume
                </button>
                <button
                  className={`${actionClassNames.secondary} w-full sm:w-auto`}
                  disabled={isBusy}
                  onClick={() => {
                    if (state.resume !== null) {
                      void handleDownload(state.resume);
                    }
                  }}
                  type="button"
                >
                  {pendingAction === "download"
                    ? "Downloading…"
                    : "Download original"}
                </button>
                <button
                  className={`${actionClassNames.danger} w-full sm:w-auto`}
                  disabled={isBusy}
                  onClick={() => void handleRemove()}
                  type="button"
                >
                  {pendingAction === "remove" ? "Removing…" : "Remove resume"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-control border border-dashed border-control/60 bg-canvas px-4 py-5 text-sm text-muted">
              No resume attached. Choose the PDF or DOCX you used to apply.
            </p>
          )}

          {isPreviewOpen && state.resume !== null ? (
            <ResumePreviewModal
              key={state.resume.id}
              onClose={() => setIsPreviewOpen(false)}
              resume={state.resume}
            />
          ) : null}

          <form
            aria-busy={pendingAction === "upload"}
            className="mt-5 border-t border-border pt-4"
            noValidate
            onSubmit={handleUpload}
          >
            <label
              className="text-sm font-semibold text-ink"
              htmlFor={fileInputId}
            >
              {state.resume !== null
                ? "Choose a replacement"
                : "Choose a resume"}
            </label>
            <p className="mt-1 text-xs text-muted" id={hintId}>
              PDF or DOCX, up to 4 MiB. One resume per application.
            </p>
            <input
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-describedby={`${hintId}${fileError !== null ? ` ${errorId}` : ""}`}
              aria-invalid={fileError !== null}
              className="mt-3 block min-h-11 w-full min-w-0 max-w-full rounded-control border border-control bg-surface p-2 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-canvas file:px-3 file:py-1 file:font-semibold file:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy}
              id={fileInputId}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                setSelectedFile(null);
                setFileError(null);
                setActionError(null);
                setSuccessMessage(null);

                if (file !== null) {
                  try {
                    validateResumeFile(file);
                    setSelectedFile(file);
                  } catch (error: unknown) {
                    setFileError(
                      errorMessage(error, "Choose a PDF or DOCX file."),
                    );
                  }
                }
              }}
              ref={fileInputRef}
              type="file"
            />
            {fileError !== null ? (
              <p
                className="mt-2 text-sm text-danger wrap-anywhere"
                id={errorId}
                role="alert"
              >
                {fileError}
              </p>
            ) : null}
            {selectedFile !== null ? (
              <p className="mt-2 font-data text-xs text-muted wrap-anywhere">
                Selected: {selectedFile.name} (
                {formatFileSize(selectedFile.size)})
              </p>
            ) : null}
            {state.resume !== null ? (
              <p className="mt-3 text-xs text-muted">
                Replacing removes the current file. Download it first if you
                need a copy.
              </p>
            ) : null}
            <button
              className={`${actionClassNames.primary} mt-3 w-full sm:w-auto`}
              disabled={isBusy || selectedFile === null}
              type="submit"
            >
              {pendingAction === "upload"
                ? "Uploading…"
                : state.resume !== null
                  ? "Replace resume"
                  : "Upload resume"}
            </button>
          </form>
        </>
      )}

      {actionError !== null ? (
        <div className="mt-4 rounded-control border border-danger/20 bg-danger/5 p-3 text-sm">
          <div className="text-danger wrap-anywhere" role="alert">
            <p>{actionError}</p>
            <p className="mt-1">
              Refresh the resume details before trying again.
            </p>
          </div>
          <button
            className={`${actionClassNames.secondary} mt-3`}
            disabled={isBusy}
            onClick={refreshResume}
            type="button"
          >
            Refresh resume details
          </button>
        </div>
      ) : null}
      <p
        aria-atomic="true"
        className="mt-3 text-sm font-semibold text-success"
        role="status"
      >
        {pendingAction === "upload"
          ? "Uploading resume. Keep this page open until it finishes."
          : pendingAction === "remove"
            ? "Removing resume…"
            : pendingAction === "download"
              ? "Preparing the original file…"
              : successMessage}
      </p>
    </section>
  );
}
