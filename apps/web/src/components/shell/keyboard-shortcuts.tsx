import * as React from "react";
import {
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";

export const PAGE_SHORTCUTS: Record<string, string> = {
  overview: "d",
  games: "g",
  templates: "t",
  platforms: "p",
  assignments: "a",
  keys: "k",
  webhooks: "w",
  tournaments: "o",
  matches: "m",
  audit: "u",
  usage: "v",
  developer: "f",
  members: "e",
  organization: "r",
  account: "c",
  danger: "x",
};

const GO_TARGETS: Record<string, string> = {
  d: "overview",
  g: "games",
  t: "templates",
  p: "platforms",
  a: "assignments",
  k: "keys",
  w: "webhooks",
  o: "tournaments",
  m: "matches",
  u: "audit",
  v: "usage",
  f: "developer",
  e: "settings/members",
  r: "settings/organization",
  c: "settings/account",
  x: "settings/danger",
};

const CREATE_TARGETS: Record<string, string> = {
  games: "games/new",
  templates: "templates/new",
  platforms: "platforms/new",
  tournaments: "tournaments/new",
  matches: "matches/new",
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName.toLowerCase();

  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export function useDashboardShortcuts({
  togglePalette,
  openPalette,
  openHelp,
}: {
  togglePalette: () => void;
  openPalette: () => void;
  openHelp: () => void;
}) {
  const navigate = useNavigate();
  const { orgSlug } = useParams({ from: "/o/$orgSlug" });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const [pendingGo, setPendingGo] = React.useState(false);
  const sequenceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const go = React.useCallback(
    (segment: string) => {
      navigate({
        to: `/o/$orgSlug/${segment}` as never,
        params: { orgSlug } as never,
      });
    },
    [navigate, orgSlug],
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.altKey) return;

      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === "k") {
          event.preventDefault();
          togglePalette();
        }
        return;
      }

      if (isTyping(event.target)) return;
      if (document.querySelector("dialog[open]") !== null) return;

      const key = event.key.toLowerCase();

      if (pendingGo) {
        setPendingGo(false);
        if (sequenceTimeout.current !== null) {
          clearTimeout(sequenceTimeout.current);
          sequenceTimeout.current = null;
        }

        const segment = GO_TARGETS[key];
        if (segment !== undefined) {
          event.preventDefault();
          go(segment);
        }
        return;
      }

      if (key === "g") {
        event.preventDefault();
        setPendingGo(true);
        sequenceTimeout.current = setTimeout(() => {
          setPendingGo(false);
          sequenceTimeout.current = null;
        }, 1500);
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        openHelp();
        return;
      }

      if (key === "/") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (key === ",") {
        event.preventDefault();
        go("settings/account");
        return;
      }

      if (key === "n") {
        event.preventDefault();

        const section = pathname.split("/")[3] ?? "";
        const target = CREATE_TARGETS[section];

        if (target === undefined) openPalette();
        else go(target);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (sequenceTimeout.current !== null) clearTimeout(sequenceTimeout.current);
    };
  }, [pendingGo, pathname, go, openPalette, openHelp, togglePalette]);
}
