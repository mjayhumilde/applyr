type ActionVariant = "primary" | "secondary" | "danger";

const baseActionClassName =
  "inline-flex min-h-11 items-center justify-center rounded-control border px-4 py-2 text-sm font-bold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60";

export const actionClassNames = {
  primary: `${baseActionClassName} border-action bg-action text-white shadow-sm hover:border-action-hover hover:bg-action-hover`,
  secondary: `${baseActionClassName} border-border bg-surface text-ink hover:border-control hover:bg-canvas`,
  danger: `${baseActionClassName} border-danger bg-surface text-danger hover:bg-danger/10`,
} as const satisfies Record<ActionVariant, string>;
