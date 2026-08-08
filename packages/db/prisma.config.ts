import { defineConfig } from "prisma/config";

// Do NOT use the env() helper from "prisma/config" here: it throws
// immediately when the variable is missing, which happens during
// `prisma generate` at Docker image build time (no database yet).
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(url ? { datasource: { url } } : {}),
});
