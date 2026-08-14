# Dev

## Database migrations

If you want to change the schema:

1. Contact whoever on the team could be impacted.
2. Change `packages/db/prisma/schema.prisma`.
3. Run `make migrate-dev NAME=description` (creates a migration file, which you may want to review/edit).
4. Run `make up` to verify the migration applies cleanly and the app starts.
5. Commit and push :)
