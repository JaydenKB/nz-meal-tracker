/** Strip leading "1.", "2)", etc. from a step string. */
export function stripStepNumber(step: string): string {
  return step.replace(/^\d+[\).\s:]+/, "").trim();
}

/** Format method steps for DB storage as numbered paragraphs. */
export function formatMethodForStorage(steps: string[]): string {
  return steps
    .map(stripStepNumber)
    .filter(Boolean)
    .map((step, i) => `${i + 1}. ${step}`)
    .join("\n\n");
}

/** Parse stored instructions into step strings (content only, for ordered lists). */
export function parseMethodSteps(instructions: string | null | undefined): string[] {
  if (!instructions?.trim()) return [];
  return instructions
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(stripStepNumber)
    .filter(Boolean);
}

/** Like parseMethodSteps, but splits prose blobs into individual steps when needed. */
export function parseMethodStepsForCooking(instructions: string | null | undefined): string[] {
  const steps = parseMethodSteps(instructions);
  if (steps.length !== 1) return steps;

  const blob = steps[0];
  const numberedParts = blob.match(/\d+[\).\s]+[^]+?(?=\d+[\).\s]+|$)/g);
  if (numberedParts && numberedParts.length > 1) {
    return numberedParts.map(stripStepNumber).filter(Boolean);
  }

  if (blob.length > 100) {
    const sentences = blob
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);
    if (sentences.length > 1) return sentences;
  }

  return steps;
}
