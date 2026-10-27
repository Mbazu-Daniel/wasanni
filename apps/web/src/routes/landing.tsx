import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/landing";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Wasanni — Ship the game. We run the arena." },
      {
        name: "description",
        content:
          "Wasanni runs sessions, scores, tournaments, and replays for games your studio already built. Host the build, or keep it on your servers and call the API.",
      },
    ],
  }),
  component: Landing,
});
