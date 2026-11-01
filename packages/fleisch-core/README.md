# `@charculogic/fleisch-core`

Shared GEHA/Bizerba meat-class catalog, product Leitsätze (incl. max fat), and BIG-7 / Avery helpers.

**Source of truth:** `CharcuLogicOS/packages/fleisch-core`.  
CharcuCalc vendors a copy under `packages/fleisch-core` — sync with:

```bash
# from CharcuLogicOS
./scripts/sync-fleisch-core.sh
```

Both apps depend via `"@charculogic/fleisch-core": "file:packages/fleisch-core"` and set `transpilePackages: ["@charculogic/fleisch-core"]` in `next.config`.
