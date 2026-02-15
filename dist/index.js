import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { loadGraph, saveGraph } from "./storage.js";
import { EntitySchema, RelationSchema, FactSchema } from "./types.js";
import { fileURLToPath } from "url";
import path from "path";
import { z } from "zod";
/**
 * Smithery Session Configuration Schema.
 */
export const configSchema = z.object({
// Add session-specific config here if needed in the future.
});
/**
 * Create a new MCP server instance with all tool handlers registered.
 * Aligns with Smithery's createServer pattern.
 */
export function createServer({ config }) {
    const server = new McpServer({
        name: "context-echo",
        version: "1.0.0",
    });
    /**
     * Tool: memory.add
     */
    server.tool("memory-add", "Add an entity, relation, or fact to the user's knowledge graph.", {
        userId: z.string(),
        entity: EntitySchema.optional(),
        relation: RelationSchema.optional(),
        fact: FactSchema.optional(),
    }, async (args) => {
        const userId = args.userId;
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
    });
    /**
     * Tool: memory.query
     */
    server.tool("memory-query", "Query the user's knowledge graph for relevant context.", {
        userId: z.string(),
        query: z.string(),
    }, async (args) => {
        const userId = args.userId;
        const query = args.query.toLowerCase();
        const graph = await loadGraph(userId);
        const matchedEntities = graph.entities.filter(e => e.name.toLowerCase().includes(query) || (e.type && e.type.toLowerCase().includes(query)));
        const matchedRelations = graph.relations.filter(r => r.source.toLowerCase().includes(query) || r.target.toLowerCase().includes(query) || r.type.toLowerCase().includes(query));
        const matchedFacts = graph.facts.filter(f => f.content.toLowerCase().includes(query));
        const result = {
            entities: matchedEntities,
            relations: matchedRelations,
            facts: matchedFacts
        };
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    /**
     * Tool: memory.summarize
     */
    server.tool("memory-summarize", "Summarize the user's knowledge graph.", {
        userId: z.string(),
    }, async (args) => {
        const userId = args.userId;
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
    });
    return server;
}
/**
 * Start the web server.
 */
async function main() {
    const app = express();
    app.use(cors({
        origin: "*",
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "mcp-session-id", "Authorization"],
        exposedHeaders: ["mcp-session-id"],
    }));
    app.use(express.json());
    const server = createServer({ config: {} });
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
    });
    await server.connect(transport);
    app.all("/mcp", async (req, res) => {
        console.error(`[MCP] Request: ${req.method} ${req.url}`);
        console.error(`[MCP] Headers: ${JSON.stringify(req.headers)}`);
        try {
            await transport.handleRequest(req, res, req.body);
            console.error(`[MCP] Response: ${res.statusCode}`);
        }
        catch (error) {
            console.error("[MCP] Transport Error Exception:", error);
            if (error instanceof Error) {
                console.error("[MCP] Stack Trace:", error.stack);
            }
            if (!res.headersSent) {
                res.status(500).json({
                    error: "Internal Server Error",
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
            }
        }
    });
    app.get("/healthz", (req, res) => {
        res.status(200).json({ status: "ok" });
    });
    // Serve static files from the .well-known directory
    app.use('/.well-known', express.static(path.join(process.cwd(), '.well-known')));
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    app.listen(port, () => {
        console.error(`Context Echo MCP Server running on port ${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/mcp`);
    });
    // Global error handler
    app.use((err, req, res, next) => {
        console.error("[EXPRESS] Unhandled Error:", err);
        if (!res.headersSent) {
            res.status(500).json({
                error: "Global Server Error",
                message: err instanceof Error ? err.message : String(err),
            });
        }
    });
}
// Helper to detect if this is the main module
const isMainModule = () => {
    try {
        if (typeof process === 'undefined' || !process.argv || !process.argv[1]) {
            return false;
        }
        const mainPath = process.argv[1];
        // @ts-ignore - import.meta is ESM only
        const currentUrl = import.meta.url;
        if (currentUrl) {
            const currentPath = fileURLToPath(currentUrl);
            return mainPath === currentPath || mainPath.endsWith("index.js") || mainPath.endsWith("index.ts");
        }
    }
    catch (e) {
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
// Export for Smithery Sandbox
export default createServer;
//# sourceMappingURL=index.js.map