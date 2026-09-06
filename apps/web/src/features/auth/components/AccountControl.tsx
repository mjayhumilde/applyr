import { useState } from "react";

import { actionClassNames } from "../../../shared/styles/actionStyles";
import { authClient } from "../api/auth-client";

type SignedInUser = typeof authClient.$Infer.Session.user;

interface AccountControlProps {
  user: Pick<SignedInUser, "name" | "email">;
}

export function AccountControl({ user }: AccountControlProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setErrorMessage("Unable to sign out. Please try again.");
        return;
      }

      // A fresh page clears any application data still held in React's memory.
      window.location.replace("/sign-in");
    } catch {
      setErrorMessage(
        "Unable to reach the server. Check your connection, then try signing out again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-w-0 w-full border-t border-border pt-3">
      <div className="grid min-w-0 gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="font-bold text-ink wrap-anywhere">{user.name}</p>
          <p className="text-xs text-muted wrap-anywhere">{user.email}</p>
        </div>
        <button
          className={`${actionClassNames.secondary} shrink-0`}
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {errorMessage && (
        <p className="mt-2 text-sm text-danger wrap-anywhere" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
