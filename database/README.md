# database/ — CockroachDB schema & migrations

- `migrations/` — numbered, append-only SQL files. Apply in order with the CockroachDB SQL shell:

  ```sh
  cockroach sql --url "$DATABASE_URL" -f migrations/0001_init.sql
  ```

- Schema rationale and query sketches: [docs/database-schema.md](../docs/database-schema.md).
- `0001_init.sql` is a **draft** — review the open decisions at the bottom of the schema doc
  before applying it to a real cluster.
