import { IconShieldLock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function AccessDenied({ role }: { role?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
          <IconShieldLock className="size-6" />
        </div>
        <h1 className="mt-6 text-xl font-semibold">You do not have access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {role
            ? `Your role is ${role}. That is not enough to see this page.`
            : "Ask the organization owner to invite you."}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => history.back()}>
          Go back
        </Button>
      </div>
    </div>
  );
}
