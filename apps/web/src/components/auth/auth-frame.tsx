import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  IconCheck,
  IconEye,
  IconEyeOff,
  IconSwords,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { Label } from "@/components/ui/label";

export function AuthWordmark() {
  return (
    <Link to="/" className="launch-wordmark" aria-label="Wasanni home">
      <span className="launch-mark">W</span>
      <span>Wasanni</span>
    </Link>
  );
}

type Icon = React.ComponentType<{ className?: string; stroke?: number }>;

function BrandPanel() {
  return (
    <div className="auth-panel relative hidden h-full flex-col justify-between overflow-hidden px-9 py-10 lg:flex">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-14 size-44 rotate-12 border-2 border-(--launch-lime) bg-(--launch-lime)"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -left-10 size-36 rounded-full border-2 border-(--launch-coral)"
      />
      <p className="auth-heading relative text-(--launch-paper)">
        Games
        <br />
        <em>run here.</em>
      </p>
      <div className="relative mt-8 space-y-3">
        <div className="w-fit -rotate-2 rounded-xl border-2 border-(--launch-ink) bg-(--launch-paper-bright) px-4 py-3 shadow-[5px_5px_0_var(--launch-coral)]">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.11em] text-(--launch-ink)/60">
            Your org
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-(--launch-ink)">
            wasanni.com/your-team
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(
            [
              ["games", IconSwords, "bg-(--launch-purple) text-(--launch-paper)"],
              ["trophy", IconTrophy, "bg-(--launch-coral) text-(--launch-ink)"],
              ["users", IconUsers, "bg-(--launch-lime) text-(--launch-ink)"],
            ] as [string, Icon, string][]
          ).map(([key, PanelIcon, tone]) => (
            <span
              key={key}
              className={`grid size-11 place-items-center rounded-full border-2 border-(--launch-ink) ${tone}`}
            >
              <PanelIcon className="size-5" />
            </span>
          ))}
          <p className="pl-1 text-sm leading-5 text-(--launch-paper)/75">
            Builds, sessions, brackets and teammates — one workspace.
          </p>
        </div>
      </div>
      <p className="relative flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--launch-paper)/70">
        <span className="size-2 rounded-full bg-(--launch-lime)" />
        Public beta · No credit card
      </p>
    </div>
  );
}

export function AuthFrame({
  accent = "coral",
  aside,
  switchTo,
  panel,
  children,
}: {
  accent?: "coral" | "lime";
  aside?: React.ReactNode;
  switchTo?: React.ReactNode;
  panel?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page launchpad relative grid min-h-screen place-items-start overflow-x-clip px-4 py-8 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[4%] top-24 hidden size-[130px] rounded-full border-2 border-pink xl:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-16 right-[4%] hidden size-[80px] rotate-45 border-2 border-cyan xl:block"
      />
      <div className="z-[2] mb-7 flex w-full max-w-5xl items-center justify-between">
        <AuthWordmark />
        {aside}
      </div>
      <main
        className={`auth-card relative z-[2] mx-auto grid w-full max-w-5xl overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px] ${
          accent === "lime" ? "auth-card-lime" : ""
        }`}
      >
        <section className="p-7 sm:p-10">
          {switchTo !== undefined && (
            <div className="mb-7 flex justify-end text-sm text-ink/70">
              {switchTo}
            </div>
          )}
          {children}
        </section>
        {panel ?? <BrandPanel />}
      </main>
    </div>
  );
}

export function AuthField({
  id,
  label,
  action,
  icon: FieldIcon,
  valid = false,
  type = "text",
  ...inputProps
}: {
  id: string;
  label: string;
  action?: React.ReactNode;
  icon: Icon;
  valid?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [reveal, setReveal] = React.useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      <div className="auth-field" data-valid={valid ? "yes" : "no"}>
        <FieldIcon aria-hidden="true" className="size-4 shrink-0 text-ink/45" stroke={2} />
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          {...inputProps}
        />
        {valid && (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cyan">
            <IconCheck aria-hidden="true" className="size-3.5 text-ink" stroke={3} />
          </span>
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((current) => !current)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="shrink-0 text-ink/45 transition-colors hover:text-ink"
          >
            {reveal ? (
              <IconEyeOff aria-hidden="true" className="size-4" />
            ) : (
              <IconEye aria-hidden="true" className="size-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthChecklist({
  items,
}: {
  items: { label: string; ok: boolean }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li
          key={item.label}
          className={
            item.ok
              ? "flex items-center gap-1.5 font-mono text-[11px] font-bold text-ink"
              : "flex items-center gap-1.5 font-mono text-[11px] text-ink/45"
          }
        >
          {item.ok ? (
            <IconCheck aria-hidden="true" className="size-3.5 text-pink" stroke={3} />
          ) : (
            <span
              aria-hidden="true"
              className="size-3.5 shrink-0 rounded-full border-[1.5px] border-ink/25"
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function AuthSocial({
  label,
  icon: SocialIcon,
  ...buttonProps
}: {
  label: string;
  icon: Icon;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={`Continue with ${label}`}
      title={`Continue with ${label}`}
      className="auth-social"
      {...buttonProps}
    >
      <SocialIcon aria-hidden="true" className="size-5" />
    </button>
  );
}
