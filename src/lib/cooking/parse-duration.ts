function unitToSeconds(unit: string): number {
  const u = unit.toLowerCase();
  if (/^h(?:r|our|ours)?$/.test(u)) return 3600;
  if (/^m(?:in|ins|inute|inutes)?$/.test(u)) return 60;
  return 1;
}

function parseAmountToSeconds(amount: number, unit: string): number {
  return amount * unitToSeconds(unit);
}

type DurationCandidate = {
  seconds: number;
  priority: number;
  position: number;
};

type Span = { start: number; end: number };

function overlaps(span: Span, start: number, end: number): boolean {
  return start < span.end && end > span.start;
}

/** Score how relevant a duration is as the step's primary timer. Higher = better match. */
function scoreDurationContext(step: string, start: number, end: number, kind: "wait" | "cook" | "each_side" | "other"): number {
  const before = step.slice(Math.max(0, start - 45), start).toLowerCase();
  const after = step.slice(start, Math.min(step.length, end + 25)).toLowerCase();
  const ctx = `${before} ${after}`;

  let score = 0;

  if (kind === "wait" || /\b(wait|rest|stand|sit|set aside|marinate)\b/.test(ctx)) {
    score = 100;
  } else if (
    kind === "cook" ||
    /\b(simmer|boil|bake|roast|cook|fry|sear|grill|steam|reduce|brown|heat|bake|broil)\b/.test(before)
  ) {
    score = 80;
  } else if (kind === "each_side") {
    score = 65;
  } else if (/\bfor\b\s*$/.test(before) || /\bfor\b/.test(before.slice(-12))) {
    score = 75;
  } else if (/\buntil\b/.test(before)) {
    score = 55;
  } else {
    score = 40;
  }

  // Prefer the timing in a trailing clause ("then wait 5 minutes")
  if (/\bthen\b[^.]{0,70}$/i.test(step.slice(Math.max(0, start - 70), start))) {
    score += 15;
  }

  // Slight preference for durations tied to the step's main action near the start
  if (start < step.length * 0.35 && score >= 75) {
    score += 5;
  }

  return score;
}

function collectCandidates(step: string): DurationCandidate[] {
  const candidates: DurationCandidate[] = [];
  const covered: Span[] = [];

  const mark = (
    start: number,
    end: number,
    seconds: number,
    kind: "wait" | "cook" | "each_side" | "other",
  ) => {
    if (covered.some((s) => overlaps(s, start, end))) return;
    covered.push({ start, end });
    candidates.push({
      seconds,
      priority: scoreDurationContext(step, start, end, kind),
      position: start,
    });
  };

  let match: RegExpExecArray | null;

  // "6-7 minutes per side" / "7 minutes each side" — one-side timer (flip when it dings)
  const eachSideRe =
    /(?:about|around|roughly\s+)?(?:(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\s+(?:each|per)\s+side/gi;
  while ((match = eachSideRe.exec(step)) !== null) {
    const amount = parseFloat(match[2]);
    const seconds = parseAmountToSeconds(amount, match[3]);
    const before = step.slice(Math.max(0, match.index - 35), match.index).toLowerCase();
    const kind = /\b(sear|fry|grill|bake|roast|broil|cook|brown)\b/.test(before)
      ? "cook"
      : "each_side";
    mark(match.index, match.index + match[0].length, seconds, kind);
  }

  const rangeRe =
    /(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
  while ((match = rangeRe.exec(step)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (covered.some((s) => overlaps(s, start, end))) continue;
    const seconds = parseAmountToSeconds(parseFloat(match[2]), match[3]);
    const kind = /\b(wait|rest)\b/i.test(step.slice(Math.max(0, start - 20), start)) ? "wait" : "other";
    mark(start, end, seconds, kind);
  }

  const singleRe =
    /(?<![-\d])(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
  while ((match = singleRe.exec(step)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (covered.some((s) => overlaps(s, start, end))) continue;

    const before = step.slice(Math.max(0, start - 30), start).toLowerCase();
    let kind: "wait" | "cook" | "each_side" | "other" = "other";
    if (/\b(wait|rest|stand|sit|marinate)\b/.test(before)) kind = "wait";
    else if (/\b(simmer|boil|bake|roast|cook|fry|sear|grill|steam|reduce|brown|heat|broil)\b/.test(before)) {
      kind = "cook";
    }

    const seconds = parseAmountToSeconds(parseFloat(match[1]), match[2]);
    mark(start, end, seconds, kind);
  }

  return candidates;
}

/** Parse the single most relevant cook-time from step text. Returns seconds, or null. */
export function parseStepDurationSeconds(step: string): number | null {
  const candidates = collectCandidates(step);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.position - a.position;
  });

  return Math.round(candidates[0].seconds);
}

export function formatTimerDisplay(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
