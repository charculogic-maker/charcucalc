/** Shared meat / Leitsatz types (CharcuCalc-native lab fields). */

export type MeatClassLager = "FRIDGE" | "FREEZER";

export type LeitsatzKategorie =
  | "Brühwurst"
  | "Kochwurst"
  | "Rohwurst"
  | "Feinkostsalat";

/** Bizerba/GEHA class as stored in CharcuCalc JSON. */
export type Fleischklasse = {
  id: string;
  code: string;
  name: string;
  wasser: number;
  fett: number;
  ges_fs: number;
  be: number;
  beffe: number;
  temp_soll: number;
  lager: MeatClassLager;
};

/** Product Leitsatz row (CharcuCalc). */
export type ProduktLeitsatz = {
  id: string;
  kategorie: LeitsatzKategorie;
  name: string;
  minBEFFE?: number;
  maxFett?: number;
  minMFE?: number;
  /** Muskelfleischeinlagen (Blutwurst / Presssack), Gewichtsanteil */
  minEinlage?: number;
  /** Charaktergebende Zutat bei Feinkostsalaten */
  minCharakter?: number;
  charakterLabel?: string;
  maxGurke?: number;
  minFesteBestandteile?: number;
  /** @deprecated prefer minCharakter */
  minFleischbrät?: number;
  /** @deprecated prefer minCharakter */
  minWurst?: number;
  quelle?: string;
};

/** OS-facing meat-class shape (protein = BEFFE + BE). */
export type OsMeatFatClass = {
  classId: string;
  name: string;
  code?: string;
  proteinPercentage: number;
  collagenPercentage: number;
  fatPercentage: number;
  waterPercentage?: number;
  saturatedFatPercentage?: number;
  tempSoll?: number;
  lager?: MeatClassLager;
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

export type Big7Row = {
  label: string;
  value: string;
  indent: boolean;
};

export type NutritionMassShares = {
  totalProductKg: number;
  totalMeatKg: number;
  fatPercentage: number;
  saturatedFatPercentage: number;
  totalProteinPercentage: number;
};

export type SpiceDose = {
  name: string;
  gramsPerKg: number;
};

export type LeitsatzDeviation = {
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
  deviations: LeitsatzDeviation[];
};
