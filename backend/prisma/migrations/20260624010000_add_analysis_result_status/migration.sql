CREATE TYPE "AnalysisResultStatus" AS ENUM ('CURRENT', 'OBSOLETE');

ALTER TABLE "competency_analysis_results"
  ADD COLUMN "status" "AnalysisResultStatus" NOT NULL DEFAULT 'CURRENT';

WITH ranked_analysis AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "student_id", "career_goal_id", "specialization_id"
      ORDER BY "analyzed_at" DESC, "id" DESC
    ) AS "rank"
  FROM "competency_analysis_results"
)
UPDATE "competency_analysis_results" AS "analysis"
SET "status" = 'OBSOLETE'
FROM "ranked_analysis"
WHERE "analysis"."id" = "ranked_analysis"."id"
  AND "ranked_analysis"."rank" > 1;

CREATE INDEX "analysis_results_scope_status_analyzed_idx"
  ON "competency_analysis_results"("student_id", "career_goal_id", "specialization_id", "status", "analyzed_at");

CREATE INDEX "analysis_results_status_analyzed_idx"
  ON "competency_analysis_results"("status", "analyzed_at");

CREATE UNIQUE INDEX "analysis_results_current_scope_unique"
  ON "competency_analysis_results"("student_id", "career_goal_id", "specialization_id")
  WHERE "status" = 'CURRENT' AND "specialization_id" IS NOT NULL;

CREATE UNIQUE INDEX "analysis_results_current_null_specialization_unique"
  ON "competency_analysis_results"("student_id", "career_goal_id")
  WHERE "status" = 'CURRENT' AND "specialization_id" IS NULL;
