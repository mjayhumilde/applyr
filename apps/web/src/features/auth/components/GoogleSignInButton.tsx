import { useState } from "react";

import { authClient } from "../api/auth-client";
import googleIcon from "../assets/google-g.png";

interface GoogleSignInButtonProps {
  returnTo: string;
}

export function GoogleSignInButton({ returnTo }: GoogleSignInButtonProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn(): Promise<void> {
    if (isSigningIn) return;

    setIsSigningIn(true);
    setErrorMessage(null);

    // Google returns to Express first. These URLs then bring us back to React.
    const callbackURL = new URL(returnTo, window.location.origin);
    const errorCallbackURL = new URL("/sign-in", window.location.origin);
    errorCallbackURL.searchParams.set("returnTo", returnTo);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackURL.href,
        errorCallbackURL: errorCallbackURL.href,
      });

      if (result.error) {
        setErrorMessage("Unable to start Google sign-in. Please try again.");
      }
    } catch {
      setErrorMessage(
        "Unable to reach the sign-in service. Check your connection and try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-control border border-[#747775] bg-white px-3 py-2 font-[Roboto,Arial,sans-serif] text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f8faff] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSigningIn}
        onClick={handleSignIn}
        type="button"
      >
        <img src={googleIcon} alt="" className="size-5 shrink-0" />
        <span>
          {isSigningIn ? "Connecting to Google…" : "Continue with Google"}
        </span>
      </button>

      {isSigningIn && (
        <p className="text-sm text-muted" role="status">
          Opening Google sign-in…
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-danger wrap-anywhere" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
