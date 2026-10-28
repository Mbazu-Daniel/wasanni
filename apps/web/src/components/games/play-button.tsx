import { IconPlayerPlay, IconWorld } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:9000";

export function PlayButton({
  gameId,
  fileId,
  hosting,
  disabled,
  size = "sm",
}: {
  gameId: string;
  fileId: string | null;
  hosting: "hosted" | "external";
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  if (hosting === "external") {
    return (
      <Button variant="outline" size={size} disabled className="gap-1.5">
        <IconWorld className="size-3.5" />
        API only
      </Button>
    );
  }

  if (!fileId) {
    return (
      <Button variant="outline" size={size} disabled className="gap-1.5">
        <IconPlayerPlay className="size-3.5" />
        Play
      </Button>
    );
  }

  const url = `${API_URL}/play/${gameId}/${fileId}/`;

  return (
    <a href={url} target="_blank" rel="noreferrer">
      <Button
        variant="default"
        size={size}
        disabled={disabled}
        className="gap-1.5"
      >
        <IconPlayerPlay className="size-3.5 fill-current" />
        Play test
      </Button>
    </a>
  );
}
