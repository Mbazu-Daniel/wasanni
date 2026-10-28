import type { ArtifactFile } from "./agent-artifacts";
import type { AgentAttachment } from "./agent-types";

export const INTEGRATION_PROMPT =
  "Integrate this game with Wasanni. Sequence the platform and game wiring using your tools. " +
  "The game client records scores through POST /api/v1/sessions and the session token that call returns; " +
  "never place a wsk_ platform key in client code.";

const base64Of = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const buildIntegration = (input: {
  file: ArtifactFile | null;
  attachments: AgentAttachment[];
}): { prompt: string; attachments: AgentAttachment[] } | null => {
  if (input.file === null && input.attachments.length === 0) {
    return null;
  }

  const carried = input.file === null ? [] : [
    {
      name: input.file.name,
      mediaType:
        input.file.language === "html" || input.file.name.toLowerCase().endsWith(".html")
          ? "text/html"
          : "text/plain",
      data: base64Of(input.file.body),
    },
  ];

  return { prompt: INTEGRATION_PROMPT, attachments: [...input.attachments, ...carried] };
};
