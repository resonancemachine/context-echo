import fs from "fs/promises";
import path from "path";
import { KnowledgeGraph, KnowledgeGraphSchema } from "./types.js";

const MEMORY_DIR = "./memory";

/**
 * Ensures the memory directory exists.
 */
async function ensureMemoryDir(): Promise<void> {
    try {
        await fs.access(MEMORY_DIR);
    } catch {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
    }
}

/**
 * Gets the file path for a specific user.
 */
function getFilePath(userId: string): string {
    return path.join(MEMORY_DIR, `${userId}.json`);
}

/**
 * Loads the knowledge graph for a user.
 * Returns an empty graph if the file doesn't exist.
 */
export async function loadGraph(userId: string): Promise<KnowledgeGraph> {
    const filePath = getFilePath(userId);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        const json = JSON.parse(data);
        return KnowledgeGraphSchema.parse(json);
    } catch (error: any) {
        if (error.code === "ENOENT") {
            // Return a new empty graph structure if file not found
            return {
                entities: [],
                relations: [],
                facts: [],
            };
        }
        throw new Error(`Failed to load knowledge graph for user ${userId}: ${error.message}`);
    }
}

/**
 * Saves the knowledge graph for a user.
 */
export async function saveGraph(userId: string, graph: KnowledgeGraph): Promise<void> {
    await ensureMemoryDir();
    const filePath = getFilePath(userId);
    try {
        // Validate before saving
        const validatedData = KnowledgeGraphSchema.parse(graph);
        const data = JSON.stringify(validatedData, null, 2);
        await fs.writeFile(filePath, data, "utf-8");
    } catch (error: any) {
        throw new Error(`Failed to save knowledge graph for user ${userId}: ${error.message}`);
    }
}
