import { defineConfig } from "prisma/config";

const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://nguyenhaiduong@localhost:5432/student_system?schema=public";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: databaseUrl,
    },
});
