import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@tanstack/react-router";

const GUIDE_LINK = /^\/docs\/([a-z0-9-]+)\/?$/;

const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-poster text-4xl font-black uppercase tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 border-b border-border pb-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-base font-semibold text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 text-sm font-semibold text-foreground">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-4 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 marker:text-primary">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
  a: ({ children, href }) => {
    const slug = href === undefined ? undefined : GUIDE_LINK.exec(href)?.[1];

    if (slug !== undefined) {
      return (
        <Link
          to="/docs/$slug"
          params={{ slug }}
          className="text-primary underline underline-offset-4"
        >
          {children}
        </Link>
      );
    }

    return (
      <a
        href={href}
        target={href?.startsWith("/") ? undefined : "_blank"}
        rel="noreferrer"
        className="text-primary underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-primary/40 pl-4 text-[15px] italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-3 py-2 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/60 px-3 py-2 align-top text-muted-foreground">
      {children}
    </td>
  ),
  code: ({ children, className }) => {
    if (!/language-/.test(className ?? "")) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] break-words text-foreground">
          {children}
        </code>
      );
    }

    return <code className="font-mono text-[13px] leading-relaxed">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-lg border border-border bg-muted/60 p-4">
      {children}
    </pre>
  ),
};

export function DocsMarkdown({ text }: { text: string }) {
  return (
    <div className="min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
