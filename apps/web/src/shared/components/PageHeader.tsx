import type { ReactNode } from "react";
import { Link, type To } from "react-router";

interface PageHeaderProps {
  actions?: ReactNode;
  backLink?: {
    label: string;
    to: To;
  };
  description?: string;
  title: string;
}

export function PageHeader({
  actions,
  backLink,
  description,
  title,
}: PageHeaderProps) {
  return (
    <header className="border-b border-border pb-5">
      {backLink && (
        <Link
          className="mb-3 inline-flex min-h-11 w-fit items-center gap-2 rounded-control text-sm font-bold text-action hover:text-action-hover"
          to={backLink.to}
        >
          <span aria-hidden="true">{"\u2190"}</span>
          {backLink.label}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
          )}
        </div>

        {actions && (
          <div className="grid w-full min-w-0 gap-3 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:items-center">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
