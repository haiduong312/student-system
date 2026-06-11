CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'CANCELLED');

CREATE TABLE "assessments" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "career_goal_id" TEXT NOT NULL,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_question_items" (
  "id" TEXT NOT NULL,
  "assessment_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assessment_question_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessments_student_status_created_idx" ON "assessments"("student_id", "status", "created_at");
CREATE INDEX "assessments_career_goal_status_idx" ON "assessments"("career_goal_id", "status");
CREATE UNIQUE INDEX "assessment_question_items_assessment_question_unique" ON "assessment_question_items"("assessment_id", "question_id");
CREATE INDEX "assessment_question_items_assessment_order_idx" ON "assessment_question_items"("assessment_id", "order_index");
CREATE INDEX "assessment_question_items_skill_idx" ON "assessment_question_items"("skill_id");

ALTER TABLE "assessments"
  ADD CONSTRAINT "assessments_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessments"
  ADD CONSTRAINT "assessments_career_goal_id_fkey"
  FOREIGN KEY ("career_goal_id") REFERENCES "career_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assessment_question_items"
  ADD CONSTRAINT "assessment_question_items_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_question_items"
  ADD CONSTRAINT "assessment_question_items_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assessment_question_items"
  ADD CONSTRAINT "assessment_question_items_skill_id_fkey"
  FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
