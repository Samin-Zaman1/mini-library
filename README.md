# Mini Library

[![Tests](https://github.com/Samin-Zaman1/mini-library/actions/workflows/tests.yml/badge.svg)](https://github.com/Samin-Zaman1/mini-library/actions/workflows/tests.yml)

A small library app (sign in, borrow and return books) used to practise testing. It has an Express API backed by PGlite (Postgres compiled to WASM), static pages that call the API, and a test suite being rebuilt from the ground up, starting with Vitest unit tests. Every push and pull request runs the typecheck and tests in GitHub Actions.

## What's covered

| Level | Spec | What the tests check |
| --- | --- | --- |
| Unit | `tests/unit/fees.test.ts` | `calculateFine`: zero days, one day, normal and large values, custom rate, negative days rejected, non-number input rejected |

## Design decisions

- **Business rules live in the database.** `borrow_book` and `return_book` are Postgres functions that lock the rows they touch (`for update`) and change stock and loans in one transaction, so two people can't borrow the last copy.
- **Real Postgres, no server to install.** The app runs on PGlite, persisted to `./data/library`. Migrations in `supabase/migrations` are applied in order on startup and recorded, so each runs once.
- **Sessions in an httpOnly cookie.** Login sets a signed JWT the page's scripts can't read; state-changing requests from another origin are rejected.
- **Runtime checks, not just types.** TypeScript types disappear at runtime, so functions like `calculateFine` validate their inputs explicitly.
- **No credentials in the repo.** Secrets and demo passwords come from environment variables; see `.env.example`.
- **The API is documented** in `openapi.yaml`.

## CI

`.github/workflows/tests.yml` runs on every push and pull request to `main`: install, typecheck, unit tests.

## Run locally

```bash
npm ci
cp .env.example .env    # then fill in the values
npm run seed            # creates the demo librarian and member accounts
npm run dev             # http://localhost:3000
npm test                # unit tests (Vitest)
npm run typecheck       # tsc --noEmit
```
