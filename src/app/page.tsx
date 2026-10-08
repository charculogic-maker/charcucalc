"use client";

import { useEffect, useState } from "react";
import fleischklassenData from "@/data/fleischklassen.json";
import leitsaetzeData from "@/data/leitsatze.json";
import {
  big7Rows,
  calculateRecipe,
  formatAveryLabel,
  formatBig7Clipboard,
  formatDe,
  formatKg,
  formatSigned,
  parseAmount,
  type Deviation,
  type Lager,
  type Leitsatz,
  type LeitsatzKategorie,
  type MeatClass,
} from "@/lib/calculator";

const fleischklassen = Object.values(fleischklassenData) as MeatClass[];
const leitsaetze = Object.values(leitsaetzeData) as Leitsatz[];
const porkClasses = fleischklassen.filter((item) => item.id.startsWith("S_"));
const beefClasses = fleischklassen.filter((item) => item.id.startsWith("R_"));
const waterClass = fleischklassen.find((item) => item.id === "EIS");

const CATEGORIES: { id: LeitsatzKategorie; label: string }[] = [
  { id: "Brühwurst", label: "Brühwurst" },
  { id: "Kochwurst", label: "Kochwurst" },
  { id: "Feinkostsalat", label: "Feinkostsalate" },
];

const PARTIAL_AMOUNT = /^(\d+([.,]\d*)?|[.,]\d*)?$/;

function limitLine(leitsatz: Leitsatz): string {
  const parts: string[] = [];
  if (leitsatz.minBEFFE != null) {
    parts.push(`BEFFE mind. ${formatDe(leitsatz.minBEFFE, 1)} %`);
  }
  if (leitsatz.minMFE != null) {
    parts.push(`MFE mind. ${formatDe(leitsatz.minMFE, 1)} %`);
  }
  if (leitsatz.maxFett != null) {
    parts.push(`Fett max. ${formatDe(leitsatz.maxFett, 1)} %`);
  }
  if (leitsatz.minFleischbrät != null) {
    parts.push(`Fleischbrät mind. ${formatDe(leitsatz.minFleischbrät, 1)} %`);
  }
  if (leitsatz.maxGurke != null) {
    parts.push(`Gurke max. ${formatDe(leitsatz.maxGurke, 1)} %`);
  }
  if (leitsatz.minWurst != null) {
    parts.push(`Wurst mind. ${formatDe(leitsatz.minWurst, 1)} %`);
  }
  return parts.join(" · ");
}

function TempBadge({ temp, lager }: { temp: number; lager: Lager }) {
  const freezer = lager === "FREEZER";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        freezer ? "bg-cyan-950 text-cyan-300" : "bg-sky-950 text-sky-300"
      }`}
    >
      Max. {formatDe(temp, 0)}°C
    </span>
  );
}

function AmountRow({
  id,
  code,
  name,
  hint,
  unit,
  value,
  onChange,
  tempSoll,
  lager,
}: {
  id: string;
  code?: string;
  name: string;
  hint?: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  tempSoll?: number;
  lager?: Lager;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-800 py-3 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
      <label htmlFor={id} className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {code ? (
            <span className="inline-flex min-w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-800 px-2 py-1 font-mono text-sm text-emerald-300">
              {code}
            </span>
          ) : null}
          <span className="min-w-0 text-base font-medium text-zinc-100">{name}</span>
          {tempSoll != null && lager ? (
            <TempBadge temp={tempSoll} lager={lager} />
          ) : null}
        </span>
        {hint ? (
          <span className="mt-1 block text-sm text-zinc-400">{hint}</span>
        ) : null}
      </label>
      <span className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="0"
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (PARTIAL_AMOUNT.test(next)) onChange(next);
          }}
          className="h-14 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-right text-xl font-medium tabular-nums text-zinc-50 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:w-36 sm:flex-none"
        />
        <span className="w-12 shrink-0 text-sm text-zinc-400">{unit}</span>
      </span>
    </div>
  );
}

function ClassGroup({
  title,
  classes,
  amounts,
  onChange,
}: {
  title: string;
  classes: MeatClass[];
  amounts: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-medium tracking-wide text-zinc-400 uppercase">
        {title}
      </h2>
      <div className="mt-1">
        {classes.map((meatClass) => (
          <AmountRow
            key={meatClass.id}
            id={meatClass.id}
            code={meatClass.code}
            name={meatClass.name}
            hint={`BEFFE ${formatDe(meatClass.beffe, 1)} % · BE ${formatDe(meatClass.be, 1)} % · Fett ${formatDe(meatClass.fett, 1)} % · ges. FS ${formatDe(meatClass.ges_fs, 1)} %`}
            unit="kg"
            value={amounts[meatClass.id] ?? ""}
            onChange={(value) => onChange(meatClass.id, value)}
            tempSoll={meatClass.temp_soll}
            lager={meatClass.lager}
          />
        ))}
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  detail,
  alert,
}: {
  label: string;
  value: string;
  detail: string;
  alert: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${alert ? "text-red-400" : "text-zinc-50"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}

function failed(deviations: Deviation[], id: string): boolean {
  return deviations.some((item) => item.id === id && item.failed);
}

function deviationOf(deviations: Deviation[], id: string): Deviation | undefined {
  return deviations.find((item) => item.id === id);
}

export default function Home() {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [salt, setSalt] = useState("");
  const [category, setCategory] = useState<LeitsatzKategorie>("Brühwurst");
  const [leitsatzId, setLeitsatzId] = useState(leitsaetze[0].id);
  const [copyState, setCopyState] = useState<{
    source: "nutrition" | "avery";
    status: "done" | "error";
  } | null>(null);

  const visibleLeitsaetze = leitsaetze.filter((item) => item.kategorie === category);
  const leitsatz =
    visibleLeitsaetze.find((item) => item.id === leitsatzId) ??
    visibleLeitsaetze[0] ??
    leitsaetze[0];
  const amountsKg = Object.fromEntries(
    fleischklassen.map((meatClass) => [
      meatClass.id,
      parseAmount(amounts[meatClass.id] ?? ""),
    ]),
  );
  const result = calculateRecipe({
    classes: fleischklassen,
    amountsKg,
    saltGrams: parseAmount(salt),
    leitsatz,
    fleischbraetKg: parseAmount(amounts.fleischbraet ?? ""),
    gurkeKg: parseAmount(amounts.gurke ?? ""),
    wurstKg: parseAmount(amounts.wurst ?? ""),
  });
  const tone =
    result.totalKg <= 0 ? "idle" : result.leitsatz.passed ? "pass" : "fail";
  const nutrition = big7Rows(result.big7);
  const beffeDeviation = deviationOf(result.leitsatz.deviations, "beffe");
  const fettDeviation = deviationOf(result.leitsatz.deviations, "fett");
  const mfeDeviation = deviationOf(result.leitsatz.deviations, "mfe");

  useEffect(() => {
    if (!copyState) return;
    const timeout = window.setTimeout(() => setCopyState(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  function updateAmount(id: string, value: string) {
    setAmounts((current) => ({ ...current, [id]: value }));
  }

  function selectCategory(next: LeitsatzKategorie) {
    setCategory(next);
    setLeitsatzId((current) => {
      const stillVisible = leitsaetze.some(
        (item) => item.id === current && item.kategorie === next,
      );
      if (stillVisible) return current;
      return leitsaetze.find((item) => item.kategorie === next)?.id ?? current;
    });
  }

  async function copyText(source: "nutrition" | "avery", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState({ source, status: "done" });
    } catch {
      setCopyState({ source, status: "error" });
    }
  }

  function buttonLabel(source: "nutrition" | "avery", idle: string) {
    if (!copyState || copyState.source !== source) return idle;
    return copyState.status === "done"
      ? "In Zwischenablage kopiert"
      : "Kopieren nicht möglich";
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 md:px-8">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold text-zinc-950"
            aria-hidden
          >
            C
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">CharcuCalc</h1>
            <p className="text-sm text-zinc-400">
              Meister-Toolbox für Fleischtechnologie
            </p>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 shrink-0 rounded-full ${
              tone === "pass"
                ? "bg-emerald-500"
                : tone === "fail"
                  ? "bg-red-500"
                  : "bg-zinc-600"
            }`}
            aria-hidden
          />
          <p className="min-w-0 text-sm font-semibold">{result.leitsatz.message}</p>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Rezeptur</h2>
          <div
            role="tablist"
            aria-label="Leitsatzkategorie"
            className="mt-4 grid grid-cols-3 gap-2"
          >
            {CATEGORIES.map((item) => {
              const selected = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectCategory(item.id)}
                  className={`min-h-12 rounded-xl px-2 text-sm font-semibold ${
                    selected
                      ? "bg-emerald-500 text-zinc-950"
                      : "border border-zinc-700 bg-zinc-950 text-zinc-300"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <label htmlFor="leitsatz" className="mt-4 block text-sm text-zinc-400">
            Leitsatz / Sorte
          </label>
          <div className="relative mt-2">
            <select
              id="leitsatz"
              value={leitsatz.id}
              onChange={(event) => setLeitsatzId(event.target.value)}
              className="h-14 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 pr-12 pl-4 text-base text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {visibleLeitsaetze.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} — {item.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-zinc-400">
              ▾
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">{limitLine(leitsatz)}</p>

          <ClassGroup
            title="Schwein"
            classes={porkClasses}
            amounts={amounts}
            onChange={updateAmount}
          />
          <ClassGroup
            title="Rind"
            classes={beefClasses}
            amounts={amounts}
            onChange={updateAmount}
          />

          <section className="mt-6">
            <h2 className="text-sm font-medium tracking-wide text-zinc-400 uppercase">
              Zusätze
            </h2>
            <div className="mt-1">
              {waterClass ? (
                <AmountRow
                  id={waterClass.id}
                  code={waterClass.code}
                  name={waterClass.name}
                  hint="100 % Wasser"
                  unit="kg"
                  value={amounts[waterClass.id] ?? ""}
                  onChange={(value) => updateAmount(waterClass.id, value)}
                  tempSoll={waterClass.temp_soll}
                  lager={waterClass.lager}
                />
              ) : null}
              <AmountRow
                id="salz"
                name="Kochsalz / Nitritpökelsalz"
                hint="Absolute Menge in der Charge"
                unit="g"
                value={salt}
                onChange={setSalt}
              />
            </div>
          </section>

          {leitsatz.minFleischbrät != null ||
          leitsatz.maxGurke != null ||
          leitsatz.minWurst != null ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium tracking-wide text-zinc-400 uppercase">
                Salatanteile
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Diese Massen zählen zur Gesamtmasse und zum Leitsatzanteil.
              </p>
              <div className="mt-1">
                {leitsatz.minFleischbrät != null ? (
                  <AmountRow
                    id="fleischbraet"
                    name="Fleischbrät"
                    hint={`mind. ${formatDe(leitsatz.minFleischbrät, 1)} %`}
                    unit="kg"
                    value={amounts.fleischbraet ?? ""}
                    onChange={(value) => updateAmount("fleischbraet", value)}
                  />
                ) : null}
                {leitsatz.maxGurke != null ? (
                  <AmountRow
                    id="gurke"
                    name="Gurke"
                    hint={`max. ${formatDe(leitsatz.maxGurke, 1)} %`}
                    unit="kg"
                    value={amounts.gurke ?? ""}
                    onChange={(value) => updateAmount("gurke", value)}
                  />
                ) : null}
                {leitsatz.minWurst != null ? (
                  <AmountRow
                    id="wurst"
                    name="Wurst"
                    hint={`mind. ${formatDe(leitsatz.minWurst, 1)} %`}
                    unit="kg"
                    value={amounts.wurst ?? ""}
                    onChange={(value) => updateAmount("wurst", value)}
                  />
                ) : null}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <div
            className={`flex items-center gap-4 rounded-3xl border p-5 ${
              tone === "pass"
                ? "border-emerald-500/50 bg-emerald-950/50"
                : tone === "fail"
                  ? "border-red-500/50 bg-red-950/40"
                  : "border-zinc-700 bg-zinc-900"
            }`}
          >
            <div
              className={`h-16 w-16 shrink-0 rounded-full ${
                tone === "pass"
                  ? "bg-emerald-500 shadow-[0_0_32px_rgba(16,185,129,0.65)]"
                  : tone === "fail"
                    ? "bg-red-500 shadow-[0_0_32px_rgba(239,68,68,0.55)]"
                    : "bg-zinc-600"
              }`}
              aria-hidden
            />
            <div>
              <p className="text-xs tracking-wide text-zinc-400 uppercase">
                Leitsatzprüfung
              </p>
              <p
                role="status"
                aria-live="polite"
                className="text-lg leading-snug font-semibold"
              >
                {result.leitsatz.message}
              </p>
            </div>
          </div>

          {result.leitsatz.deviations.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {result.leitsatz.deviations.map((item) => (
                <li
                  key={item.id}
                  className={item.failed ? "text-red-300" : "text-emerald-300"}
                >
                  {item.label} {formatDe(item.actual, 1)} % · Soll{" "}
                  {item.direction === "min" ? "mind." : "max."}{" "}
                  {formatDe(item.limit, 1)} % · Abweichung{" "}
                  {formatSigned(item.delta, 1)} %
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Kpi
              label="Gesamtgewicht"
              value={`${formatKg(result.totalKg)} kg`}
              detail="Einwaage der Charge"
              alert={false}
            />
            <Kpi
              label="BEFFE"
              value={`${formatDe(result.beffe.percent, 1)} %`}
              detail={
                beffeDeviation
                  ? `${formatKg(result.beffe.kg)} kg · Abweichung ${formatSigned(beffeDeviation.delta, 1)} %`
                  : `${formatKg(result.beffe.kg)} kg`
              }
              alert={failed(result.leitsatz.deviations, "beffe")}
            />
            <Kpi
              label="Fett"
              value={`${formatDe(result.fett.percent, 1)} %`}
              detail={
                fettDeviation
                  ? `${formatKg(result.fett.kg)} kg · Abweichung ${formatSigned(fettDeviation.delta, 1)} %`
                  : `${formatKg(result.fett.kg)} kg`
              }
              alert={failed(result.leitsatz.deviations, "fett")}
            />
            <Kpi
              label="Wasser"
              value={`${formatDe(result.wasser.percent, 1)} %`}
              detail={`${formatKg(result.wasser.kg)} kg`}
              alert={false}
            />
            {leitsatz.minMFE != null ? (
              <Kpi
                label="MFE"
                value={`${formatDe(result.mfe.percent, 1)} %`}
                detail={
                  mfeDeviation
                    ? `${formatKg(result.mfe.kg)} kg · Abweichung ${formatSigned(mfeDeviation.delta, 1)} %`
                    : `${formatKg(result.mfe.kg)} kg`
                }
                alert={failed(result.leitsatz.deviations, "mfe")}
              />
            ) : null}
          </div>

          {leitsatz.minMFE != null ? (
            <p className="text-sm text-zinc-400">
              MFE = BEFFE + BE, also das Fleischeiweiß der Charge.
            </p>
          ) : null}

          {result.totalKg > 0 ? (
            <p className="text-sm text-zinc-400">
              BE {formatDe(result.be.percent, 1)} % ({formatKg(result.be.kg)} kg)
              {" · "}ges. FS {formatDe(result.gesaettigteFettsaeuren.percent, 1)} % (
              {formatKg(result.gesaettigteFettsaeuren.kg)} kg)
            </p>
          ) : null}

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold">Nährwerte</h2>
            <p className="text-sm text-zinc-400">BIG 7 nach LMIV, je 100 g</p>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">
                Nährwertdeklaration je 100 g nach LMIV
              </caption>
              <tbody>
                {nutrition.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-zinc-800 last:border-b-0"
                  >
                    <th
                      scope="row"
                      className={`py-2.5 text-left font-normal text-zinc-300 ${row.indent ? "pl-4" : ""}`}
                    >
                      {row.label}
                    </th>
                    <td className="py-2.5 text-right font-medium whitespace-nowrap tabular-nums text-zinc-50">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() =>
                copyText("nutrition", formatBig7Clipboard(result.big7))
              }
              disabled={result.totalKg <= 0}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-center text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {buttonLabel("nutrition", "Nährwerte in Zwischenablage kopieren")}
            </button>
            <button
              type="button"
              onClick={() =>
                copyText(
                  "avery",
                  formatAveryLabel(
                    `${leitsatz.id} ${leitsatz.name}`,
                    result.big7,
                  ),
                )
              }
              disabled={result.totalKg <= 0}
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-600 bg-zinc-950 px-4 text-center text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
            >
              {buttonLabel("avery", "Kopieren für Avery-Etikette")}
            </button>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Analysenwerte nach GEHA/Bizerba. Gesättigte Fettsäuren aus den
              Klassenwerten. Kohlenhydrate und Zucker als pauschaler Ansatz für
              Gewürze.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
