import { loadGraph, saveGraph } from "../storage.js";
import { KnowledgeGraph } from "../types.js";

async function testStorage() {
    const userId = "test-user-123";
    console.log(`Testing storage for userId: ${userId}`);

    // 1. Load non-existent graph
    console.log("Loading non-existent graph...");
    const initialGraph = await loadGraph(userId);
    console.log("Initial graph:", JSON.stringify(initialGraph, null, 2));

    if (initialGraph.entities.length !== 0) {
        throw new Error("Initial graph should be empty");
    }

    // 2. Save a graph
    console.log("Saving a sample graph...");
    const sampleGraph: KnowledgeGraph = {
        entities: [
            { name: "Alice", type: "Person", metadata: { age: 30 } },
            { name: "Context Echo", type: "Project" },
        ],
        relations: [
            { source: "Alice", target: "Context Echo", type: "creatorOf", weight: 1.0 },
        ],
        facts: [
            { content: "Alice created Context Echo.", confidence: 0.9, timestamp: new Date().toISOString() },
        ],
    };

    await saveGraph(userId, sampleGraph);
    console.log("Sample graph saved.");

    // 3. Reload the graph
    console.log("Reloading the graph...");
    const reloadedGraph = await loadGraph(userId);
    console.log("Reloaded graph:", JSON.stringify(reloadedGraph, null, 2));

    // 4. Verification
    if (reloadedGraph.entities.length !== 2) {
        throw new Error(`Expected 2 entities, got ${reloadedGraph.entities.length}`);
    }
    if (reloadedGraph.entities[0].name !== "Alice") {
        throw new Error(`Expected first entity to be Alice, got ${reloadedGraph.entities[0].name}`);
    }

    console.log("Storage test PASSED successfully!");
}

testStorage().catch((error) => {
    console.error("Storage test FAILED:", error);
    process.exit(1);
});
