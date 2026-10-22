<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Single Next.js 16 app with no database and no `.env` file. Install with `npm ci`. Start with `npm run dev` (port 3000). Checks are `npm run lint` and `npm run build`.
- Open `http://localhost:3000`. Next.js blocks dev assets when the page is opened as `127.0.0.1`, so that origin renders the shell and does not hydrate.
- Recipe math runs in the browser. Enter a meat amount, such as 10 kg of S I, and read the Leitsatz status. `curl` only returns the idle shell ("Keine Einwaage").
- The first `npm run build` in a fresh tree can exit 1 after "Compiled successfully" because Next.js stops once to show a security-upgrade notice. Run the same command again. A real compile failure exits before that success line.
