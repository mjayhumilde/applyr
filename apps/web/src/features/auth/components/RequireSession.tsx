import { Navigate, Outlet, useLocation } from "react-router";

import { StatePanel } from "../../../shared/components/StatePanel";
import { authClient } from "../api/auth-client";

export function RequireSession() {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return <StatePanel variant="loading" message="Checking your session…" />;
  }

  if (error) {
    return (
      <StatePanel
        variant="error"
        title="Unable to check your session"
        message="Check your connection and try again. If this keeps happening locally, make sure the API server is running."
        retry={{ onClick: () => void refetch() }}
      />
    );
  }

  if (!session) {
    const searchParams = new URLSearchParams({
      returnTo: `${location.pathname}${location.search}${location.hash}`,
    });

    return <Navigate to={`/sign-in?${searchParams}`} replace />;
  }

  // Switching accounts must not reuse the previous user's page state.
  return <Outlet key={session.user.id} />;
}
