import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

export function MarkdownPreview({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div className={cn("space-y-3 text-xs/relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-lg font-semibold tracking-tight" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2
              className="border-b border-border pb-2 text-sm font-semibold"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xs font-semibold uppercase" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="leading-6 text-foreground/90" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="ml-5 list-disc space-y-2" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="ml-5 list-decimal space-y-2" {...props} />
          ),
          li: ({ ...props }) => <li className="pl-1" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l border-border pl-3 text-muted-foreground"
              {...props}
            />
          ),
          a: ({ ...props }) => (
            <a
              className="text-primary underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse border border-border"
                {...props}
              />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-muted/50" {...props} />,
          th: ({ ...props }) => (
            <th
              className="border border-border px-2 py-1 text-left font-medium"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td className="border border-border px-2 py-1 align-top" {...props} />
          ),
          pre: ({ ...props }) => (
            <pre
              className="overflow-x-auto border border-border bg-muted/50 p-3"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const hasBlockLanguage = className?.includes("language-")
            const contentValue = String(children).replace(/\n$/, "")

            if (hasBlockLanguage || contentValue.includes("\n")) {
              return (
                <code className={cn("font-mono text-[11px]", className)} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <code
                className="border border-border bg-muted/60 px-1 py-0.5 font-mono text-[11px]"
                {...props}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
