## MCP OST Server (Cloudflare Pages Functions)

This repo includes a public MCP server optimized for building Opportunity Solution Trees (OST) and rendering them in markdown.

**Endpoint**
- `POST /api/mcp` (Streamable HTTP transport)

**Tools**
- `ost_create_tree`: create a new OST with outcome and optional starter opportunities
- `ost_add_opportunity`: add an opportunity to an existing tree
- `ost_add_solution`: add a solution under an opportunity
- `ost_render_markdown`: render the OST as markdown
- `ost_validate_tree`: validate structure and completeness

**Deploying on Cloudflare Pages**
- The MCP server lives at `functions/api/mcp.ts`.
- Optional env var: `ALLOWED_ORIGINS` as a comma-separated allowlist for browser origins.

**Local dev**
```bash
npm install
npm run dev
```

More to be added soon.
