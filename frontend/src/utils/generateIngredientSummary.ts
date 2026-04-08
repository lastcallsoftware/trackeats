import { IFood, IRecipe, INutrition } from "../contexts/DataProvider";

// ---------------------------------------------------------------------------
// US volume unit handling
// ---------------------------------------------------------------------------

/**
 * Promotion ladder: tsp → tbsp → cup → qt → gal
 * fl oz and pt are intentionally excluded — cooks don't use them in recipes.
 */
const UNITS: { names: string[]; tbsp: number; display: string }[] = [
    { names: ["tsp", "teaspoon", "teaspoons", "t"],              tbsp: 1/3,  display: "tsp"  },
    { names: ["tbsp", "tablespoon", "tablespoons", "T", "tb"],   tbsp: 1,    display: "tbsp" },
    { names: ["cup", "cups", "c"],                               tbsp: 16,   display: "cup"  },
    { names: ["qt", "quart", "quarts"],                          tbsp: 64,   display: "qt"   },
    { names: ["gal", "gallon", "gallons"],                       tbsp: 256,  display: "gal"  },
];

/**
 * fl oz and pt are recognised when *parsing* a serving_size_description
 * but are converted into the promotion ladder (tbsp / cup) immediately,
 * so they never appear in output.
 */
const PARSE_ONLY_UNITS: { names: string[]; tbsp: number; display: string }[] = [
    { names: ["fl oz", "fl. oz", "fl oz.", "fluid ounce", "fluid ounces"], tbsp: 2,  display: "fl oz" },
    { names: ["pt", "pint", "pints"],                                       tbsp: 32, display: "pt"   },
];

/** All recognisable units (for parsing only). */
const ALL_UNITS = [...UNITS, ...PARSE_ONLY_UNITS];

/**
 * Minimum quantity of a unit before we consider promoting to the next one.
 * Promotion also requires the result to be a "nice" fraction (see isNiceNumber).
 */
const PROMOTE_AT: Record<string, number> = {
    tsp:  3,  // 3 tsp  → 1 tbsp
    tbsp: 4,  // 4 tbsp → 1/4 cup  (only when result is a nice cup fraction)
    cup:  4,  // keep cups as cups for small amounts; qt only at 4+
    qt:   4,
};

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/** Parse a string like "1/2", "1 1/2", "2", "1.5" → number | null */
function parseFraction(s: string): number | null {
    s = s.trim();
    const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
    const frac = s.match(/^(\d+)\/(\d+)$/);
    if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
}

/**
 * A number is "nice" for a given set of allowed denominators.
 * Default {1,2,3,4,8} covers most cases; cup fractions use {1,2,3,4} only
 * so that 3/8 cup (= 6 tbsp) is NOT promoted — it stays as "6 tbsp".
 */
function isNiceNumber(n: number, denoms = [1, 2, 3, 4, 8]): boolean {
    for (const d of denoms) {
        if (Math.abs(Math.round(n * d) - n * d) <= 0.03) return true;
    }
    return false;
}

function gcd(a: number, b: number): number {
    return b < 0.01 ? a : gcd(b, a % b);
}

/**
 * Express a positive number as a human-readable fraction string.
 * e.g. 1.5 → "1 1/2",  0.25 → "1/4",  2 → "2"
 */
function formatFraction(n: number): string {
    const whole = Math.floor(n);
    const frac = n - whole;

    if (frac < 0.01) return String(whole);

    let bestD = 1;
    let bestN = Math.round(frac);
    let bestErr = Math.abs(frac - bestN);

    for (const d of [1, 2, 3, 4, 8]) {
        const num = Math.round(frac * d);
        const err = Math.abs(frac - num / d);
        if (err < bestErr) { bestErr = err; bestD = d; bestN = num; }
    }

    const g = gcd(bestN, bestD);
    bestN /= g;
    bestD /= g;

    if (bestN === bestD) return String(whole + 1);

    const fracStr = `${bestN}/${bestD}`;
    return whole > 0 ? `${whole} ${fracStr}` : fracStr;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Try to parse the start of a serving_size_description into an amount + unit.
 * Everything after the unit (e.g. "= 4 tbsp" in "1/4 cup = 4 tbsp") is
 * captured as remainder but intentionally discarded by the caller.
 */
function parseServingSize(description: string): {
    amount: number;
    unitEntry: typeof ALL_UNITS[number];
    remainder: string;
} | null {
    const aliases: { alias: string; entry: typeof ALL_UNITS[number] }[] = [];
    for (const entry of ALL_UNITS) {
        for (const alias of entry.names) {
            aliases.push({ alias, entry });
        }
    }
    aliases.sort((a, b) => b.alias.length - a.alias.length);

    const numPattern = String.raw`(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*|\.\d+)`;

    for (const { alias, entry } of aliases) {
        const escapedAlias = alias.replace(/\./g, String.raw`\.`);
        const re = new RegExp(`^${numPattern}\\s*${escapedAlias}\\b(.*)$`, "i");
        const m = description.trim().match(re);
        if (m) {
            const amount = parseFraction(m[1]);
            if (amount !== null && amount > 0) {
                return { amount, unitEntry: entry, remainder: m[2].trim() };
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Given a total volume in tbsp and the unit originally entered, walk up the
 * promotion ladder and return the most readable representation.
 *
 * fl oz → treated as tbsp-level (starts promotion from tbsp).
 * pt    → treated as cup-level (starts promotion from cup).
 */
function formatAmount(totalTbsp: number, inputEntry: typeof ALL_UNITS[number]): string {
    // Map parse-only units onto the nearest ladder entry
    let startEntry = UNITS.find(u => u.display === inputEntry.display);
    if (!startEntry) {
        if (inputEntry.display === "fl oz") {
            startEntry = UNITS.find(u => u.display === "tbsp")!;
        } else {
            startEntry = UNITS.find(u => u.display === "cup")!;
        }
    }

    let currentEntry = startEntry;
    let currentAmount = totalTbsp / startEntry.tbsp;

    // Promotion: original logic — walk up ladder when amount >= threshold and result is a nice fraction
    for (let i = UNITS.indexOf(startEntry); i < UNITS.length - 1; i++) {
        const nextEntry = UNITS[i + 1];
        const threshold = PROMOTE_AT[currentEntry.display] ?? Infinity;
        const amountInNext = totalTbsp / nextEntry.tbsp;
        const cupDenoms = currentEntry.display === "tbsp" ? [1, 2, 3, 4] : [1, 2, 3, 4, 8];
        if (currentAmount >= threshold && isNiceNumber(amountInNext, cupDenoms)) {
            currentEntry = nextEntry;
            currentAmount = amountInNext;
        } else {
            break;
        }
    }

    // Check whether formatFraction would give an accurate representation.
    // formatFraction uses best-fit, so we verify it round-trips within 2%.
    const formatted = formatFraction(currentAmount);
    const roundTrip = parseFraction(formatted) ?? 0;
    const accurate = Math.abs(roundTrip - currentAmount) / (currentAmount || 1) < 0.02;

    if (accurate) {
        const display = currentAmount > 1 && currentEntry.display === "cup" ? "cups" : currentEntry.display;
        return `${formatted} ${display}`;
    }

    // Not accurate in the current unit — try descending the ladder for a nice fraction
    const currentIdx = UNITS.indexOf(currentEntry);
    for (let i = currentIdx - 1; i >= 0; i--) {
        const smallerEntry = UNITS[i];
        const amountInSmaller = totalTbsp / smallerEntry.tbsp;
        const formattedSmaller = formatFraction(amountInSmaller);
        const roundTripSmaller = parseFraction(formattedSmaller) ?? 0;
        if (isNiceNumber(amountInSmaller)) {
            const display = amountInSmaller > 1 && smallerEntry.display === "cup" ? "cups" : smallerEntry.display;
            return `${formattedSmaller} ${display}`;
        }
        // Even if not a nice fraction, use a decimal in this smaller unit
        const amountStr = amountInSmaller.toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
        void roundTripSmaller; // unused but kept for symmetry
        return `${amountStr} ${smallerEntry.display}`;
    }

    // Already at the smallest unit — show decimal
    const amountStr = currentAmount.toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
    return `${amountStr} ${currentEntry.display}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable ingredient summary.
 *
 * When the serving_size_description starts with a recognisable US volume
 * amount, the output reads like a real recipe line:
 *   "1 1/2 cups flour"   rather than   "3 x (1/2 cup) flour"
 *
 * Promotion ladder (output units only): tsp → tbsp → cup → qt → gal
 * fl oz and pt are parsed but never appear in output.
 * Irregular amounts that don't simplify to a nice fraction stay in the
 * smaller unit (e.g. 9 tbsp stays as "9 tbsp").
 *
 * Falls back to the original "N x (description) name" format for
 * non-volume serving sizes like "1 large egg" or "to taste".
 */
export function generateIngredientSummary(
    nutrition: INutrition,
    food?: IFood,
    recipe?: IRecipe,
    servings: number = 1
): string | undefined {

    if (!food && !recipe) return undefined;

    const name = food
        ? food.name + (food.subtype ? `, ${food.subtype}` : "")
        : recipe!.name;

    const desc = nutrition?.serving_size_description ?? "";
    const parsed = parseServingSize(desc);

    let unitLine: string;

    if (parsed) {
        // Smart path: recognised volume unit — multiply and reformat.
        // The remainder (e.g. "= 4 tbsp" in "1/4 cup = 4 tbsp") is discarded.
        const totalTbsp = parsed.amount * servings * parsed.unitEntry.tbsp;
        unitLine = formatAmount(totalTbsp, parsed.unitEntry);
    } else {
        // Check whether the description starts with a plain number followed by
        // arbitrary text (e.g. "2 grapes", "1 slice", "3 crackers").
        // If so, multiply the count and keep the rest of the text as-is.
        const countMatch = desc.trim().match(/^(\d+\.?\d*|\d+\/\d+)\s+(.+)$/);
        if (countMatch) {
            const count = (parseFraction(countMatch[1]) ?? 0) * servings;
            const label = countMatch[2];
            // Use a whole number if possible, otherwise one decimal place
            const countStr = Number.isInteger(count) ? String(count) : count.toFixed(1);
            unitLine = `${countStr} ${label}`;
        } else {
            // True fallback: nothing recognisable at the start
            unitLine = `${servings} x (${desc})`;
        }
    }

    // Weight annotation — only when non-zero
    const oz = (nutrition.serving_size_oz ?? 0) * servings;
    const g  = (nutrition.serving_size_g  ?? 0) * servings;
    const weightStr = oz > 0 || g > 0
        ? ` (${oz.toFixed(1)} oz/${g.toFixed(1)} g)`
        : "";

    return `${unitLine} ${name}${weightStr}`.trim();
}