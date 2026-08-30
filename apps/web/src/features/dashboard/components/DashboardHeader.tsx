import { Link } from "react-router";

export function DashboardHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          A quick view of your application pipeline.
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          to="/applications"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View applications
        </Link>
        <Link
          to="/applications/new"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add application
        </Link>
      </div>
    </header>
  );
}
