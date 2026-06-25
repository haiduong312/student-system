ALTER TABLE "assessments"
  ADD COLUMN "specialization_id" TEXT;

CREATE INDEX "assessments_scope_status_created_idx"
  ON "assessments"("student_id", "career_goal_id", "specialization_id", "status", "created_at");

CREATE INDEX "assessments_specialization_status_idx"
  ON "assessments"("specialization_id", "status");

ALTER TABLE "assessments"
  ADD CONSTRAINT "assessments_specialization_id_fkey"
  FOREIGN KEY ("specialization_id") REFERENCES "specializations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
