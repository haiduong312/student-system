-- Add skill classification and default requirement metadata.
-- Existing skills are preserved and receive CAREER_SPECIFIC with baseline defaults.
CREATE TYPE "SkillType" AS ENUM ('COMMON', 'CAREER_SPECIFIC');

ALTER TABLE "skills"
  ADD COLUMN "type" "SkillType" NOT NULL DEFAULT 'CAREER_SPECIFIC',
  ADD COLUMN "default_required_level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "default_weight" DECIMAL(6, 2) NOT NULL DEFAULT 1;

CREATE INDEX "skills_type_status_idx" ON "skills"("type", "status");
