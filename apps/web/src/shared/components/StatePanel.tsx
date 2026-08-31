import type { ReactNode } from "react";

import { actionClassNames } from "../styles/actionStyles";

interface RetryAction {
  label?: string;
  onClick: () => void;
}

type StatePanelProps =
  | {
      message: string;
      variant: "loading";
    }
  | {
      message: string;
      retry?: RetryAction;
      title?: string;
      variant: "error";
    }
  | {
      action?: ReactNode;
      message: string;
      title: string;
      variant: "empty";
    };

export function StatePanel(props: StatePanelProps) {
  if (props.variant === "loading") {
    return (
      <div
        className="rounded-panel border border-border bg-surface p-6 text-center shadow-panel"
        role="status"
      >
        <p className="font-medium text-muted">{props.message}</p>
      </div>
    );
  }

  const isError = props.variant === "error";

  return (
    <section
      className={`rounded-panel border p-6 text-center shadow-panel ${
        isError
          ? "border-danger/30 bg-danger/5"
          : "border-dashed border-control/60 bg-surface"
      }`}
    >
      <div role={isError ? "alert" : undefined}>
        <p
          className={`font-data text-xs font-semibold tracking-[0.12em] uppercase ${
            isError ? "text-danger" : "text-muted"
          }`}
        >
          {isError ? "Needs attention" : "No records"}
        </p>
        <h2 className="mt-2 text-xl font-bold text-ink">
          {isError ? (props.title ?? "Something went wrong") : props.title}
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted">
          {props.message}
        </p>
      </div>

      {isError && props.retry && (
        <button
          className={`${actionClassNames.secondary} mt-4`}
          onClick={props.retry.onClick}
          type="button"
        >
          {props.retry.label ?? "Try again"}
        </button>
      )}

      {!isError && props.action && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {props.action}
        </div>
      )}
    </section>
  );
}
