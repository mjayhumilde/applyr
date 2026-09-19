import type { Resume } from "@applyr/contracts";
import type { HElement } from "docx-preview";
import { useEffect, useRef, useState } from "react";

import { actionClassNames } from "../../../shared/styles/actionStyles";
import { getResumeFile } from "../api/resumes.api";

interface ResumePreviewProps {
  resume: Resume;
  onClose: () => void;
}

type PreviewState =
  | { status: "loading" }
  | { status: "pdf"; objectUrl: string }
  | { status: "docx"; blob: Blob }
  | { status: "error"; message: string };

const docxFrameDocument = `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob: data:; font-src blob: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Resume document preview</title>
<style>
  html { color-scheme: light; background: #f3f6fa; }
  body { margin: 0; }
  .docx-wrapper { padding: 16px !important; width: fit-content; min-width: 100%; box-sizing: border-box; }
  .docx-wrapper > section.docx { margin-bottom: 16px !important; }
  a { pointer-events: none; }
</style>
</head><body><div id="resume-styles"></div><main id="resume-document" aria-label="Resume document"></main></body></html>`;

function createFrameNode(
  frameDocument: Document,
  value: HElement | Node | string,
): Node {
  if (typeof value === "string") {
    return frameDocument.createTextNode(value);
  }

  if ("nodeType" in value) {
    return frameDocument.adoptNode(value as Node);
  }

  const { ns, tagName, className, style, children, ...attributes } = value;
  if (tagName === "#comment") {
    return frameDocument.createComment(String(children?.[0] ?? ""));
  }
  if (tagName === "#fragment") {
    const fragment = frameDocument.createDocumentFragment();
    children?.forEach((child) =>
      fragment.appendChild(createFrameNode(frameDocument, child)),
    );
    return fragment;
  }

  if (/^(script|iframe|object|embed|link|meta|form)$/i.test(tagName)) {
    return frameDocument.createTextNode("");
  }

  const element = ns
    ? frameDocument.createElementNS(ns, tagName)
    : frameDocument.createElement(tagName);

  if (className) {
    element.setAttribute("class", className);
  }
  if (typeof style === "string") {
    element.setAttribute("style", style);
  } else if (style) {
    Object.assign((element as HTMLElement | SVGElement).style, style);
  }

  for (const [name, attribute] of Object.entries(attributes)) {
    if (
      !/^(on|href$|src$|srcdoc$|innerhtml$|outerhtml$)/i.test(name) &&
      (typeof attribute === "string" || typeof attribute === "number")
    ) {
      element.setAttribute(name, String(attribute));
    }
  }
  children?.forEach((child) =>
    element.appendChild(createFrameNode(frameDocument, child)),
  );
  return element;
}

function DocxPreview({
  blob,
  fileName,
  onClose,
}: {
  blob: Blob;
  fileName: string;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!frameReady) {
      return;
    }

    const frameDocument = iframeRef.current?.contentDocument;
    // Keyboard events in an iframe do not bubble to the surrounding dialog.
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    frameDocument?.addEventListener("keydown", closeOnEscape);
    return () => frameDocument?.removeEventListener("keydown", closeOnEscape);
  }, [frameReady, onClose]);

  useEffect(() => {
    if (!frameReady) {
      return;
    }

    const frameDocument = iframeRef.current?.contentDocument;
    const bodyContainer = frameDocument?.getElementById("resume-document");
    const styleContainer = frameDocument?.getElementById("resume-styles");
    let cancelled = false;

    function preventNavigation(event: MouseEvent): void {
      event.preventDefault();
    }

    // The scriptless sandbox also blocks popups, forms and top-level navigation.
    frameDocument?.addEventListener("click", preventNavigation, true);

    async function renderDocument(): Promise<void> {
      try {
        if (!frameDocument || !bodyContainer || !styleContainer) {
          throw new Error("The preview frame is unavailable");
        }

        const { renderAsync } = await import("docx-preview");
        if (cancelled) {
          return;
        }

        await renderAsync(blob, bodyContainer, styleContainer, {
          renderAltChunks: false,
          ignoreFonts: true,
          useBase64URL: true,
          experimental: false,
          // Construct nodes in the restricted document, including before insertion.
          h: (element) => createFrameNode(frameDocument, element),
        });

        if (cancelled) {
          return;
        }

        bodyContainer.querySelectorAll("a, area").forEach((link) => {
          link.removeAttribute("href");
          link.removeAttribute("xlink:href");
          link.setAttribute("tabindex", "-1");
        });
        bodyContainer
          .querySelectorAll("iframe, object, embed, script, link, form")
          .forEach((element) => element.remove());
        setState("ready");
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    void renderDocument();

    return () => {
      cancelled = true;
      frameDocument?.removeEventListener("click", preventNavigation, true);
      bodyContainer?.replaceChildren();
      styleContainer?.replaceChildren();
    };
  }, [blob, frameReady]);

  return (
    <>
      {state === "loading" ? (
        <p className="mb-3 text-sm text-muted" role="status">
          Preparing DOCX preview…
        </p>
      ) : state === "error" ? (
        <p className="text-sm text-danger" role="alert">
          This document could not be previewed. Use Download original to open it
          on your device.
        </p>
      ) : null}
      <iframe
        className={
          state === "ready"
            ? "min-h-0 w-full flex-1 rounded-control border border-border bg-canvas"
            : "hidden"
        }
        onLoad={() => setFrameReady(true)}
        ref={iframeRef}
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin"
        srcDoc={docxFrameDocument}
        title={`Resume preview: ${fileName}`}
      />
    </>
  );
}

export function ResumePreview({ resume, onClose }: ResumePreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const { applicationId, id, mediaType, byteSize } = resume;

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function loadPreview(): Promise<void> {
      try {
        const blob = await getResumeFile(
          { applicationId, id },
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }

        if (blob.type !== mediaType || blob.size !== byteSize) {
          throw new Error(
            "The resume changed. Refresh its details to view the latest file.",
          );
        }

        if (mediaType === "application/pdf") {
          objectUrl = URL.createObjectURL(blob);
          setState({ status: "pdf", objectUrl });
        } else {
          setState({ status: "docx", blob });
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load the preview.",
          });
        }
      }
    }

    void loadPreview();

    return () => {
      controller.abort();
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [applicationId, id, mediaType, byteSize, requestVersion]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
      <p className="mb-3 shrink-0 text-xs leading-relaxed text-muted">
        {mediaType === "application/pdf"
          ? "Use Close to exit the preview. If your browser cannot display this PDF, use Download original."
          : "DOCX formatting may vary. Scroll inside the preview to see the full page, or download the original for the exact layout."}
      </p>
      {state.status === "loading" ? (
        <p className="text-sm text-muted" role="status">
          Loading resume preview…
        </p>
      ) : state.status === "error" ? (
        <div>
          <p className="text-sm text-danger wrap-anywhere" role="alert">
            {state.message}
          </p>
          <button
            className={`${actionClassNames.secondary} mt-3`}
            onClick={() => {
              setState({ status: "loading" });
              setRequestVersion((version) => version + 1);
            }}
            type="button"
          >
            Retry preview
          </button>
        </div>
      ) : state.status === "pdf" ? (
        <iframe
          className="min-h-0 w-full flex-1 rounded-control border border-border bg-canvas"
          referrerPolicy="no-referrer"
          src={state.objectUrl}
          title={`Resume preview: ${resume.fileName}`}
        />
      ) : (
        <DocxPreview
          blob={state.blob}
          fileName={resume.fileName}
          onClose={onClose}
        />
      )}
    </div>
  );
}
