# Jev recipe sharing

Decision recipes are published as immutable reviewed snapshots: portable v1 document plus a
mandatory successful worked example (input, compiled state, normalized answers, model and UTC
completion time). Public `/d/{reference}` viewers show stored results immediately. There is no
public execution or provider call. The `/m#recipes` gallery supports search, tag/author filters,
ordering, pagination and authenticated **My recipes** management. `/d` redirects to that gallery.

## Rollout

1. Back up the target database and run the existing `dotnet run --AppTasks=migrate` process from
   `MyApp` to apply **Migration1010**. It freezes the new `PublishedRecipe` table, including
   owner-scoped unique creation receipts and text JSON columns. The `PublishedDecision` model
   maps to this existing table with an explicit alias; the class rename does not rename stored data. Existing migrations are unchanged.
2. Deploy the APIs, `/d` viewer, gallery assets, generated DTOs and updated `/embed/register.html`
   together. Registration requires a pinned caller-origin/source/nonce handshake and an explicit
   grant to the displayed requesting host; keys are never posted to a wildcard origin.
3. Release the Jev client after these routes are available. Old hosts return actionable unavailable
   errors without affecting local save/run behavior. No migration runs merely by adding these files.

## API and lifecycle

- API-key writes: `POST /publish/decision`, `PUT /publish/decision/{ExternalRef}` and conditional
  `DELETE /publish/decision/{ExternalRef}?revision=...`.
- Anonymous detail/catalog: `GET /publish/decision/{ExternalRef}` and `GET /publish/decisions`.
- Owner catalog: `GET /publish/decisions/mine`, accepting a validated API key or authenticated owner
  session. Cookie-authenticated deletion uses a separate DTO at
  `DELETE /publish/decisions/mine/{ExternalRef}?revision=...`, with matching `Origin` and
  `X-Recipe-Management: 1` headers.
- Portable download: `/d/{ExternalRef}/recipe.json`, with UTF-8 filename attachment handling.

Create retries use an owner-scoped idempotency key and reject changed content for that key. Updates
retain the reference, require the expected revision and treat identical content as a no-op.
Unpublishing reserves the old reference and removes detail/download/catalog access; a new publication
uses a new reference. Local deletion and import replacement leave public shares available for separate
owner management. Public responses expose only explicit projections, never internal owner IDs or keys.

Limits are 512 KiB for the document, 2 MiB for the execution and 3 MiB for the request/detail envelope,
with bounded nesting. Query pagination caps at 50 rows and an offset of 10,000. Each process limits
publisher writes to 20/minute, anonymous queries to 120/minute per address, and creation receipts
(including tombstones) to 1,000 per owner. Keep hosting request limits enabled; rate counters are
process-local. Errors distinguish validation, ownership, unavailable shares, stale revisions, limits
and throttling. Public content uses revalidating cache headers.

## Verification

```sh
dotnet test MyApp.Tests/MyApp.Tests.csproj --filter 'FullyQualifiedName~DecisionPublishTests'
```

Tests use temporary SQLite databases and the shared `MyApp.Tests/fixtures/jev-sharing-contract.json`
corpus. They verify contract parity, frozen migration compatibility, DOM round-trips, idempotency,
ownership, revisions, revocation, size limits and public allowlists. The PostgreSQL SQL-generation
check validates text columns and the unique owner receipt index. To exercise PostgreSQL round-trips,
set `JEV_TEST_POSTGRES` to a **disposable test database** before the same command. That test creates
and drops only a random `jev_test_*` schema; it does not read application records. Without that
variable the live PostgreSQL test is explicitly skipped.

The llms repository contains Jev sharing/component tests and `tests/verify_jev_sharing_browser.py`
for a local fixture publisher. `tests/verify_jev_browser.py --fixture jev-public-gallery` tests
the actual gallery component and registration grant page from the sibling ubixar checkout
(or an explicitly supplied `--publisher-root`). Use isolated fixture accounts and data, never the production gallery.
Current verification includes SQLite plus desktop/mobile light/dark component and public-viewer
checks; live PostgreSQL was unavailable on the implementation machine. These changes have not been
deployed and no production migration has run.
