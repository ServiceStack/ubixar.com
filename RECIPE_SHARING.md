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

## Discovery tags and publisher usage

`GET /publish/decisions/tags` is the authoritative, public versioned suggestion catalogue.
Its context and task tags are suggestions; custom recipe tags remain valid. Both UIs cache
the catalogue for 24 hours and use the last cached list offline.

Publish/update envelopes accept `publisherStarred` (boolean) and `publisherRunCount`
(non-negative integer). These are publisher-reported local usage, captured on publish/update,
not community ratings or verified lifetime executions. llms counts retained local execution
records excluding pending submissions; clearing local history lowers the next published count.
The public projection exposes both fields. Updates change the content hash and revision,
while the recipe hash and downloadable recipe stay unchanged. Legacy clients preserve
previous usage when omitting the fields; legacy create idempotency hashes remain valid.

Catalogue `orderBy=recommended` sorts publisher favourites, recorded runs, update time,
then ID descending. `most-run` puts runs first, followed by favourites/time/ID. `newest`
and `name` remain supported. Usage stays with the publisher and is not inherited as local
usage when someone imports a recipe.

Deploy the server and run **Migration1011** before clients publish usage metadata.
It adds default false/zero columns without changing frozen Migration1010 or existing shares.

## Configurable catalogue and automatic tagging

Edit `DecisionPublishing.Tags` in `MyApp/appsettings.json`. Each entry has `Name`, an
optional `Label`, `Group` (`context` or `task`, default `task`) and an optional
`Description` explaining when that tag applies. This same list drives the public
tag catalogue and the inference candidates; its public ETag changes with the catalogue.
Configuration is validated at startup; restart the server after changing it. Existing client caches refresh within 24 hours.

For a document with no tags (missing or empty array), the publisher sends one raw
HTTP POST to `https://openrouter.ai/api/alpha/decisions`, using the configured
`TaggingModel`. Each candidate is a Noul question about the submitted recipe. It
keeps at most three tags with probabilities **strictly greater than 0.5**, ordered
by probability; ties use configured order. If fewer qualify, it keeps fewer.
Only configured tag names may be selected. Authored/custom tags bypass inference.

The server uses `Providers:OPENROUTER_API_KEY`, falling back to the environment
variable `OPENROUTER_API_KEY`. No API key belongs in the public tag configuration.
`AutoTagUntaggedRecipes` enables/disables inference; `TaggingTimeoutSeconds` defaults
to 10 (maximum 12 to fit the sharing client's response deadline). Calls use bounded
responses, no redirects or automatic retries, and at most four concurrent requests.
Missing credentials, saturation, provider errors, timeouts or invalid probabilities
leave the share untagged without blocking publication. Failures log no recipe or
provider body. Tests use a fake HTTP handler; no paid inference is required.

Inferred tags are **discovery metadata** on the published row, exposed by the detail
and catalogue APIs and used by tag filtering. The submitted document, download,
execution, recipe hash and content hash remain exact, preserving journal recovery
and create idempotency. Recovered publications and usage-only updates reuse existing tags;
changed untagged documents are evaluated again. If inference previously failed, a later changed
publication may try again; an unchanged retry does not incur a new call. Existing shares are not backfilled.
No additional database migration is needed for automatic tags.

Protocol reference: https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request

## Recorded usage examples

Recipes may contain an optional `examples[].execution` with the same allowlisted successful
execution format as the primary worked example. The execution input must match the example
input. All question results and probabilities are validated; raw provider responses, usage,
credentials and local run identifiers are rejected. These are recorded outputs, independent
of any user-reviewed `expected` answers. The public page renders them under Usage examples.

## Content and tags

Portable recipes have one optional `content` string describing the type of content they act on,
and up to three `tags`. Custom values are supported. Candidate groups in `DecisionPublishing:Tags`
are `content` or `tag`; legacy `context`/`task` groups remain accepted. The version 2 catalogue emits
the new names. Jev inference chooses the best single content type and up to three task tags over
50%. An explicit content value is retained when inferring missing tags. Derived discovery metadata
stays outside the submitted document and its hashes. The existing tag filter also matches content.
