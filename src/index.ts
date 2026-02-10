#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

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

    switch (name) {
        case "memory.add":
            return {
                content: [{ type: "text", text: "memory.add: Not implemented yet." }],
            };
        case "memory.query":
            return {
                content: [{ type: "text", text: "memory.query: Not implemented yet." }],
            };
        case "memory.summarize":
            return {
                content: [{ type: "text", text: "memory.summarize: Not implemented yet." }],
            };
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

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
