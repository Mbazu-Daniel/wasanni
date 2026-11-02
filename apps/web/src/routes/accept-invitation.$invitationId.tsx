import * as React from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { toastAuthError } from "@/lib/auth-error";
import { fetchSession } from "@/lib/session";
import { AuthFrame } from "@/components/auth/auth-frame";

export const Route = createFileRoute("/accept-invitation/$invitationId")({
  head: () => ({ meta: [{ title: "Accept your invitation · Wasanni" }] }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { invitationId } = useParams({ from: "/accept-invitation/$invitationId" });
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState<"accept" | "reject" | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 30_000,
  });

  async function accept() {
    setBusy("accept");
    const { data, error } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    setBusy(null);

    if (error || data === null) {
      toastAuthError(error, "Could not accept invitation");
      return;
    }

    const activation = await authClient.organization.setActive({
      organizationId: data.invitation.organizationId,
    });
    if (activation.error) {
      toastAuthError(activation.error, "Could not switch to the organization");
    }
    navigate({ to: "/" });
  }

  async function reject() {
    setBusy("reject");
    const { error } = await authClient.organization.rejectInvitation({
      invitationId,
    });
    setBusy(null);

    if (error) {
      toastAuthError(error, "Could not reject invitation");
      return;
    }

    navigate({ to: "/" });
  }

  if (session === null) {
    return (
      <AuthFrame accent="lime">
        <h1 className="auth-heading text-center">
          You're
          <br />
          <em>invited.</em>
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-ink/70">
          Sign in with the invited email to accept it.
        </p>
        <Link
          to="/sign-in"
          search={{ returnTo: `/accept-invitation/${invitationId}` }}
          className="launch-primary-button mt-8 w-full"
        >
          Sign in to accept
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame accent="lime">
      <h1 className="auth-heading text-center">
        You're
        <br />
        <em>invited.</em>
      </h1>
      <p className="mt-3 text-center text-sm leading-6 text-ink/70">
        Accept to join the organization. You can leave at any time.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <button
          type="button"
          className="launch-primary-button w-full"
          onClick={accept}
          disabled={busy !== null}
        >
          {busy === "accept" ? "Accepting…" : "Accept invitation"}
        </button>
        <button
          type="button"
          className="launch-outline-button w-full"
          onClick={reject}
          disabled={busy !== null}
        >
          {busy === "reject" ? "Rejecting…" : "Decline"}
        </button>
      </div>
    </AuthFrame>
  );
}
