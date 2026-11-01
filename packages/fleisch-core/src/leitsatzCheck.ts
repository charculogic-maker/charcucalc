import type {
  LeitsatzDeviation,
  LeitsatzStatus,
  ProduktLeitsatz,
} from "./types";
import {
  saladCharakterLabel,
  saladMinCharakter,
} from "./leitsaetze";
import { formatDeNumber } from "./nutritionLabel";

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatSigned(value: number, digits: number): string {
  const formatted = formatDeNumber(Math.abs(value), digits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatDeNumber(0, digits);
}

function pushLimit(
  deviations: LeitsatzDeviation[],
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
    failed:
      check.direction === "min" ? actual < check.limit : actual > check.limit,
  });
}

/** CharcuCalc-style product Leitsatz check (BEFFE/Fett/MFE/Einlage/Salat). */
export function checkProduktLeitsatz(
  leitsatz: ProduktLeitsatz,
  actuals: {
    beffe: number;
    fett: number;
    mfe: number;
    einlage?: number;
    charakter?: number;
    feste?: number;
    /** @deprecated prefer charakter */
    fleischbraet?: number;
    gurke?: number;
    /** @deprecated prefer charakter */
    wurst?: number;
  },
  hasMass: boolean,
): LeitsatzStatus {
  if (!hasMass) {
    return { passed: false, message: "Keine Einwaage", deviations: [] };
  }

  const charakterActual =
    actuals.charakter ??
    actuals.fleischbraet ??
    actuals.wurst ??
    0;

  const deviations: LeitsatzDeviation[] = [];
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
    id: "einlage",
    label: "Muskelfleischeinlage",
    actual: actuals.einlage ?? 0,
    limit: leitsatz.minEinlage,
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
    id: "charakter",
    label: saladCharakterLabel(leitsatz),
    actual: charakterActual,
    limit: saladMinCharakter(leitsatz),
    direction: "min",
  });
  pushLimit(deviations, {
    id: "gurke",
    label: "Gurke / würzende Zutaten",
    actual: actuals.gurke ?? 0,
    limit: leitsatz.maxGurke,
    direction: "max",
  });
  pushLimit(deviations, {
    id: "feste",
    label: "Feste Bestandteile",
    actual: actuals.feste ?? 0,
    limit: leitsatz.minFesteBestandteile,
    direction: "min",
  });

  const failures = deviations.filter((item) => item.failed);
  if (failures.length === 0) {
    return { passed: true, message: "Leitsatz konform", deviations };
  }

  const details = failures.map((item) => {
    const reason =
      item.direction === "min"
        ? `${item.label} zu niedrig`
        : `${item.label} zu hoch`;
    return `${reason} (${formatSigned(item.delta, 1)} %)`;
  });

  return {
    passed: false,
    message: `Leitsatz nicht erfüllt: ${details.join(" / ")}`,
    deviations,
  };
}
