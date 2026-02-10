import { z } from "zod";
/**
 * Entity schema
 */
export const EntitySchema = z.object({
    name: z.string().describe("The name of the entity"),
    type: z.string().describe("The type of the entity (e.g., Person, Organization, Project)"),
    metadata: z.record(z.string(), z.any()).optional().describe("Additional metadata for the entity"),
});
/**
 * Relation schema
 */
export const RelationSchema = z.object({
    source: z.string().describe("The name of the source entity"),
    target: z.string().describe("The name of the target entity"),
    type: z.string().describe("The type of the relation (e.g., worksAt, memberOf, locatedIn)"),
    weight: z.number().optional().describe("The weight or strength of the relation (0.0 to 1.0)"),
});
/**
 * Fact schema
 */
export const FactSchema = z.object({
    content: z.string().describe("The factual statement"),
    confidence: z.number().min(0).max(1).describe("Confidence score for the fact (0.0 to 1.0)"),
    timestamp: z.string().describe("ISO timestamp when the fact was recorded"),
});
/**
 * Knowledge Graph container schema
 */
export const KnowledgeGraphSchema = z.object({
    entities: z.array(EntitySchema).default([]),
    relations: z.array(RelationSchema).default([]),
    facts: z.array(FactSchema).default([]),
});
//# sourceMappingURL=types.js.map