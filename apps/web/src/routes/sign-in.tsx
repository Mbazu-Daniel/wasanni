import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in · Wasanni" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { returnTo } = Route.useSearch();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Sign in failed");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
    navigate({ to: returnTo ?? "/" });
  }

  async function social(provider: "google" | "github") {
    await authClient.signIn.social({ provider, callbackURL: returnTo ?? "/" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="relative grid size-9 place-items-center rounded-lg bg-[linear-gradient(135deg,#ff2e88,#2e7bff)]">
            <span className="absolute inset-[2px] rounded-md bg-ink" />
            <span className="relative font-mono text-sm font-bold text-gradient-pink-blue">
              W
            </span>
          </span>
          <span className="font-display text-lg font-bold">Wasanni</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Pick how you want to continue.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => social("google")} disabled={busy}>
            <IconBrandGoogle className="size-4" />
            Google
          </Button>
          <Button variant="outline" onClick={() => social("github")} disabled={busy}>
            <IconBrandGithub className="size-4" />
            GitHub
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            or
          </span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/sign-up" className="text-blue-soft hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
