# Bangumi infrastructure

This directory is the Bangumi implementation of the app's provider-neutral
feature contracts. UI code should depend on feature models and providers, not
on Bangumi response shapes.

## Data flow

```text
app route
  -> feature query hook
  -> feature Provider contract
  -> Bangumi Provider implementation
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

## Directory roles

```text
bangumi/
├── transport/       shared HTTP transport
├── api-v0/          api.bgm.tv clients and schemas
├── api-next/        next.bgm.tv clients and schemas
├── catalog/         catalog Provider implementation
├── community/       community Adapter and Provider
├── discover/        discovery Adapter and Provider
├── discussions/     discussion Adapter and Provider
├── indexes/         index Provider implementation
├── people/          character/person Provider implementation
├── reviews/         comment/review Adapter and Provider
├── staff/           staff Provider implementation
├── subject-extras/  character/relation Provider implementation
└── users/           public user Adapter and Provider
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
- `<capability>/provider.ts`: implementation of the Provider contract declared
  in `src/features/<capability>/model.ts`. Providers coordinate API clients and
  adapters.

## Dependency rules

1. Routes and components must not import a Bangumi client or schema directly.
2. Feature hooks call a Provider and own query caching, retry, and loading
   state.
3. Feature models must not contain Bangumi response types or API field names.
4. Clients validate every external response with a Zod schema before returning
   it.
5. Adapters are pure functions so mapping and fallback behavior can be tested
   without the network or React Native.
6. Provider implementations may depend on feature contracts; feature contracts
   must not depend on the Bangumi implementation.

## Adding an endpoint

1. Define the provider-neutral result in the relevant feature `model.ts`.
2. Add or extend the Provider contract.
3. Add a Zod schema for the external response.
4. Add a small Client endpoint that fetches and parses the response.
5. Add a pure Adapter when the external shape differs from the domain model.
6. Implement the Provider method.
7. Call it from a feature query hook and render the domain model in the route.
8. Test parsing or mapping edge cases as pure logic.
