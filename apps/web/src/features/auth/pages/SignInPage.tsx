import { Navigate, useSearchParams } from "react-router";

import { StatePanel } from "../../../shared/components/StatePanel";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { authClient } from "../api/auth-client";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { signInSearchParamsSchema } from "../schemas/signInSearchParams";

export default function SignInPage() {
  useDocumentTitle("Sign in");

  const [searchParams] = useSearchParams();
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const { returnTo, error: callbackError } = signInSearchParamsSchema.parse({
    returnTo: searchParams.get("returnTo"),
    error: searchParams.get("error"),
  });

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

  if (session) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <section
      aria-labelledby="sign-in-title"
      className="mx-auto my-6 max-w-md rounded-panel border border-border bg-surface p-6 shadow-panel sm:my-12 sm:p-8"
    >
      <p className="font-data text-xs font-semibold text-action">
        Your next opportunity starts here
      </p>
      <h1 id="sign-in-title" className="mt-3 text-3xl font-bold text-ink">
        Sign in to Applyr
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Keep track of job applications, interviews, and follow-ups in one place.
        Use your Google account to get started or pick up where you left off.
      </p>

      {callbackError && (
        <p
          className="mt-6 rounded-control border border-danger/30 bg-danger/5 p-3 text-sm text-danger wrap-anywhere"
          role="alert"
        >
          {callbackError === "access_denied"
            ? "Google sign-in was canceled. Choose Continue with Google to try again."
            : "Google sign-in could not be completed. Please try again. If it keeps failing, contact the app owner."}
        </p>
      )}

      <div className="mt-6">
        <GoogleSignInButton returnTo={returnTo} />
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        No separate Applyr password needed.
      </p>
    </section>
  );
}
