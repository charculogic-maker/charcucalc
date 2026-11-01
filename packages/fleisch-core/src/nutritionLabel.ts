import type {
  Big7,
  Big7Row,
  NutritionMassShares,
  SpiceDose,
} from "./types";

const SPICE_CARBS_G = 0.5;
const SPICE_SUGAR_G = 0.2;

function formatDe(value: number, digits: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function saltGramsFromSpices(
  meatKg: number,
  spices: SpiceDose[],
): number {
  if (meatKg <= 0) return 0;
  let grams = 0;
  for (const spice of spices) {
    if (!spice.name.toLowerCase().includes("salz")) continue;
    grams += meatKg * Math.max(0, spice.gramsPerKg);
  }
  return grams;
}

export function computeBig7(
  breakdown: NutritionMassShares,
  options?: {
    saltGrams?: number;
    spices?: SpiceDose[];
  },
): Big7 {
  const hasMass = breakdown.totalProductKg > 0;
  const saltGrams =
    options?.saltGrams != null
      ? Math.max(0, options.saltGrams)
      : saltGramsFromSpices(breakdown.totalMeatKg, options?.spices ?? []);

  const fett = hasMass ? breakdown.fatPercentage : 0;
  const gesaettigteFettsaeuren = hasMass
    ? breakdown.saturatedFatPercentage
    : 0;
  const eiweiss = hasMass ? breakdown.totalProteinPercentage : 0;
  const kohlenhydrate = hasMass ? SPICE_CARBS_G : 0;
  const zucker = hasMass ? SPICE_SUGAR_G : 0;
  const salz = hasMass
    ? round2(saltGrams / (breakdown.totalProductKg * 10))
    : 0;
  const brennwertKcal = round2(fett * 9 + eiweiss * 4 + kohlenhydrate * 4);

  return {
    fett,
    gesaettigteFettsaeuren,
    eiweiss,
    kohlenhydrate,
    zucker,
    salz,
    brennwertKcal,
    brennwertKj: round2(brennwertKcal * 4.184),
  };
}

export function big7Rows(big7: Big7): Big7Row[] {
  const grams = (value: number) => `${formatDe(value, 1)} g`;

  return [
    {
      label: "Brennwert",
      value: `${formatDe(big7.brennwertKj, 0)} kJ / ${formatDe(big7.brennwertKcal, 0)} kcal`,
      indent: false,
    },
    { label: "Fett", value: grams(big7.fett), indent: false },
    {
      label: "davon gesättigte Fettsäuren",
      value: grams(big7.gesaettigteFettsaeuren),
      indent: true,
    },
    { label: "Kohlenhydrate", value: grams(big7.kohlenhydrate), indent: false },
    { label: "davon Zucker", value: grams(big7.zucker), indent: true },
    { label: "Eiweiß", value: grams(big7.eiweiss), indent: false },
    { label: "Salz", value: grams(big7.salz), indent: false },
  ];
}

export function formatBig7Clipboard(big7: Big7): string {
  const lines = big7Rows(big7).map(
    (row) => `${row.indent ? "  " : ""}${row.label}: ${row.value}`,
  );
  return ["Nährwertdeklaration je 100 g", ...lines].join("\n");
}

export function formatAveryLabel(product: string, big7: Big7): string {
  const lines = big7Rows(big7).map(
    (row) => `${row.indent ? "  " : ""}${row.label} ${row.value}`,
  );
  return [product, "Nährwerte je 100 g", ...lines].join("\n");
}

export function formatDeNumber(value: number, digits: number): string {
  return formatDe(value, digits);
}
