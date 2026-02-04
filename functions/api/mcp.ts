import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { nanoid } from "nanoid";
import { z } from "zod";

type Env = {
  SHARE_BASE_URL?: string;
};

type ResponseFormat = "markdown" | "json";

type Outcome = {
  id: string;
  title: string;
  description?: string;
};

type Solution = {
  id: string;
  title: string;
  description?: string;
  impact?: string;
  evidence?: string;
};

type Opportunity = {
  id: string;
  title: string;
  insight?: string;
  metric?: string;
  solutions: Solution[];
};

type OstTree = {
  outcome: Outcome;
  opportunities: Opportunity[];
  metadata?: Record<string, unknown>;
};

const ResponseFormatSchema = z.enum(["markdown", "json"]);

const OutcomeSchema = z
  .object({
    id: z
      .string()
      .min(2, "Outcome id must be at least 2 characters")
      .max(64, "Outcome id must be 64 characters or fewer")
      .describe("Stable identifier for the outcome (e.g. outcome_7F3Q)"),
    title: z
      .string()
      .min(3, "Outcome title must be at least 3 characters")
      .max(200, "Outcome title must be 200 characters or fewer")
      .describe("Desired outcome, phrased as a measurable goal"),
    description: z
      .string()
      .max(1000, "Outcome description must be 1000 characters or fewer")
      .optional()
      .describe("Optional context or scope for the outcome")
  })
  .strict();

const SolutionSchema = z
  .object({
    id: z
      .string()
      .min(2, "Solution id must be at least 2 characters")
      .max(64, "Solution id must be 64 characters or fewer")
      .describe("Stable identifier for the solution (e.g. solution_9P2K)"),
    title: z
      .string()
      .min(3, "Solution title must be at least 3 characters")
      .max(200, "Solution title must be 200 characters or fewer")
      .describe("Candidate solution title"),
    description: z
      .string()
      .max(1000, "Solution description must be 1000 characters or fewer")
      .optional()
      .describe("Optional summary of the solution idea"),
    impact: z
      .string()
      .max(500, "Impact must be 500 characters or fewer")
      .optional()
      .describe("Expected impact or value delivered"),
    evidence: z
      .string()
      .max(500, "Evidence must be 500 characters or fewer")
      .optional()
      .describe("Evidence that supports this solution")
  })
  .strict();

const OpportunitySchema = z
  .object({
    id: z
      .string()
      .min(2, "Opportunity id must be at least 2 characters")
      .max(64, "Opportunity id must be 64 characters or fewer")
      .describe("Stable identifier for the opportunity (e.g. opp_4S1A)"),
    title: z
      .string()
      .min(3, "Opportunity title must be at least 3 characters")
      .max(200, "Opportunity title must be 200 characters or fewer")
      .describe("Opportunity statement or unmet user need"),
    insight: z
      .string()
      .max(1000, "Insight must be 1000 characters or fewer")
      .optional()
      .describe("User insight or problem signal behind the opportunity"),
    metric: z
      .string()
      .max(200, "Metric must be 200 characters or fewer")
      .optional()
      .describe("Metric used to track progress for this opportunity"),
    solutions: z
      .array(SolutionSchema)
      .default([])
      .describe("Candidate solutions for this opportunity")
  })
  .strict();

const OstTreeSchema = z
  .object({
    outcome: OutcomeSchema,
    opportunities: z.array(OpportunitySchema).default([]),
    metadata: z.record(z.unknown()).optional()
  })
  .strict();

const CreateTreeInputSchema = z
  .object({
    outcome_title: z
      .string()
      .min(3, "Outcome title must be at least 3 characters")
      .max(200, "Outcome title must be 200 characters or fewer")
      .describe("Desired outcome phrased as a measurable goal"),
    outcome_description: z
      .string()
      .max(1000, "Outcome description must be 1000 characters or fewer")
      .optional()
      .describe("Optional context or scope for the outcome"),
    opportunities: z
      .array(
        z
          .object({
            title: z
              .string()
              .min(3, "Opportunity title must be at least 3 characters")
              .max(200, "Opportunity title must be 200 characters or fewer"),
            insight: z.string().max(1000).optional(),
            metric: z.string().max(200).optional()
          })
          .strict()
      )
      .optional()
      .describe("Optional starter opportunities to seed the tree"),
    response_format: ResponseFormatSchema.default("markdown").describe(
      "Output format: markdown or json (default: markdown)"
    )
  })
  .strict();

const AddOpportunityInputSchema = z
  .object({
    tree: OstTreeSchema.describe("Existing OST tree to extend"),
    opportunity: z
      .object({
        id: z.string().min(2).max(64).optional(),
        title: z.string().min(3).max(200),
        insight: z.string().max(1000).optional(),
        metric: z.string().max(200).optional()
      })
      .strict()
      .describe("Opportunity details to add"),
    response_format: ResponseFormatSchema.default("markdown").describe(
      "Output format: markdown or json (default: markdown)"
    )
  })
  .strict();

const AddSolutionInputSchema = z
  .object({
    tree: OstTreeSchema.describe("Existing OST tree to extend"),
    opportunity_id: z
      .string()
      .min(2, "Opportunity id must be at least 2 characters")
      .max(64, "Opportunity id must be 64 characters or fewer")
      .describe("Opportunity id to attach the solution to"),
    solution: z
      .object({
        id: z.string().min(2).max(64).optional(),
        title: z.string().min(3).max(200),
        description: z.string().max(1000).optional(),
        impact: z.string().max(500).optional(),
        evidence: z.string().max(500).optional()
      })
      .strict()
      .describe("Solution details to add"),
    response_format: ResponseFormatSchema.default("markdown").describe(
      "Output format: markdown or json (default: markdown)"
    )
  })
  .strict();

const RenderMarkdownInputSchema = z
  .object({
    tree: OstTreeSchema.describe("OST tree to render as markdown"),
    heading_level: z
      .number()
      .int()
      .min(1)
      .max(4)
      .default(2)
      .describe("Top heading level for the outcome (default: 2)"),
    include_ids: z
      .boolean()
      .default(false)
      .describe("Whether to include node ids in the markdown output"),
    include_metadata: z
      .boolean()
      .default(false)
      .describe("Whether to include metadata section in the markdown output"),
    response_format: ResponseFormatSchema.default("markdown").describe(
      "Output format: markdown or json (default: markdown)"
    )
  })
  .strict();

const ValidateTreeInputSchema = z
  .object({
    tree: OstTreeSchema.describe("OST tree to validate"),
    response_format: ResponseFormatSchema.default("markdown").describe(
      "Output format: markdown or json (default: markdown)"
    )
  })
  .strict();

const ShareLinkInputSchema = z
  .object({
    markdown: z
      .string()
      .min(1, "Markdown must not be empty")
      .describe("Markdown to embed in the share link"),
    project_name: z
      .string()
      .max(200, "Project name must be 200 characters or fewer")
      .optional()
      .describe("Optional project name to embed with the share data"),
    base_url: z
      .string()
      .url()
      .optional()
      .describe("Optional base URL to prefix the share fragment"),
    response_format: ResponseFormatSchema.default("markdown").describe(
      "Output format: markdown or json (default: markdown)"
    )
  })
  .strict();

const CreateTreeOutputSchema = z.object({
  tree: OstTreeSchema,
  markdown: z.string().optional(),
  summary: z.string().optional()
});

const ValidateTreeOutputSchema = z.object({
  is_valid: z.boolean(),
  issues: z.array(z.string()),
  summary: z.string(),
  markdown: z.string().optional()
});

const ShareLinkOutputSchema = z.object({
  share_data: z.object({
    v: z.number(),
    m: z.string(),
    n: z.string()
  }),
  share_fragment: z.string(),
  share_url: z.string()
});

const server = new McpServer({
  name: "ost-mcp-server",
  version: "1.0.0"
});

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const makeId = (prefix: string, provided?: string): string => {
  const clean = provided?.trim();
  if (clean) return clean;
  return `${prefix}_${nanoid(8)}`;
};

const formatHeading = (level: number, text: string): string =>
  `${"#".repeat(level)} ${text}`;

const renderMarkdown = (
  tree: OstTree,
  opts: { headingLevel: number; includeIds: boolean; includeMetadata: boolean }
): string => {
  const { outcome, opportunities, metadata } = tree;
  const title = opts.includeIds ? `${outcome.title} (${outcome.id})` : outcome.title;
  const lines: string[] = [formatHeading(opts.headingLevel, `Outcome: ${title}`)];

  if (outcome.description) {
    lines.push(outcome.description);
  }

  lines.push("");
  lines.push(formatHeading(opts.headingLevel + 1, "Opportunities"));

  if (!opportunities.length) {
    lines.push("_No opportunities added yet._");
  }

  opportunities.forEach((opportunity, index) => {
    const oppTitle = opts.includeIds
      ? `${opportunity.title} (${opportunity.id})`
      : opportunity.title;
    lines.push(`${index + 1}. ${oppTitle}`);
    if (opportunity.insight) lines.push(`   - Insight: ${opportunity.insight}`);
    if (opportunity.metric) lines.push(`   - Metric: ${opportunity.metric}`);

    if (!opportunity.solutions.length) {
      lines.push("   - Solutions: _none yet_");
      return;
    }

    lines.push("   - Solutions:");
    opportunity.solutions.forEach((solution, solutionIndex) => {
      const solutionTitle = opts.includeIds
        ? `${solution.title} (${solution.id})`
        : solution.title;
      lines.push(`     ${solutionIndex + 1}. ${solutionTitle}`);
      if (solution.description) lines.push(`        - Description: ${solution.description}`);
      if (solution.impact) lines.push(`        - Impact: ${solution.impact}`);
      if (solution.evidence) lines.push(`        - Evidence: ${solution.evidence}`);
    });
  });

  if (opts.includeMetadata && metadata && Object.keys(metadata).length) {
    lines.push("");
    lines.push(formatHeading(opts.headingLevel + 1, "Metadata"));
    Object.entries(metadata).forEach(([key, value]) => {
      lines.push(`- ${key}: ${String(value)}`);
    });
  }

  return lines.join("\n");
};

const formatToolResponse = (
  responseFormat: ResponseFormat,
  payload: Record<string, unknown>,
  markdown?: string
) => {
  if (responseFormat === "json") {
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload
    };
  }

  return {
    content: [{ type: "text", text: markdown ?? "No markdown available." }],
    structuredContent: { ...payload, markdown }
  };
};

const summarizeTree = (tree: OstTree): string => {
  const opportunityCount = tree.opportunities.length;
  const solutionCount = tree.opportunities.reduce(
    (total, opp) => total + opp.solutions.length,
    0
  );
  return `Outcome: ${tree.outcome.title}. Opportunities: ${opportunityCount}. Solutions: ${solutionCount}.`;
};

const validateTree = (tree: OstTree): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  if (!tree.outcome.title.trim()) {
    issues.push("Outcome title is empty.");
  }

  if (!tree.opportunities.length) {
    issues.push("No opportunities added yet.");
  }

  const ids = new Set<string>();
  const registerId = (id: string, label: string) => {
    if (ids.has(id)) {
      issues.push(`Duplicate id found for ${label}: ${id}`);
    }
    ids.add(id);
  };

  registerId(tree.outcome.id, "outcome");

  tree.opportunities.forEach((opp) => {
    registerId(opp.id, "opportunity");
    if (!opp.title.trim()) {
      issues.push(`Opportunity "${opp.id}" has an empty title.`);
    }
    if (!opp.solutions.length) {
      issues.push(`Opportunity "${opp.title}" has no solutions yet.`);
    }
    opp.solutions.forEach((solution) => {
      registerId(solution.id, "solution");
      if (!solution.title.trim()) {
        issues.push(`Solution "${solution.id}" has an empty title.`);
      }
    });
  });

  return { isValid: issues.length === 0, issues };
};

const DEFAULT_SHARE_BASE_URL = "https://ost-builder.pages.dev/";
let shareBaseUrl = DEFAULT_SHARE_BASE_URL;

const encodeMarkdownToUrlFragment = (markdown: string, name?: string): string => {
  const payload = JSON.stringify({ v: 1, m: markdown, n: name || "" });
  return encodeStringToUrlFragment(payload);
};

const encodeStringToUrlFragment = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  let base64: string;
  if (typeof btoa === "function") {
    base64 = btoa(binary);
  } else if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(binary, "binary").toString("base64");
  } else {
    throw new Error("Base64 encoder is not available in this environment.");
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

server.registerTool(
  "ost_create_tree",
  {
    title: "Create Opportunity Solution Tree",
    description:
      "Create a new Opportunity Solution Tree (OST) with a desired outcome and optional starter opportunities. Suggestion: call ost_render_markdown to show the OST once it is built.",
    inputSchema: CreateTreeInputSchema,
    outputSchema: CreateTreeOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ outcome_title, outcome_description, opportunities, response_format }) => {
    const tree: OstTree = {
      outcome: {
        id: makeId("outcome"),
        title: outcome_title,
        description: outcome_description
      },
      opportunities:
        opportunities?.map((opportunity) => ({
          id: makeId("opp"),
          title: opportunity.title,
          insight: opportunity.insight,
          metric: opportunity.metric,
          solutions: []
        })) ?? []
    };

    const markdown = renderMarkdown(tree, {
      headingLevel: 2,
      includeIds: false,
      includeMetadata: false
    });

    const payload = {
      tree,
      markdown,
      summary: summarizeTree(tree)
    };

    return formatToolResponse(response_format, payload, markdown);
  }
);

server.registerTool(
  "ost_add_opportunity",
  {
    title: "Add Opportunity",
    description:
      "Add a new opportunity to an existing Opportunity Solution Tree. Suggestion: call ost_render_markdown to show the updated OST.",
    inputSchema: AddOpportunityInputSchema,
    outputSchema: CreateTreeOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ tree, opportunity, response_format }) => {
    const nextTree = clone(tree);
    const nextId = makeId("opp", opportunity.id);
    if (nextTree.opportunities.some((opp) => opp.id === nextId)) {
      throw new Error(`Opportunity id "${nextId}" already exists.`);
    }

    nextTree.opportunities.push({
      id: nextId,
      title: opportunity.title,
      insight: opportunity.insight,
      metric: opportunity.metric,
      solutions: []
    });

    const markdown = renderMarkdown(nextTree, {
      headingLevel: 2,
      includeIds: false,
      includeMetadata: false
    });

    const payload = {
      tree: nextTree,
      markdown,
      summary: summarizeTree(nextTree)
    };

    return formatToolResponse(response_format, payload, markdown);
  }
);

server.registerTool(
  "ost_add_solution",
  {
    title: "Add Solution",
    description:
      "Add a solution under a specific opportunity in an OST. Suggestion: call ost_render_markdown to show the updated OST.",
    inputSchema: AddSolutionInputSchema,
    outputSchema: CreateTreeOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ tree, opportunity_id, solution, response_format }) => {
    const nextTree = clone(tree);
    const target = nextTree.opportunities.find((opp) => opp.id === opportunity_id);
    if (!target) {
      throw new Error(`Opportunity id "${opportunity_id}" was not found.`);
    }

    const nextId = makeId("solution", solution.id);
    if (target.solutions.some((item) => item.id === nextId)) {
      throw new Error(`Solution id "${nextId}" already exists under ${opportunity_id}.`);
    }

    target.solutions.push({
      id: nextId,
      title: solution.title,
      description: solution.description,
      impact: solution.impact,
      evidence: solution.evidence
    });

    const markdown = renderMarkdown(nextTree, {
      headingLevel: 2,
      includeIds: false,
      includeMetadata: false
    });

    const payload = {
      tree: nextTree,
      markdown,
      summary: summarizeTree(nextTree)
    };

    return formatToolResponse(response_format, payload, markdown);
  }
);

server.registerTool(
  "ost_render_markdown",
  {
    title: "Render OST Markdown",
    description: "Render an Opportunity Solution Tree as markdown output.",
    inputSchema: RenderMarkdownInputSchema,
    outputSchema: z.object({
      markdown: z.string(),
      summary: z.string()
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ tree, heading_level, include_ids, include_metadata, response_format }) => {
    const markdown = renderMarkdown(tree, {
      headingLevel: heading_level,
      includeIds: include_ids,
      includeMetadata: include_metadata
    });

    const payload = {
      markdown,
      summary: summarizeTree(tree)
    };

    return formatToolResponse(response_format, payload, markdown);
  }
);

server.registerTool(
  "ost_validate_tree",
  {
    title: "Validate OST",
    description: "Validate an Opportunity Solution Tree for completeness and duplicate ids.",
    inputSchema: ValidateTreeInputSchema,
    outputSchema: ValidateTreeOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ tree, response_format }) => {
    const result = validateTree(tree);
    const summary = result.isValid ? "Tree looks complete." : "Tree has gaps to address.";
    const markdownLines = [
      formatHeading(2, "OST Validation Summary"),
      summary,
      "",
      formatHeading(3, "Issues"),
      result.issues.length ? result.issues.map((issue) => `- ${issue}`).join("\n") : "_No issues found._"
    ];
    const markdown = markdownLines.join("\n");

    const payload = {
      is_valid: result.isValid,
      issues: result.issues,
      summary,
      markdown
    };

    return formatToolResponse(response_format, payload, markdown);
  }
);

server.registerTool(
  "ost_share_link",
  {
    title: "Create OST Share Link",
    description:
      "Create a shareable OST link fragment (base64url-encoded) from markdown content.",
    inputSchema: ShareLinkInputSchema,
    outputSchema: ShareLinkOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ markdown, project_name, base_url, response_format }) => {
    const fragment = encodeMarkdownToUrlFragment(markdown, project_name);
    const shareUrl = base_url
      ? `${base_url}#${fragment}`
      : `${shareBaseUrl}#${fragment}`;

    const payload = {
      share_data: { v: 1, m: markdown, n: project_name || "" },
      share_fragment: fragment,
      share_url: shareUrl
    };

    const markdownOutput = [
      formatHeading(2, "OST Share Link"),
      "",
      `Share URL: ${shareUrl}`,
      "",
      "Share fragment:",
      "```",
      fragment,
      "```"
    ].join("\n");

    return formatToolResponse(response_format, payload, markdownOutput);
  }
);

const transport = new WebStandardStreamableHTTPServerTransport();
let connected: Promise<void> | null = null;
const ensureConnected = () => (connected ??= server.connect(transport));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type,mcp-session-id,Last-Event-ID,mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id,mcp-protocol-version"
};

const withCors = (response: Response): Response => {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

export const onRequest = async (context: { request: Request; env?: Env }) => {
  const { request, env } = context;

  if (env?.SHARE_BASE_URL) {
    shareBaseUrl = env.SHARE_BASE_URL;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  await ensureConnected();
  const response = await transport.handleRequest(request);
  return withCors(response);
};
