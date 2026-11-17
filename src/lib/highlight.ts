import "server-only";
import { codeToHtml } from "shiki";

/**
 * Server-side syntax highlighting with dual themes (GitHub Light / Dracula).
 * Use in Server Components only, then pass the HTML string to client components.
 * Render with: <div className="code-block" dangerouslySetInnerHTML={{ __html: html }} />
 */
export async function highlight(code: string, lang: "xml" | "json" | "bash" | "ts" | "tsx" | "http" = "xml") {
  return codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "dracula" },
    defaultColor: false,
  });
}
