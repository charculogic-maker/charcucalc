export type Lager = "FRIDGE" | "FREEZER";

export type MeatClass = {
  id: string;
  code: string;
  name: string;
  wasser: number;
  fett: number;
  ges_fs: number;
  be: number;
  beffe: number;
  temp_soll: number;
  lager: Lager;
};

export type LeitsatzKategorie = "Brühwurst" | "Kochwurst" | "Feinkostsalat";

export type Leitsatz = {
  id: string;
  kategorie: LeitsatzKategorie;
  name: string;
  minBEFFE?: number;
  maxFett?: number;
  minMFE?: number;
  minFleischbrät?: number;
  maxGurke?: number;
  minWurst?: number;
};

export type MassShare = {
  kg: number;
  percent: number;
};

export type Deviation = {
  id: string;
  label: string;
  actual: number;
  limit: number;
  delta: number;
  direction: "min" | "max";
  failed: boolean;
};

export type LeitsatzStatus = {
  passed: boolean;
  message: string;
  deviations: Deviation[];
};

export type Big7 = {
  fett: number;
  gesaettigteFettsaeuren: number;
  eiweiss: number;
  kohlenhydrate: number;
  zucker: number;
  salz: number;
  brennwertKcal: number;
  brennwertKj: number;
};

export type RecipeResult = {
  totalKg: number;
  wasser: MassShare;
  beffe: MassShare;
  be: MassShare;
  fett: MassShare;
  gesaettigteFettsaeuren: MassShare;
  mfe: MassShare;
  leitsatz: LeitsatzStatus;
  big7: Big7;
};

export type Big7Row = {
  label: string;
  value: string;
  indent: boolean;
};

const SPICE_CARBS_G = 0.5;
const SPICE_SUGAR_G = 0.2;

export function parseAmount(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "" || normalized === ".") return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatDe(value: number, digits: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatSigned(value: number, digits: number): string {
  const formatted = formatDe(Math.abs(value), digits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatDe(0, digits);
}

export function formatKg(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value);
}

function share(kg: number, totalKg: number): MassShare {
  return {
    kg,
    percent: totalKg > 0 ? (kg / totalKg) * 100 : 0,
  };
}

function positiveAmount(value: number | undefined): number {
  return value != null && Number.isFinite(value) && value > 0 ? value : 0;
}

function pushLimit(
  deviations: Deviation[],
  check: {
    id: string;
    label: string;
    actual: number;
    limit: number | undefined;
    direction: "min" | "max";
  },
) {
  if (check.limit == null) return;
  const actual = roundTo(check.actual, 1);
  const delta = roundTo(actual - check.limit, 1);
  deviations.push({
    id: check.id,
    label: check.label,
    actual,
    limit: check.limit,
    delta,
    direction: check.direction,
    failed: check.direction === "min" ? actual < check.limit : actual > check.limit,
  });
}

function checkLeitsatz(
  leitsatz: Leitsatz,
  actuals: {
    beffe: number;
    fett: number;
    mfe: number;
    fleischbraet: number;
    gurke: number;
    wurst: number;
  },
  hasMass: boolean,
): LeitsatzStatus {
  if (!hasMass) {
    return { passed: false, message: "Keine Einwaage", deviations: [] };
  }

  const deviations: Deviation[] = [];
  pushLimit(deviations, {
    id: "beffe",
    label: "BEFFE",
    actual: actuals.beffe,
    limit: leitsatz.minBEFFE,
    direction: "min",
  });
  pushLimit(deviations, {
    id: "mfe",
    label: "MFE",
    actual: actuals.mfe,
    limit: leitsatz.minMFE,
    direction: "min",
  });
  pushLimit(deviations, {
    id: "fett",
    label: "Fett",
    actual: actuals.fett,
    limit: leitsatz.maxFett,
    direction: "max",
  });
  pushLimit(deviations, {
    id: "fleischbraet",
    label: "Fleischbrät",
    actual: actuals.fleischbraet,
    limit: leitsatz.minFleischbrät,
    direction: "min",
  });
  pushLimit(deviations, {
    id: "gurke",
    label: "Gurke",
    actual: actuals.gurke,
    limit: leitsatz.maxGurke,
    direction: "max",
  });
  pushLimit(deviations, {
    id: "wurst",
    label: "Wurst",
    actual: actuals.wurst,
    limit: leitsatz.minWurst,
    direction: "min",
  });

  const failures = deviations.filter((item) => item.failed);
  if (failures.length === 0) {
    return { passed: true, message: "Leitsatz konform", deviations };
  }

  const details = failures.map((item) => {
    const reason =
      item.direction === "min" ? `${item.label} zu niedrig` : `${item.label} zu hoch`;
    return `${reason} (${formatSigned(item.delta, 1)} %)`;
  });

  return {
    passed: false,
    message: `Leitsatz nicht erfüllt: ${details.join(" / ")}`,
    deviations,
  };
}

export function calculateRecipe(input: {
  classes: MeatClass[];
  amountsKg: Record<string, number>;
  saltGrams: number;
  leitsatz: Leitsatz;
  fleischbraetKg?: number;
  gurkeKg?: number;
  wurstKg?: number;
}): RecipeResult {
  let classKg = 0;
  let wasserKg = 0;
  let beffeKg = 0;
  let beKg = 0;
  let fettKg = 0;
  let gesFsKg = 0;

  for (const meatClass of input.classes) {
    const kg = positiveAmount(input.amountsKg[meatClass.id]);
    if (kg === 0) continue;

    classKg += kg;
    wasserKg += (kg * meatClass.wasser) / 100;
    beffeKg += (kg * meatClass.beffe) / 100;
    beKg += (kg * meatClass.be) / 100;
    fettKg += (kg * meatClass.fett) / 100;
    gesFsKg += (kg * meatClass.ges_fs) / 100;
  }

  const usesSalad =
    input.leitsatz.minFleischbrät != null ||
    input.leitsatz.maxGurke != null ||
    input.leitsatz.minWurst != null;
  const fleischbraetKg = usesSalad ? positiveAmount(input.fleischbraetKg) : 0;
  const gurkeKg = usesSalad ? positiveAmount(input.gurkeKg) : 0;
  const wurstKg = usesSalad ? positiveAmount(input.wurstKg) : 0;
  const totalKg = classKg + fleischbraetKg + gurkeKg + wurstKg;
  const wasser = share(wasserKg, totalKg);
  const beffe = share(beffeKg, totalKg);
  const be = share(beKg, totalKg);
  const fett = share(fettKg, totalKg);
  const gesaettigteFettsaeuren = share(gesFsKg, totalKg);
  const mfe = share(beffeKg + beKg, totalKg);
  const hasMass = totalKg > 0;
  const saltGrams = hasMass ? positiveAmount(input.saltGrams) : 0;
  const fettG = fett.percent;
  const eiweiss = mfe.percent;
  const kohlenhydrate = hasMass ? SPICE_CARBS_G : 0;
  const zucker = hasMass ? SPICE_SUGAR_G : 0;
  const salz = hasMass ? saltGrams / (totalKg * 10) : 0;
  const brennwertKcal = fettG * 9 + eiweiss * 4 + kohlenhydrate * 4;

  return {
    totalKg,
    wasser,
    beffe,
    be,
    fett,
    gesaettigteFettsaeuren,
    mfe,
    leitsatz: checkLeitsatz(
      input.leitsatz,
      {
        beffe: beffe.percent,
        fett: fett.percent,
        mfe: mfe.percent,
        fleischbraet: totalKg > 0 ? (fleischbraetKg / totalKg) * 100 : 0,
        gurke: totalKg > 0 ? (gurkeKg / totalKg) * 100 : 0,
        wurst: totalKg > 0 ? (wurstKg / totalKg) * 100 : 0,
      },
      hasMass,
    ),
    big7: {
      fett: fettG,
      gesaettigteFettsaeuren: gesaettigteFettsaeuren.percent,
      eiweiss,
      kohlenhydrate,
      zucker,
      salz,
      brennwertKcal,
      brennwertKj: brennwertKcal * 4.184,
    },
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
