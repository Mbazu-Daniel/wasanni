import * as React from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { fetchSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/accept-invitation/$id")({
  head: () => ({ meta: [{ title: "Accept your invitation · Wasanni" }] }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { id } = useParams({ from: "/accept-invitation/$id" });
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
      invitationId: id,
    });
    setBusy(null);

    if (error || data === null) {
      toast.error(error?.message ?? "Could not accept invitation");
      return;
    }

    await authClient.organization.setActive({
      organizationId: data.invitation.organizationId,
    });
    navigate({ to: "/" });
  }

  async function reject() {
    setBusy("reject");
    const { error } = await authClient.organization.rejectInvitation({
      invitationId: id,
    });
    setBusy(null);

    if (error) {
      toast.error(error.message ?? "Could not reject invitation");
      return;
    }

    navigate({ to: "/" });
  }

  if (session === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-5">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            You have an invitation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the invited email to accept it.
          </p>
          <Button className="mt-6" as-child={false}>
            <Link
              to="/sign-in"
              search={{ returnTo: `/accept-invitation/${id}` }}
              className="text-primary-foreground"
            >
              Sign in to accept
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">You have an invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accept to join the organization. You can leave at any time.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button variant="ghost" onClick={reject} disabled={busy !== null}>
            {busy === "reject" ? "Rejecting…" : "Decline"}
          </Button>
          <Button onClick={accept} disabled={busy !== null}>
            {busy === "accept" ? "Accepting…" : "Accept invitation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
