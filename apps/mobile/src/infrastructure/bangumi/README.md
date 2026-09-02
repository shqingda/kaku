# Bangumi infrastructure

This directory is the Bangumi implementation of the app's provider-neutral
feature models. UI code should depend on feature models, not on Bangumi
response shapes.

There is no swappable Provider interface. Hooks import named fetch functions
directly. Mapping stays in adapters so Bangumi JSON never leaks into screens.

## Data flow

```text
app route
  -> feature query hook / queryOptions
  -> Bangumi fetch function
  -> Bangumi Client
  -> HTTP requester
  -> Bangumi API

Bangumi JSON
  -> Schema.parse()
  -> validated Bangumi response
  -> Adapter
  -> provider-neutral feature model
  -> query hook
  -> app route
```

Prefetch uses the same `queryOptions` as the screen hook. Expo Router
`router.prefetch` warms the route JS; TanStack Query `prefetchQuery` /
`prefetchInfiniteQuery` warms Bangumi data. Both start on pointer-down
(`onPressIn`) of the control that navigates there.

## Directory roles

```text
bangumi/
├── transport/       shared HTTP transport
├── api-v0/          api.bgm.tv clients and schemas
├── api-next/        next.bgm.tv clients and schemas
├── catalog/         catalog fetch + mapping
├── community/       community Adapter and fetch functions
├── discover/        discovery Adapter and fetch functions
├── discussions/     discussion Adapter and fetch functions
├── indexes/         index fetch functions
├── people/          character/person fetch functions
├── reviews/         comment/review Adapter and fetch functions
├── staff/           staff fetch functions
├── subject-extras/  character/relation fetch functions
└── users/           public user Adapter and fetch functions
```

- `transport/http-client.ts`: shared headers, timeout handling, fetch behavior,
  and readable network errors.
- `api-v0/client.ts`: endpoint functions for the official `api.bgm.tv` API.
- `api-next/client.ts`: endpoint functions for the `next.bgm.tv` API used by
  discussions and some public community data.
- `api-v0/schemas.ts`: Zod schemas and inferred raw types for `api.bgm.tv`.
- `api-next/schemas.ts`: Zod schemas and raw types for `next.bgm.tv`.
- `<capability>/adapter.ts`: pure mapping from Bangumi-specific data to feature
  domain models. Adapters do not fetch data or manage React state.
- `<capability>/provider.ts`: named fetch functions that call clients and
  adapters. Community already used this shape; the other capabilities match it.

## Dependency rules

1. Routes and components must not import a Bangumi client or schema directly.
2. Feature hooks call a fetch function and own query caching, retry, and
   loading state. Prefetch helpers must reuse the same query options.
3. Feature models must not contain Bangumi response types or API field names.
4. Clients validate every external response with a Zod schema before returning
   it.
5. Adapters are pure functions so mapping and fallback behavior can be tested
   without the network or React Native.
6. Fetch functions may depend on feature models; feature models must not
   depend on the Bangumi implementation.

## Adding an endpoint

1. Define the provider-neutral result in the relevant feature `model.ts`.
2. Add a Zod schema for the external response.
3. Add a small Client endpoint that fetches and parses the response.
4. Add a pure Adapter when the external shape differs from the domain model.
5. Add a named fetch function in `provider.ts`.
6. Call it from a feature query hook (`queryOptions` if the screen or a
   list row will prefetch) and render the domain model in the route.
7. Test parsing or mapping edge cases as pure logic.
