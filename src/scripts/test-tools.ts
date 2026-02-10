import { loadGraph, saveGraph } from "../storage.js";
import { EntitySchema, RelationSchema, FactSchema } from "../types.js";

// Mocking the tool call logic since we can't easily run the StdioServer in a script
async function mockToolCall(name: string, args: any) {
    const userId = args.userId;
    console.log(`\n--- Calling tool: ${name} for ${userId} ---`);

    switch (name) {
        case "memory.add": {
            const graph = await loadGraph(userId);
            if (args.entity) graph.entities.push(EntitySchema.parse(args.entity));
            if (args.relation) graph.relations.push(RelationSchema.parse(args.relation));
            if (args.fact) graph.facts.push(FactSchema.parse(args.fact));
            await saveGraph(userId, graph);
            return `Added items to ${userId}`;
        }
        case "memory.query": {
            const query = args.query.toLowerCase();
            const graph = await loadGraph(userId);
            const matchedEntities = graph.entities.filter(e => e.name.toLowerCase().includes(query));
            return JSON.stringify({ entities: matchedEntities }, null, 2);
        }
        case "memory.summarize": {
            const graph = await loadGraph(userId);
            return `Summary for ${userId}: ${graph.entities.length} entities, ${graph.facts.length} facts.`;
        }
        default:
            throw new Error("Unknown tool");
    }
}

async function runTests() {
    const userId = "tool-test-user";

    // 1. Add
    console.log(await mockToolCall("memory.add", {
        userId,
        entity: { name: "Bob", type: "Person" },
        fact: { content: "Bob loves TypeScript.", confidence: 1.0, timestamp: new Date().toISOString() }
    }));

    // 2. Query
    const queryResult = await mockToolCall("memory.query", { userId, query: "Bob" });
    console.log("Query Result:", queryResult);

    if (!queryResult.includes("Bob")) {
        throw new Error("Query failed to find Bob");
    }

    // 3. Summarize
    const summaryResult = await mockToolCall("memory.summarize", { userId });
    console.log("Summary Result:", summaryResult);

    if (!summaryResult.includes("1 entities")) {
        throw new Error("Summary count mismatch");
    }

    console.log("\nTool integration tests PASSED!");
}

runTests().catch(err => {
    console.error("Tests failed:", err);
    process.exit(1);
});
