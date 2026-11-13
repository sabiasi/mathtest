/** The built-in biology drawings, by id (the drawings themselves are in drawings.ts). Plain data for migrate.ts. */
export const BIO_DRAWING_IDS = ["animal-cell", "plant-cell", "flower", "leaf-section", "heart", "digestive-system", "neuron", "dna"] as const;
export type BioDrawingId = (typeof BIO_DRAWING_IDS)[number];

export function isBioDrawingId(value: unknown): value is BioDrawingId {
  return typeof value === "string" && (BIO_DRAWING_IDS as readonly string[]).includes(value);
}
