import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sent
            ? "If that email exists, we sent a reset link. Check your inbox."
            : "Enter your email and we will send you a reset link."}
        </p>

        {!sent && (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@studio.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
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
