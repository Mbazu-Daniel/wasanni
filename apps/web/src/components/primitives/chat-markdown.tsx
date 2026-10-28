import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { ChatFileChip } from "@/components/primitives/chat-file-chip";
import type { ArtifactFile } from "@/lib/agent-artifacts";
import { segmentsOf } from "@/lib/agent-artifacts";

const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-4 text-base font-bold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mt-4 text-sm font-bold uppercase tracking-[0.08em] first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => <h4 className="mt-3 text-sm font-bold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-3 text-sm font-semibold first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-pink underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-launch-ink/30 pl-3 text-launch-ink/75">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-launch-ink/20" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-launch-ink/25">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-launch-ink/5 font-mono text-[10px] uppercase tracking-[0.08em]">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-launch-ink/25 px-2.5 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-launch-ink/15 px-2.5 py-1.5 align-top">{children}</td>,
  code: ({ children, className }) => {
    const fenced = /language-/.test(className ?? "");
    if (!fenced) {
      return (
        <code className="rounded bg-launch-ink/10 px-1 py-0.5 font-mono text-[12px]">
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-[12px] leading-relaxed text-inherit">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 max-h-72 overflow-auto whitespace-pre break-normal rounded-lg border border-launch-ink/25 bg-launch-ink/5 p-3 font-mono text-[11px] leading-relaxed">
      {children}
    </pre>
  ),
};

export function ChatMarkdown({
  text,
  onOpenFile,
}: {
  text: string;
  onOpenFile?: (file: ArtifactFile) => void;
}) {
  return (
    <div className="min-w-0 space-y-2 text-sm leading-relaxed">
      {segmentsOf(text).map((segment, index) => {
        if (segment.kind === "file") {
          return (
            <ChatFileChip key={index} file={segment.file} onOpen={onOpenFile} />
          );
        }

        if (segment.value.trim() === "") {
          return null;
        }

        return (
          <div key={index} className="min-w-0 break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {segment.value}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
