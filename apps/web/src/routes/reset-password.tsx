import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password · Wasanni" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
    callbackURL: typeof search.callbackURL === "string" ? search.callbackURL : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    if (token === undefined) {
      toast.error("Reset token is missing");
      return;
    }

    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not reset password");
      return;
    }

    toast.success("Password reset. Sign in with the new password.");
    navigate({ to: "/sign-in", search: { returnTo: undefined } });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || token === undefined}>
            {busy ? "Resetting…" : "Reset password"}
          </Button>
        </form>

        {token === undefined && (
          <p className="mt-3 text-sm text-amber-300">
            This page needs the reset link from your email.
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            to="/sign-in"
            search={{ returnTo: undefined }}
            className="text-blue-soft hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
