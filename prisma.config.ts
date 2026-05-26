import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Also load .env.local so Prisma CLI sees the same values as Next.js dev/build.
// (.env was loaded above; .env.local takes precedence per Next.js convention.)
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
