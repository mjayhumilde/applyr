import type { CreateApplicationRequest } from "@applyr/contracts";
import { Link, useNavigate } from "react-router";

import { createApplication } from "../api/applications.api";
import { ApplicationForm } from "../components/ApplicationForm";

const NewApplicationPage = () => {
  const navigate = useNavigate();

  async function saveApplication(
    input: CreateApplicationRequest,
  ): Promise<void> {
    await createApplication(input);
    navigate("/applications", { replace: true });
  }

  return (
    <section className="mx-auto max-w-2xl p-6 sm:p-10">
      <Link
        to="/applications"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        Back to applications
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-gray-900">Add application</h1>

      <ApplicationForm onSubmit={saveApplication} />
    </section>
  );
};

export default NewApplicationPage;
