import { Link } from "react-router";

import { PageHeader } from "../shared/components/PageHeader";
import { useDocumentTitle } from "../shared/hooks/useDocumentTitle";
import { actionClassNames } from "../shared/styles/actionStyles";

const NotFoundPage = () => {
  useDocumentTitle("Page not found");

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
        description="This page does not exist. Check the address, return to the overview, or view your applications."
        title="Page not found"
      />
    </section>
  );
};

export default NotFoundPage;
