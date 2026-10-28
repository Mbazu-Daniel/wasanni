import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconArrowUpRight,
  IconBuilding,
  IconLogout,
  IconPhoto,
  IconTag,
  IconUser,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { api, apiFetch } from "@/lib/api-client";
import { fetchOrganizations, fetchSession, pickOrganization, requireSession } from "@/lib/session";
import { slugify } from "@/lib/utils";
import type { MemberRow } from "@/lib/member-types";
import { AVATAR_TYPES, uploadMemberAvatar } from "@/lib/avatar-upload";
import { AuthField, AuthFrame } from "@/components/auth/auth-frame";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your workspace · Wasanni" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    await requireSession();
  },
  component: OnboardingPage,
});

type CreatedOrg = { id: string; name: string; slug: string };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function initials(value: string): string {
  const letters = value.trim().replace(/[^a-zA-Z0-9 ]/g, "").split(/\s+/);

  return (
    (letters.length > 1
      ? letters[0]!.charAt(0) + letters[1]!.charAt(0)
      : value.trim().slice(0, 2)) || "W"
  ).toUpperCase();
}

function isUsableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function StepTabs({ step }: { step: 1 | 2 }) {
  const tabs = [
    { number: "01", label: "Organization" },
    { number: "02", label: "Your profile" },
  ];

  return (
    <ol className="flex items-center gap-2" aria-label="Onboarding progress">
      {tabs.map((tab, index) => {
        const tabStep = (index + 1) as 1 | 2;
        const state = tabStep === step ? "active" : tabStep < step ? "done" : "todo";

        return (
          <li key={tab.number}>
            {index > 0 && <span aria-hidden="true" className="mr-2 text-ink/40">→</span>}
            <span
              aria-current={state === "active" ? "step" : undefined}
              className={
                state === "active"
                  ? "rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.11em] text-cyan"
                  : "rounded-full border border-ink/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.11em] text-ink/50"
              }
            >
              {tab.number} {tab.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [touchedSlug, setTouchedSlug] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [org, setOrg] = React.useState<CreatedOrg | null>(null);
  const [memberName, setMemberName] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  React.useEffect(() => {
    void (async () => {
      const organizations = await fetchOrganizations();
      if (organizations.length === 0) return;

      const session = await fetchSession();
      const lastSlug = localStorage.getItem("wasanni:last-org");
      const target = pickOrganization(
        organizations,
        session?.session.activeOrganizationId,
        lastSlug,
      );
      if (target === undefined) return;

      await authClient.organization.setActive({ organizationId: target.id });
      localStorage.setItem("wasanni:last-org", target.slug);
      navigate({ to: "/$orgSlug/overview", params: { orgSlug: target.slug } });
    })();
  }, [navigate]);

  React.useEffect(() => {
    if (org === null) return;

    void (async () => {
      try {
        const { member } = await apiFetch<{ member: MemberRow }>(
          `/api/v1/organizations/${org.id}/members/me`,
        );
        setMemberName(member.name);
        if (member.avatar !== null) setAvatarUrl(member.avatar);
      } catch {}
    })();
  }, [org]);

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.organization.create({
      name,
      slug,
      logo: logo.trim() || null,
    });
    setBusy(false);

    if (error || data === null) {
      toast.error(error?.message ?? "Could not create organization");
      return;
    }

    await authClient.organization.setActive({ organizationId: data.id });
    localStorage.setItem("wasanni:last-org", data.slug);
    queryClient.setQueryData<CreatedOrg[]>(["organizations"], (current = []) => [
      ...current.filter((item) => item.id !== data.id),
      { id: data.id, name: data.name, slug: data.slug },
    ]);
    setOrg({ id: data.id, name: data.name, slug: data.slug });
    setStep(2);
  }

  async function uploadAvatar(file: File) {
    if (org === null) return;

    setAvatarBusy(true);
    try {
      const saved = await uploadMemberAvatar(org.id, file);
      setAvatarUrl(saved.avatar);
      toast.success("Avatar saved.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The avatar upload failed. Pick the image and try again.",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function finish(event: React.FormEvent) {
    event.preventDefault();
    if (org === null) return;

    setBusy(true);
    const wanted = memberName.trim();
    if (wanted.length > 0) {
      try {
        await api.patch(`/api/v1/organizations/${org.id}/members/me`, {
          name: wanted,
        });
      } catch {
        setBusy(false);
        toast.error("Could not save your name. Try again, or enter the dashboard without it.");
        return;
      }
    }
    setBusy(false);
    navigate({ to: "/$orgSlug/overview", params: { orgSlug: org.slug } });
  }

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    navigate({ to: "/" });
  }

  const logoTrimmed = logo.trim();

  const previewPanel = (
    <aside className="auth-panel relative hidden h-full flex-col justify-center gap-6 overflow-hidden px-8 py-10 lg:flex">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 size-36 rotate-12 border-2 border-(--launch-coral)"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -left-8 size-28 rounded-full border-2 border-(--launch-lime)"
      />
      <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--launch-paper)/60">
        {step === 1 ? "Your org card" : "Your member card"}
      </p>
      {step === 1 ? (
        <div className="relative w-full max-w-[300px] -rotate-2 rounded-xl border-2 border-(--launch-ink) bg-(--launch-paper-bright) p-4 shadow-[6px_6px_0_var(--launch-coral)]">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-(--launch-ink) bg-(--launch-lime) font-poster text-lg font-black text-(--launch-ink)">
              {logoTrimmed.length > 0 && isUsableUrl(logoTrimmed) ? (
                <img
                  src={logoTrimmed}
                  alt=""
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                initials(name || "W")
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-poster text-base font-black text-(--launch-ink)">
                {name.trim() || "Your organization"}
              </p>
              <p className="truncate font-mono text-xs text-(--launch-ink)/60">
                wasanni.com/{slug || "your-team"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-[300px] rotate-1 rounded-xl border-2 border-(--launch-ink) bg-(--launch-paper-bright) p-4 shadow-[6px_6px_0_var(--launch-lime)]">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-(--launch-ink) bg-(--launch-lime) font-poster text-lg font-black text-(--launch-ink)">
              {avatarUrl !== null ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(memberName || name || "W")
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-poster text-base font-black text-(--launch-ink)">
                {memberName.trim() || "Your name"}
              </p>
              <p className="truncate font-mono text-xs text-(--launch-ink)/60">
                Member · {org?.name ?? name}
              </p>
            </div>
          </div>
        </div>
      )}
      <p className="relative text-sm leading-6 text-(--launch-paper)/75">
        {step === 1
          ? "This is how your workspace appears in the org switcher once you are in."
          : "Teammates see this on the member list. It lives on your membership."}
      </p>
    </aside>
  );

  return (
    <AuthFrame
      accent="lime"
      panel={previewPanel}
      aside={
        <button
          type="button"
          onClick={() => void signOut()}
          className="launch-sign-in inline-flex items-center gap-1.5"
        >
          <IconLogout className="size-3.5" />
          Sign out
        </button>
      }
    >
      <StepTabs step={step} />

      {step === 1 && (
        <>
          <h1 className="auth-heading mt-6">
            Set up your
            <br />
            <em>organization.</em>
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            An organization is your team. Every game, platform, key and session
            lives inside one.
          </p>

          <form onSubmit={createOrganization} className="mt-8 space-y-4">
            <AuthField
              id="org-name"
              label="Name"
              icon={IconBuilding}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pixel Forge"
              maxLength={80}
              autoFocus
              valid={name.trim().length > 0}
              required
            />
            <AuthField
              id="org-slug"
              label="Slug"
              icon={IconTag}
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setTouchedSlug(true);
              }}
              placeholder="pixel-forge"
              className="font-mono"
              valid={SLUG_PATTERN.test(slug)}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <AuthField
              id="org-logo"
              label="Logo URL — optional"
              icon={IconPhoto}
              type="url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://…/logo.png"
              valid={logoTrimmed.length > 0 && isUsableUrl(logoTrimmed)}
            />
            <button type="submit" className="launch-primary-button w-full" disabled={busy || !name || !slug}>
              {busy ? "Creating…" : "Continue to profile"}
              {!busy && <IconArrowUpRight className="size-5" />}
            </button>
          </form>

          <ol className="mt-8 space-y-2">
            {["Add a platform and give it an API key.", "Create a game and assign it to that platform.", "Open your first session from your own server."].map(
              (line, index) => (
                <li key={line} className="flex gap-2.5 text-sm text-ink/70">
                  <span className="font-mono text-xs font-bold text-pink">
                    0{index + 1}
                  </span>
                  {line}
                </li>
              ),
            )}
          </ol>
        </>
      )}

      {step === 2 && org !== null && (
        <>
          <h1 className="auth-heading mt-6">
            Make your
            <br />
            <em>profile.</em>
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            This is how teammates see you inside {org.name} — on the member
            list and in the org switcher. It lives on your membership, not your
            login.
          </p>

          <form onSubmit={finish} className="mt-8 space-y-4">
            <div className="flex items-center gap-4">
              <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-ink bg-cyan font-poster text-3xl font-black text-ink">
                {avatarUrl !== null ? (
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initials(memberName || name || "W")
                )}
              </span>
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept={AVATAR_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file !== undefined) void uploadAvatar(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="launch-outline-button"
                  onClick={() => fileInput.current?.click()}
                  disabled={avatarBusy}
                >
                  {avatarBusy ? "Uploading…" : avatarUrl !== null ? "Change image" : "Choose image"}
                </button>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.11em] text-ink/60">
                  JPEG · PNG · WEBP · AVIF · max 5 MB
                </p>
              </div>
            </div>
            <AuthField
              id="profile-name"
              label="Name"
              icon={IconUser}
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Daniel"
              maxLength={80}
              valid={memberName.trim().length > 0}
            />
            <button type="submit" className="launch-primary-button w-full" disabled={busy || avatarBusy}>
              {busy ? "Saving…" : "Enter dashboard"}
              {!busy && <IconArrowUpRight className="size-5" />}
            </button>
          </form>

          <p className="launch-proof">
            <span className="launch-status-dot" /> YOU CAN CHANGE THIS LATER IN ORGANIZATION SETTINGS
          </p>
        </>
      )}
    </AuthFrame>
  );
}
