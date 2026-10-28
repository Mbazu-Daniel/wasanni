import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconLock } from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  AuthChecklist,
  AuthField,
  AuthFrame,
} from "@/components/auth/auth-frame";

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
    <AuthFrame accent="lime">
      <h1 className="auth-heading">
        New
        <br />
        <em>password.</em>
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        Choose a new password for your account.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <AuthField
            id="password"
            label="New password"
            icon={IconLock}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            valid={password.length >= 8}
            minLength={8}
            required
          />
          <AuthChecklist
            items={[
              { label: "8+ characters", ok: password.length >= 8 },
              { label: "Confirmed", ok: password.length >= 8 && password === confirm },
            ]}
          />
        </div>
        <AuthField
          id="confirm"
          label="Confirm"
          icon={IconLock}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          valid={confirm.length > 0 && confirm === password}
          minLength={8}
          required
        />
        <button type="submit" className="launch-primary-button w-full" disabled={busy || token === undefined}>
          {busy ? "Resetting…" : "Reset password"}
        </button>
      </form>

      {token === undefined && (
        <p className="mt-4 rounded-xl border border-pink/40 bg-pink/15 p-3 text-sm text-ink">
          This page needs the reset link from your email.
        </p>
      )}
    </AuthFrame>
  );
}
