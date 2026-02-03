import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { nanoid } from "nanoid";
import { z } from "zod";

type Env = {
  ALLOWED_ORIGINS?: string;
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

server.registerTool(
  "ost_create_tree",
  {
    title: "Create Opportunity Solution Tree",
    description:
      "Create a new Opportunity Solution Tree (OST) with a desired outcome and optional starter opportunities.",
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
    description: "Add a new opportunity to an existing Opportunity Solution Tree.",
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
    description: "Add a solution under a specific opportunity in an OST.",
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

const handler = createMcpHandler(server, {
  route: "/api/mcp",
  transportType: "streamable-http"
});

const isOriginAllowed = (request: Request, env: Env): boolean => {
  const allowList = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowList.length) return true;

  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return allowList.includes(origin);
};

export const onRequest = (context: {
  request: Request;
  env: Env;
  ctx: { waitUntil?: (promise: Promise<unknown>) => void };
}) => {
  if (!isOriginAllowed(context.request, context.env)) {
    return new Response("Origin not allowed.", { status: 403 });
  }
  return handler(context.request, context.env, context.ctx);
};
