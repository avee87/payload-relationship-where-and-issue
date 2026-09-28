# Payload relationship `where` conditions dropped with MongoDB

## Setup

This is a minimal app (Payload 3.90.2, `@payloadcms/db-mongodb`) for demonstrating the issue. There are 2 collections:

- `categories` with `slug` and `state` fields, and a read access function returning a `Where`: `{ state: { not_equals: 'hidden' } }`
- `posts` with a `category` relationship and an optional `subtitle`

The repro is an integration test running against `mongodb-memory-server`, so no database is needed.

## The issue

With access control enforced (`overrideAccess: false`), querying through a relationship silently drops other conditions from the same `where` object:

```ts
await payload.find({
  collection: 'posts',
  overrideAccess: false,
  where: {
    'category.slug': { equals: 'a' },
    'category.state': { equals: 'active' },
  },
})
```

This returns posts from **every** readable category, not just category `a`. The same happens when a relationship condition sits next to an `exists` condition — the `exists` condition is ignored.

Wrapping the same conditions in `and: [...]` returns the correct result.

## Cause

Two things combine:

1. `validateSearchParams` (`payload/dist/database/queryValidation/validateSearchParams.js`) appends the related collection's read access to the **same** `where` object as an `and` key: `where.and = [...existingAnd, { 'category.state': { not_equals: 'hidden' } }]`.
2. `parseParams` in `@payloadcms/db-mongodb` stores some conditions under `$and` — two conditions resolving to the same path (`category.slug` and `category.state` both become `category: { $in: [...] }`), multiple operators on one field, and `exists` / `like` raw queries. When it later reaches the `and` key it assigns `result.$and = builtConditions`, overwriting them.

The query sent to MongoDB ends up containing only the access constraint.

Step 2 alone is also reachable without access control, by writing an explicit `and` next to such conditions (last test).

## Repro steps

- `pnpm install`
- `pnpm test:int`
- Observe 3 failing tests in `tests/int/relationshipWhere.int.spec.ts`:
  - two conditions on the same relationship — returns Post B from category `b`
  - relationship condition next to an `exists` condition — `exists` is ignored
  - two conditions on the same relationship next to an explicit `and` (`overrideAccess: true`) — `category.*` conditions are ignored
- The control test, with the same conditions wrapped in `and: [...]`, passes
