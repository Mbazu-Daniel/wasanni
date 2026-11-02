import { ChatFileChip } from "@/components/primitives/chat-file-chip";
import { segmentsOf } from "@/lib/agent-artifacts";

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="min-w-0 max-w-[80%] space-y-2">
        {segmentsOf(text).map((segment, index) => {
          if (segment.kind === "file") {
            return <ChatFileChip key={index} file={segment.file} />;
          }

          if (segment.value.trim() === "") {
            return null;
          }

          return (
            <p
              key={index}
              className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm border border-launch-ink/20 bg-launch-ink/[0.05] px-3.5 py-2.5 text-sm"
            >
              {segment.value.trim()}
            </p>
          );
        })}
      </div>
    </div>
  );
}
