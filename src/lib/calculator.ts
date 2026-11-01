/**
 * CharcuCalc recipe engine — wraps `@charculogic/fleisch-core`.
 */

import {
  checkProduktLeitsatz,
  computeBig7,
  formatAveryLabel as formatAveryLabelCore,
  formatBig7Clipboard as formatBig7ClipboardCore,
  formatDeNumber,
  big7Rows as big7RowsCore,
  type Big7,
  type Big7Row,
  type Fleischklasse,
  type LeitsatzDeviation,
  type LeitsatzKategorie,
  type LeitsatzStatus,
  type ProduktLeitsatz,
} from "@charculogic/fleisch-core";

export type Lager = "FRIDGE" | "FREEZER";

export type MeatClass = Fleischklasse;
export type Leitsatz = ProduktLeitsatz;
export type { LeitsatzKategorie, Big7, Big7Row };
export type Deviation = LeitsatzDeviation;

export type MassShare = {
  kg: number;
  percent: number;
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

export function parseAmount(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "" || normalized === ".") return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function formatDe(value: number, digits: number): string {
  return formatDeNumber(value, digits);
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

  const big7 = computeBig7(
    {
      totalProductKg: totalKg,
      totalMeatKg: classKg,
      fatPercentage: fett.percent,
      saturatedFatPercentage: gesaettigteFettsaeuren.percent,
      totalProteinPercentage: mfe.percent,
    },
    { saltGrams },
  );

  return {
    totalKg,
    wasser,
    beffe,
    be,
    fett,
    gesaettigteFettsaeuren,
    mfe,
    leitsatz: checkProduktLeitsatz(
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
    big7,
  };
}

export function big7Rows(big7: Big7): Big7Row[] {
  return big7RowsCore(big7);
}

export function formatBig7Clipboard(big7: Big7): string {
  return formatBig7ClipboardCore(big7);
}

export function formatAveryLabel(product: string, big7: Big7): string {
  return formatAveryLabelCore(product, big7);
}
