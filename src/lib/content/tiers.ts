// The three versions of a two-part measure's second section, one of which is chosen from the first
// section's result. Kept apart from schema.ts so that browser code can use it without loading zod.
export const TIERS = ['easier', 'medium', 'harder'] as const;
export type Tier = (typeof TIERS)[number];
