# Dev

## Database migrations

If you want to change the schema:

1. Contact whoever on the team could be impacted.
2. Change `packages/db/prisma/schema.prisma`.
3. Run `make migrate-dev NAME=description` (creates a migration file, which you may want to review/edit).
4. Run `make up` to verify the migration applies cleanly and the app starts.
5. Commit and push :)




## Test data (seed)

To populate your local db with a few test users and one test document:

=> Rebuild the migrate image to be sure (new dev dependencies)
   ```
   docker compose build migrate
   ```

=> Run (this starts `db` automatically, applies pending migrations, then seeds):
   ```
   docker compose run --rm \
      -u "$(id -u):$(id -g)" \
      -v "$(pwd)/packages/db:/app/packages/db" \
      migrate \
      sh -c "npx prisma generate && npx prisma migrate deploy && npx tsx prisma/seed.ts"
   ```

Users (each also gets a private space of their own):

   | Platform role | Name   | Email             | Password    |
   |---------------|--------|-------------------|-------------|
   | ADMIN         | zaphod | zaphod@test.local | password123 |
   | USER          | alice  | alice@test.local  | password123 |
   | USER          | bob    | bob@test.local    | password123 |
   | USER          | tim    | tim@test.local    | password123 |

Shared groups:

   | Group    | alice | bob   | tim    | zaphod |
   |----------|-------|-------|--------|--------|
   | synctext | OWNER | ADMIN | MEMBER | —      |
   | collab   | —     | OWNER | MEMBER | —      |

Friendships (ACCEPTED; only friends can be added to a group):

   | Requested by | Friend |
   |--------------|--------|
   | bob          | alice  |
   | alice        | tim    |

   zaphod has none: adding him to a group is refused.

Documents:

   | id              | Title           | Group    | Created by | Grants     |
   |-----------------|-----------------|----------|------------|------------|
   | test-document   | Test Document   | synctext | alice      | alice, tim |
   | test-document-2 | Test Document 2 | synctext | bob        | bob        |
   | test-document-3 | Test Document 3 | collab   | bob        | bob        |

   e.g. `GET /api/documents/test-document` or `/doc/test-document`.
   5 snapshots on `test-document`.

(The seed only inserts (no upsert), so it fails on a non-empty db.)

## OAuth setup

1. Go to https://console.cloud.google.com/apis/credentials
2. Create project
3. `configure consent screen`. Fill the form, select `audience` as external
4. `Create credentials` > `OAuth client ID` > `Web application`
5. Under `Authorised JavaScript Origins` add
http://localhost:3000
https://localhost:8443
6. Under `Authorised redirect URIs` add
http://localhost:3000/api/auth/oauth/callback
https://localhost:8443/api/auth/oauth/callback
7. In `.env` file set,
GOOGLE_OAUTH_ENABLED=true
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
8. Confirm `APP_URL` in `.env` matches the browser origin exactly "http://localhost:3000" or "https://localhost:8443"
