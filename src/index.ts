import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadGraph, saveGraph } from "./storage.js";
import { EntitySchema, RelationSchema, FactSchema } from "./types.js";
import { fileURLToPath } from "url";
import path from "path";

const server = new Server(
    {
        name: "context-echo",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * List available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "memory.add",
                description: "Add an entity, relation, or fact to the user's knowledge graph.",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "string" },
                        entity: { type: "object" },
                        relation: { type: "object" },
                        fact: { type: "object" },
                    },
                    required: ["userId"],
                },
            },
            {
                name: "memory.query",
                description: "Query the user's knowledge graph for relevant context.",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "string" },
                        query: { type: "string" },
                    },
                    required: ["userId", "query"],
                },
            },
            {
                name: "memory.summarize",
                description: "Summarize the user's knowledge graph.",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "string" },
                    },
                    required: ["userId"],
                },
            },
        ],
    };
});

/**
 * Handle tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args || typeof args.userId !== "string") {
        throw new Error("userId is required and must be a string");
    }

    const userId = args.userId;

    switch (name) {
        case "memory.add": {
            const graph = await loadGraph(userId);
            let addedCount = 0;

            if (args.entity) {
                graph.entities.push(EntitySchema.parse(args.entity));
                addedCount++;
            }
            if (args.relation) {
                graph.relations.push(RelationSchema.parse(args.relation));
                addedCount++;
            }
            if (args.fact) {
                graph.facts.push(FactSchema.parse(args.fact));
                addedCount++;
            }

            if (addedCount > 0) {
                await saveGraph(userId, graph);
                return {
                    content: [{ type: "text", text: `Successfully added ${addedCount} items to memory for user ${userId}.` }],
                };
            }
            return {
                content: [{ type: "text", text: "No items provided to add." }],
            };
        }

        case "memory.query": {
            const query = String(args.query).toLowerCase();
            const graph = await loadGraph(userId);

            const matchedEntities = graph.entities.filter(e =>
                e.name.toLowerCase().includes(query) || (e.type && e.type.toLowerCase().includes(query))
            );
            const matchedRelations = graph.relations.filter(r =>
                r.source.toLowerCase().includes(query) || r.target.toLowerCase().includes(query) || r.type.toLowerCase().includes(query)
            );
            const matchedFacts = graph.facts.filter(f =>
                f.content.toLowerCase().includes(query)
            );

            const result = {
                entities: matchedEntities,
                relations: matchedRelations,
                facts: matchedFacts
            };

            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }

        case "memory.summarize": {
            const graph = await loadGraph(userId);
            const summary = [
                `Knowledge Graph Summary for User: ${userId}`,
                `- Entities: ${graph.entities.length}`,
                `- Relations: ${graph.relations.length}`,
                `- Facts: ${graph.facts.length}`,
                "",
                "Facts recorded:",
                ...graph.facts.map(f => `- [${f.confidence.toFixed(2)}] ${f.content} (${new Date(f.timestamp).toLocaleDateString()})`)
            ].join("\n");

            return {
                content: [{ type: "text", text: summary }],
            };
        }

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

/**
 * Start the server.
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Context Echo MCP Server running on stdio");
}

// Helper to detect if this is the main module in a way that's safe for both ESM and CJS
const isMainModule = () => {
    try {
        // Safe check for process and argv
        if (typeof process === 'undefined' || !process.argv || !process.argv[1]) {
            return false;
        }

        const mainPath = process.argv[1];
        // Only use import.meta if it exists (ESM)
        // Note: Using a string check to avoid syntax errors in some CJS environments
        // but here we are in TS that compiles to ESM, so the issue is the RUNTIME scanner.
        // @ts-ignore - import.meta is ESM only
        const currentUrl = import.meta.url;
        if (currentUrl) {
            const currentPath = fileURLToPath(currentUrl);
            return mainPath === currentPath || mainPath.endsWith("index.js") || mainPath.endsWith("index.ts");
        }
    } catch (e) {
        // If import.meta.url fails or other issues occur, assume not main
        return false;
    }
    return false;
};

if (isMainModule()) {
    main().catch((error) => {
        console.error("Fatal error in main():", error);
        process.exit(1);
    });
}

/**
 * Smithery Sandbox Export
 * Allows the registry to scan capabilities without real credentials.
 */
export function createSandboxServer() {
    return server;
}

export default server;
