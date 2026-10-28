import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { IconMail } from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthField, AuthFrame } from "@/components/auth/auth-frame";
import { looksLikeEmail } from "@/lib/utils";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password · Wasanni" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not send the email");
      return;
    }

    setSent(true);
  }

  return (
    <AuthFrame
      switchTo={
        <>
          Remembered it?{" "}
          <Link
            to="/sign-in"
            search={{ returnTo: undefined }}
            className="ml-1 font-semibold text-blue hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <h1 className="auth-heading">
        Reset your
        <br />
        <em>password.</em>
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        {sent
          ? "If that email exists, we sent a reset link. Check your inbox."
          : "Enter your email and we will send you a reset link."}
      </p>

      {!sent && (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <AuthField
            id="email"
            label="Email"
            icon={IconMail}
            type="email"
            autoComplete="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            valid={looksLikeEmail(email)}
            required
          />
          <button type="submit" className="launch-primary-button w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      {sent && (
        <button
          type="button"
          className="launch-outline-button mt-8 w-full"
          onClick={() => setSent(false)}
        >
          Use a different email
        </button>
      )}
    </AuthFrame>
  );
}
