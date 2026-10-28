import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconArrowUpRight,
  IconBrandGithub,
  IconBrandGoogle,
  IconLock,
  IconMail,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useSocialProviders } from "@/lib/auth-providers";
import {
  AuthChecklist,
  AuthField,
  AuthFrame,
  AuthSocial,
} from "@/components/auth/auth-frame";
import { looksLikeEmail } from "@/lib/utils";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Sign up · Wasanni" }] }),
  component: SignUpPage,
});

const providerIcons = {
  google: IconBrandGoogle,
  github: IconBrandGithub,
};

function SignUpPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const providers = useSocialProviders();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] ?? email,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Could not create account");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
    navigate({ to: "/onboarding" });
  }

  async function social(provider: "google" | "github") {
    await authClient.signIn.social({ provider, callbackURL: "/onboarding" });
  }

  return (
    <AuthFrame
      accent="lime"
      switchTo={
        <>
          Already building with us?{" "}
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
        Start
        <br />
        <em>building.</em>
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        One account for every game you host — builds, sessions, leaderboards,
        tournaments. We use the name part of your email until you pick a
        display name.
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
        <div className="space-y-2">
          <AuthField
            id="password"
            label="Password"
            icon={IconLock}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            valid={password.length >= 8}
            minLength={8}
            required
          />
          <AuthChecklist
            items={[{ label: "8+ characters", ok: password.length >= 8 }]}
          />
        </div>
        <button type="submit" className="launch-primary-button w-full" disabled={busy}>
          {busy ? "Creating account…" : "Host your first game"}
          {!busy && <IconArrowUpRight className="size-5" />}
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

      <p className="launch-proof">
        <span className="launch-status-dot" /> PUBLIC BETA · NO CREDIT CARD · YOUR GAME, YOUR PLAYERS
      </p>
    </AuthFrame>
  );
}
