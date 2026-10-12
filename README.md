# Mini Library

[![Tests](https://github.com/Samin-Zaman1/mini-library/actions/workflows/tests.yml/badge.svg)](https://github.com/Samin-Zaman1/mini-library/actions/workflows/tests.yml)

A small library app (sign in, borrow and return books) used to practise testing at three levels: unit tests with Vitest, database tests that run real Postgres migrations in memory with PGlite, and end-to-end browser tests with Playwright. Everything runs in GitHub Actions on every push and pull request.

**[View the latest Playwright report](https://samin-zaman1.github.io/mini-library/)**, published from `main` on every run.

## What's covered

| Level | Spec | What the tests check |
| --- | --- | --- |
| Unit | `tests/unit/fees.test.ts` | no fine when not overdue, days × daily rate, negative days rejected |
| Unit | `tests/unit/math.test.ts` | small helpers: add, multiply, trimming names |
| Database | `tests/db/library.test.ts` | `borrow_book` takes one copy and records a loan; rejects a book with no copies and changes nothing; rejects an unknown book and writes no loan |
| E2E | `tests/e2e/borrow.spec.ts` | a signed-in member borrows a book: success message, stock badge drops, loan appears in the table |

## Design decisions

- **Business rules live in the database.** `supabase/migrations/001_schema.sql` defines `borrow_book` as a Postgres function that locks the book row (`for update`), checks stock, decrements it and inserts the loan in one transaction, so two people can't borrow the last copy.
- **Real Postgres, no server.** `tests/helpers/db.ts` boots PGlite (Postgres compiled to WASM) and applies every migration in order, so database tests run against the actual SQL in milliseconds, locally and in CI, with nothing to install.
- **Failure tests check nothing changed.** Rejection tests don't stop at the error message; they also assert stock is untouched and no loan row was written.
- **Each test starts clean.** `resetDb` truncates tables and restarts IDs before every test, so tests never depend on order.
- **Sign in once, reuse the session.** A Playwright `setup` project signs up a throwaway member with a random password, signs in, and saves the browser state; the E2E specs start already signed in. No credentials are stored in the repo.
- **Locators by role and label.** `getByRole` and `getByLabel` only, so the tests double as a basic accessibility check.

## CI

`.github/workflows/tests.yml` runs on every push and pull request to `main`: typecheck, unit and database tests, then the Playwright suite on Chromium. The HTML report is uploaded as an artifact on every run and published to GitHub Pages from `main`.

## Run locally

```bash
npm ci
npx playwright install chromium
npm test                # unit + database tests (Vitest)
npm run test:e2e        # browser tests (Playwright, starts the app on :3000)
npm run typecheck       # tsc --noEmit
```
