import { Link } from "react-router";

import { PageHeader } from "../shared/components/PageHeader";
import { useDocumentTitle } from "../shared/hooks/useDocumentTitle";
import { actionClassNames } from "../shared/styles/actionStyles";

const NotFoundPage = () => {
  useDocumentTitle("Page Not Found");

  return (
    <section className="mx-auto max-w-xl">
      <PageHeader
        actions={
          <>
            <Link className={actionClassNames.primary} to="/">
              Go to overview
            </Link>
            <Link className={actionClassNames.secondary} to="/applications">
              View applications
            </Link>
          </>
        }
        description="The page you requested does not exist."
        title="Page not found"
      />
    </section>
  );
};

export default NotFoundPage;
