import { createFileRoute } from "@tanstack/react-router";
import { IconDeviceGamepad2, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";

export const Route = createFileRoute("/o/$orgSlug/games/")({
  head: () => ({ meta: [{ title: "Games · Wasanni" }] }),
  component: GamesListPage,
});

function GamesListPage() {
  return (
    <div>
      <PageHeader
        title="Games"
        description="Every game your workspace ships."
        actions={
          <Button size="sm" className="gap-1.5">
            <IconPlus className="size-3.5" />
            New game
          </Button>
        }
      />
      <EmptyState
        icon={<IconDeviceGamepad2 className="size-5" />}
        title="No games yet"
        description="Create a game to start receiving sessions and scores. Host it with Wasanni or keep it on your own servers."
        primary={<Button>Create game</Button>}
      />
    </div>
  );
}
