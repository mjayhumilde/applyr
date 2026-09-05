import type { CreateApplicationRequest } from "@applyr/contracts";
import { useNavigate } from "react-router";

import { PageHeader } from "../../../shared/components/PageHeader";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { createApplication } from "../api/applications.api";
import { ApplicationForm } from "../components/ApplicationForm";

const NewApplicationPage = () => {
  const navigate = useNavigate();

  useDocumentTitle("Add application");

  async function saveApplication(
    input: CreateApplicationRequest,
  ): Promise<void> {
    const createdApplication = await createApplication(input);

    navigate(`/applications/${createdApplication.id}`, {
      replace: true,
      state: { saveResult: "created" },
    });
  }

  return (
    <section className="mx-auto max-w-2xl">
      <PageHeader
        backLink={{ label: "Back to applications", to: "/applications" }}
        description="Record the role and tracking details for this opportunity."
        title="Add application"
      />

      <ApplicationForm onSubmit={saveApplication} />
    </section>
  );
};

export default NewApplicationPage;
