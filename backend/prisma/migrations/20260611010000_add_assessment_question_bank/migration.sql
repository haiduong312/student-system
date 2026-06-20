CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'TRUE_FALSE');
CREATE TYPE "QuestionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "assessment_questions" (
  "id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "question_text" TEXT NOT NULL,
  "question_type" "QuestionType" NOT NULL,
  "level" INTEGER NOT NULL,
  "explanation" TEXT,
  "status" "QuestionStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_options" (
  "id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "option_text" TEXT NOT NULL,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assessment_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessment_questions_skill_status_idx" ON "assessment_questions"("skill_id", "status");
CREATE INDEX "assessment_questions_type_status_idx" ON "assessment_questions"("question_type", "status");
CREATE INDEX "assessment_questions_level_status_idx" ON "assessment_questions"("level", "status");
CREATE INDEX "assessment_questions_created_at_idx" ON "assessment_questions"("created_at");
CREATE INDEX "assessment_options_question_order_idx" ON "assessment_options"("question_id", "order_index");

ALTER TABLE "assessment_questions"
  ADD CONSTRAINT "assessment_questions_skill_id_fkey"
  FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assessment_options"
  ADD CONSTRAINT "assessment_options_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
