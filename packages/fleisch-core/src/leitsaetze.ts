import type { ProduktLeitsatz } from "./types";

/** Product Leitsätze (CharcuCalc catalog, incl. maxFett). */
export const PRODUKT_LEITSAETZE: Record<string, ProduktLeitsatz> = {
  "2.222.1": {
    id: "2.222.1",
    kategorie: "Brühwurst",
    name: "Schinkenwurst / Brühwurst fein",
    minBEFFE: 8.0,
    maxFett: 30.0,
  },
  "2.223.1": {
    id: "2.223.1",
    kategorie: "Brühwurst",
    name: "Schinkenspicker / Bierwurst mit Einlage",
    minBEFFE: 9.5,
    maxFett: 28.0,
  },
  "2.4.2.2.6": {
    id: "2.4.2.2.6",
    kategorie: "Brühwurst",
    name: "Gelbwurst / Kalbskäse",
    minBEFFE: 9.5,
    maxFett: 30.0,
  },
  "2.2312.1": {
    id: "2.2312.1",
    kategorie: "Kochwurst",
    name: "Deli Leberwurst fein",
    minBEFFE: 10.0,
    maxFett: 35.0,
  },
  "2.2312.6": {
    id: "2.2312.6",
    kategorie: "Kochwurst",
    name: "Grobe Hausmacher Leberwurst",
    minBEFFE: 7.5,
    maxFett: 40.0,
  },
  "2.232.3": {
    id: "2.232.3",
    kategorie: "Kochwurst",
    name: "Hausmacher Rotwurst / Blutwurst",
    minMFE: 35.0,
    maxFett: 35.0,
  },
  "2.2333.4": {
    id: "2.2333.4",
    kategorie: "Kochwurst",
    name: "Schwartemagen",
    minMFE: 30.0,
    maxFett: 30.0,
  },
  "2.1.1": {
    id: "2.1.1",
    kategorie: "Feinkostsalat",
    name: "Fleischsalat (Standard)",
    minFleischbrät: 28.0,
    maxGurke: 25.0,
  },
  "2.1.2": {
    id: "2.1.2",
    kategorie: "Feinkostsalat",
    name: "Delikatess-Fleischsalat",
    minFleischbrät: 34.0,
    maxGurke: 16.0,
  },
  "2.1.4": {
    id: "2.1.4",
    kategorie: "Feinkostsalat",
    name: "Wurstsalat",
    minWurst: 50.0,
  },
};

/** Category default max fat when no product row matches (OS quality tiers). */
export const CATEGORY_DEFAULT_MAX_FETT: Record<string, number> = {
  Brühwurst: 30,
  bruehwurst: 30,
  Kochwurst: 35,
  kochwurst: 35,
  kochwurst_leber: 40,
  kochwurst_blut: 35,
  Feinkostsalat: 100,
  feinkostsalat: 100,
  feinkostsalat_wurst: 100,
};

export function produktLeitsaetzeList(): ProduktLeitsatz[] {
  return Object.values(PRODUKT_LEITSAETZE);
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss");
}

/**
 * Resolve a product Leitsatz by id, or by category+name fuzzy match.
 * Prefers exact id, then name containment either way.
 */
export function findProduktLeitsatz(
  categoryOrId: string,
  recipeName = "",
): ProduktLeitsatz | undefined {
  const byId = PRODUKT_LEITSAETZE[categoryOrId];
  if (byId) return byId;

  const cat = normalize(categoryOrId);
  const name = normalize(recipeName);
  const hay = `${cat} ${name}`.trim();
  if (!hay) return undefined;

  const list = produktLeitsaetzeList();
  const exactName = list.find((l) => normalize(l.name) === name);
  if (exactName) return exactName;

  const scored = list
    .map((l) => {
      const ln = normalize(l.name);
      const lk = normalize(l.kategorie);
      let score = 0;
      if (name && (ln.includes(name) || name.includes(ln))) score += 3;
      if (cat && (lk.includes(cat) || cat.includes(lk))) score += 1;
      // token hits (gelbwurst, leberwurst, fleischsalat, …)
      for (const token of name.split(/[^a-z0-9]+/).filter((t) => t.length >= 4)) {
        if (ln.includes(token)) score += 2;
      }
      return { l, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.l;
}

/** Effective max fat: product row wins, else category default. */
export function resolveMaxFettPct(
  category: string,
  recipeName = "",
  guidelineGroup?: string,
): number | undefined {
  const product = findProduktLeitsatz(category, recipeName);
  if (product?.maxFett != null) return product.maxFett;

  const keys = [guidelineGroup, category].filter(Boolean) as string[];
  for (const key of keys) {
    const hit = CATEGORY_DEFAULT_MAX_FETT[key] ?? CATEGORY_DEFAULT_MAX_FETT[normalize(key)];
    if (hit != null && hit < 100) return hit;
  }
  return undefined;
}
