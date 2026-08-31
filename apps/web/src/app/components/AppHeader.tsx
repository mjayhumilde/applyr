import { Link, NavLink, type NavLinkRenderProps } from "react-router";

const navigationLinkClassName = ({ isActive }: NavLinkRenderProps): string => {
  const baseClassName =
    "inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap border-b-2 px-2 text-[0.8125rem] sm:w-auto sm:px-3 sm:text-sm";

  return isActive
    ? `${baseClassName} border-action font-bold text-ink`
    : `${baseClassName} border-transparent font-medium text-muted hover:border-border hover:text-ink`;
};

export function AppHeader() {
  return (
    <>
      <a
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 font-semibold text-white focus:fixed focus:top-4 focus:left-4 focus:not-sr-only"
        href="#main-content"
      >
        Skip to content
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-4xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-6 py-3 sm:flex sm:px-10">
          <Link
            className="flex min-h-11 shrink-0 items-center gap-3 rounded-control text-ink"
            to="/"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-control bg-ink text-white shadow-panel"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="12" r="2" fill="currentColor" />
                <circle
                  cx="12"
                  cy="12"
                  r="2"
                  fill="currentColor"
                  opacity="0.4"
                />
                <circle
                  cx="19"
                  cy="12"
                  r="2"
                  fill="currentColor"
                  opacity="0.4"
                />
                <path
                  d="M7 12h3M14 12h3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="flex flex-col">
              <span className="font-display text-xl leading-none font-bold tracking-[-0.04em]">
                Applyr
              </span>
              <span className="mt-1 hidden font-data text-[0.625rem] leading-none font-semibold tracking-[0.16em] text-muted uppercase sm:block">
                JOB APPLICATIONS TRACKER
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="order-3 col-span-2 w-full border-t border-border pt-3 sm:order-0 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0"
          >
            <ul className="grid grid-cols-2 gap-1 sm:flex sm:items-center">
              <li>
                <NavLink className={navigationLinkClassName} end to="/">
                  Overview
                </NavLink>
              </li>
              <li>
                <NavLink className={navigationLinkClassName} to="/applications">
                  Applications
                </NavLink>
              </li>
            </ul>
          </nav>

          <Link
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-control bg-action px-3 text-[0.8125rem] font-bold text-white shadow-sm hover:bg-action-hover sm:text-sm"
            to="/applications/new"
          >
            Add application
          </Link>
        </div>
      </header>
    </>
  );
}
