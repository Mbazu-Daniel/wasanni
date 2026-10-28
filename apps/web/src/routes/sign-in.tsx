import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconBrandGithub,
  IconBrandGoogle,
  IconLock,
  IconMail,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { resumeLastOrganizationSlug } from "@/lib/session";
import { useSocialProviders } from "@/lib/auth-providers";
import { AuthField, AuthFrame, AuthSocial } from "@/components/auth/auth-frame";
import { looksLikeEmail } from "@/lib/utils";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in · Wasanni" }] }),
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
  component: SignInPage,
});

const providerIcons = {
  google: IconBrandGoogle,
  github: IconBrandGithub,
};

function SignInPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const providers = useSocialProviders();
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
    if (returnTo !== undefined) {
      navigate({ to: returnTo });
      return;
    }
    const slug = await resumeLastOrganizationSlug();
    if (slug === undefined) {
      navigate({ to: "/" });
      return;
    }
    if (slug === null) {
      navigate({ to: "/onboarding" });
      return;
    }
    navigate({ to: "/$orgSlug/overview", params: { orgSlug: slug } });
  }

  async function social(provider: "google" | "github") {
    await authClient.signIn.social({ provider, callbackURL: returnTo ?? "/" });
  }

  return (
    <AuthFrame
      switchTo={
        <>
          New to Wasanni?{" "}
          <Link to="/sign-up" className="ml-1 font-semibold text-blue hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <h1 className="auth-heading">
        Welcome
        <br />
        <em>back.</em>
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        Pick up where you left off — your organizations, builds and boards are
        waiting.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <AuthField
          id="email"
          label="Email"
          icon={IconMail}
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          valid={looksLikeEmail(email)}
          required
        />
        <AuthField
          id="password"
          label="Password"
          icon={IconLock}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          valid={password.length > 0}
          action={
            <Link
              to="/forgot-password"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.11em] text-blue hover:underline"
            >
              Forgot password?
            </Link>
          }
          required
        />
        <button type="submit" className="launch-primary-button w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {providers.length > 0 && (
        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink/15" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink/60">
            or
          </span>
          <div className="flex gap-2">
            {providers.map((provider) => (
              <AuthSocial
                key={provider}
                label={provider}
                icon={providerIcons[provider]}
                disabled={busy}
                onClick={() => void social(provider)}
              />
            ))}
          </div>
        </div>
      )}
    </AuthFrame>
  );
}
