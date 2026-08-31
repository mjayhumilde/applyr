import { Link } from "react-router";

const NotFoundPage = () => {
  return (
    <section className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-600">
        The page you requested does not exist.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          to="/"
          className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
        >
          Go to overview
        </Link>
        <Link
          to="/applications"
          className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          View applications
        </Link>
      </div>
    </section>
  );
};

export default NotFoundPage;
