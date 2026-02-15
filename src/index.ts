import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { loadGraph, saveGraph } from "./storage.js";
import { EntitySchema, RelationSchema, FactSchema } from "./types.js";
import { fileURLToPath } from "url";
import path from "path";
import { z } from "zod";
import crypto from "crypto";

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
export function createServer({ config }: { config: z.infer<typeof configSchema> }) {
    const server = new McpServer({
        name: "context-echo",
        version: "1.0.0",
    });

    /**
     * Tool: memory.add
     */
    server.tool(
        "memory-add",
        "Add an entity, relation, or fact to the user's knowledge graph.",
        {
            userId: z.string(),
            entity: EntitySchema.optional(),
            relation: RelationSchema.optional(),
            fact: FactSchema.optional(),
        },
        async (args) => {
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
        }
    );

    /**
     * Tool: memory.query
     */
    server.tool(
        "memory-query",
        "Query the user's knowledge graph for relevant context.",
        {
            userId: z.string(),
            query: z.string(),
        },
        async (args) => {
            const userId = args.userId;
            const query = args.query.toLowerCase();
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
    );

    /**
     * Tool: memory.summarize
     */
    server.tool(
        "memory-summarize",
        "Summarize the user's knowledge graph.",
        {
            userId: z.string(),
        },
        async (args) => {
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
        }
    );

    return server;
}

/**
 * Start the web server.
 */
async function main() {
    process.on("uncaughtException", (err) => {
        console.error("[FATAL] Uncaught Exception:", err);
    });
    process.on("unhandledRejection", (reason, promise) => {
        console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
    });

    const app = express();
    app.use(cors({
        origin: "*",
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "mcp-session-id", "Authorization"],
        exposedHeaders: ["mcp-session-id"],
    }));

    // Singleton Server and Transport Setup
    const server = createServer({ config: {} });
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID()
    });

    /**
     * Session-ID Injection Middleware
     * Ensures that stateless clients (without mcp-session-id header)
     * are automatically assigned to a default session, preventing 400 errors.
     */
    const sessionMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.headers["mcp-session-id"]) {
            // Use a stable ID for stateless clients to reuse the same "virtual" session
            req.headers["mcp-session-id"] = "stateless-session-common";
        }
        next();
    };

    // MCP Route Handler using Singleton Transport with Lazy Connection
    app.all("/mcp", sessionMiddleware, async (req, res) => {
        try {
            // Lazy connect the server to the transport on the first request
            if (!server.isConnected()) {
                await server.connect(transport);
            }
            await transport.handleRequest(req, res);
        } catch (error) {
            console.error("[MCP] Transport Error:", error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: "Internal Server Error",
                    message: error instanceof Error ? error.message : "Handshake failed",
                    stack: process.env.NODE_ENV !== "production" ? (error instanceof Error ? error.stack : undefined) : undefined,
                });
            }
        }
    });

    app.use(express.json());

    app.get("/healthz", (req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.use('/.well-known', express.static(path.join(process.cwd(), '.well-known')));

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    app.listen(port, () => {
        console.error(`Context Echo MCP Server running on port ${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/mcp`);
    });

    // Global Express error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error("[EXPRESS] Global Error:", err);
        if (!res.headersSent) {
            res.status(500).json({
                error: "Global Server Error",
                message: err instanceof Error ? err.message : String(err),
            });
        }
    });
}

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
    } catch (e) {
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

export default createServer;
