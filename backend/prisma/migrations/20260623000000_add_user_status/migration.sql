CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "users"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");
