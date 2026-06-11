ALTER TYPE "AssessmentStatus" ADD VALUE 'GRADED';

CREATE TABLE "assessment_answers" (
  "id" TEXT NOT NULL,
  "assessment_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "selected_option_id" TEXT NOT NULL,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_skill_results" (
  "id" TEXT NOT NULL,
  "assessment_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "calculated_level" INTEGER NOT NULL,
  "total_questions" INTEGER NOT NULL,
  "correct_questions" INTEGER NOT NULL,
  "level_breakdown" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assessment_skill_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_answers_assessment_question_unique" ON "assessment_answers"("assessment_id", "question_id");
CREATE INDEX "assessment_answers_assessment_idx" ON "assessment_answers"("assessment_id");
CREATE INDEX "assessment_answers_question_idx" ON "assessment_answers"("question_id");
CREATE UNIQUE INDEX "assessment_skill_results_assessment_skill_unique" ON "assessment_skill_results"("assessment_id", "skill_id");
CREATE INDEX "assessment_skill_results_skill_idx" ON "assessment_skill_results"("skill_id");

ALTER TABLE "assessment_answers"
  ADD CONSTRAINT "assessment_answers_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_answers"
  ADD CONSTRAINT "assessment_answers_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assessment_answers"
  ADD CONSTRAINT "assessment_answers_selected_option_id_fkey"
  FOREIGN KEY ("selected_option_id") REFERENCES "assessment_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assessment_skill_results"
  ADD CONSTRAINT "assessment_skill_results_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_skill_results"
  ADD CONSTRAINT "assessment_skill_results_skill_id_fkey"
  FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
