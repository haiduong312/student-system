CREATE TYPE "LearningResourceType" AS ENUM ('COURSE', 'VIDEO', 'DOCUMENT', 'ARTICLE', 'BOOK', 'PRACTICE', 'PROJECT', 'CERTIFICATE', 'TOOL');
CREATE TYPE "ResourceProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

CREATE TABLE "learning_resources" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "resource_type" "LearningResourceType" NOT NULL,
  "url" VARCHAR(500),
  "provider" VARCHAR(150),
  "difficulty_level" "DifficultyLevel",
  "estimated_duration" VARCHAR(100),
  "language" VARCHAR(50),
  "is_free" BOOLEAN NOT NULL DEFAULT true,
  "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "learning_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_resource_skills" (
  "id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "target_level" "SkillLevel",
  "roadmap_phase" "RoadmapPhase",
  "relevance_score" INTEGER NOT NULL DEFAULT 0,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "learning_resource_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recommendation_template_resources" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recommendation_template_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_recommendation_resources" (
  "id" TEXT NOT NULL,
  "recommendation_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "resource_title" VARCHAR(200) NOT NULL,
  "resource_description" TEXT,
  "resource_type" "LearningResourceType" NOT NULL,
  "resource_url" VARCHAR(500),
  "provider" VARCHAR(150),
  "estimated_duration" VARCHAR(100),
  "difficulty_level" "DifficultyLevel",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_recommendation_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_resource_progress" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "recommendation_id" TEXT,
  "status" "ResourceProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "last_accessed_at" TIMESTAMP(3),
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_resource_progress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learning_resources_type_status_idx" ON "learning_resources"("resource_type", "status");
CREATE INDEX "learning_resources_status_title_idx" ON "learning_resources"("status", "title");
CREATE INDEX "learning_resources_provider_idx" ON "learning_resources"("provider");
CREATE INDEX "learning_resources_title_idx" ON "learning_resources"("title");

CREATE UNIQUE INDEX "learning_resource_skills_resource_skill_level_unique" ON "learning_resource_skills"("resource_id", "skill_id", "target_level");
CREATE INDEX "learning_resource_skills_resource_idx" ON "learning_resource_skills"("resource_id");
CREATE INDEX "learning_resource_skills_skill_idx" ON "learning_resource_skills"("skill_id");
CREATE INDEX "learning_resource_skills_skill_level_idx" ON "learning_resource_skills"("skill_id", "target_level");

CREATE UNIQUE INDEX "recommendation_template_resources_template_resource_unique" ON "recommendation_template_resources"("template_id", "resource_id");
CREATE INDEX "recommendation_template_resources_template_idx" ON "recommendation_template_resources"("template_id");
CREATE INDEX "recommendation_template_resources_resource_idx" ON "recommendation_template_resources"("resource_id");
CREATE INDEX "recommendation_template_resources_template_order_idx" ON "recommendation_template_resources"("template_id", "order_index");

CREATE UNIQUE INDEX "student_recommendation_resources_recommendation_resource_unique" ON "student_recommendation_resources"("recommendation_id", "resource_id");
CREATE INDEX "student_recommendation_resources_recommendation_idx" ON "student_recommendation_resources"("recommendation_id");
CREATE INDEX "student_recommendation_resources_resource_idx" ON "student_recommendation_resources"("resource_id");
CREATE INDEX "student_recommendation_resources_recommendation_order_idx" ON "student_recommendation_resources"("recommendation_id", "order_index");

CREATE UNIQUE INDEX "student_resource_progress_student_resource_unique" ON "student_resource_progress"("student_id", "resource_id");
CREATE INDEX "student_resource_progress_student_idx" ON "student_resource_progress"("student_id");
CREATE INDEX "student_resource_progress_resource_idx" ON "student_resource_progress"("resource_id");
CREATE INDEX "student_resource_progress_recommendation_idx" ON "student_resource_progress"("recommendation_id");
CREATE INDEX "student_resource_progress_student_status_idx" ON "student_resource_progress"("student_id", "status");

ALTER TABLE "learning_resource_skills"
  ADD CONSTRAINT "learning_resource_skills_resource_id_fkey"
  FOREIGN KEY ("resource_id") REFERENCES "learning_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_resource_skills"
  ADD CONSTRAINT "learning_resource_skills_skill_id_fkey"
  FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recommendation_template_resources"
  ADD CONSTRAINT "recommendation_template_resources_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "recommendation_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recommendation_template_resources"
  ADD CONSTRAINT "recommendation_template_resources_resource_id_fkey"
  FOREIGN KEY ("resource_id") REFERENCES "learning_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_recommendation_resources"
  ADD CONSTRAINT "student_recommendation_resources_recommendation_id_fkey"
  FOREIGN KEY ("recommendation_id") REFERENCES "student_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_recommendation_resources"
  ADD CONSTRAINT "student_recommendation_resources_resource_id_fkey"
  FOREIGN KEY ("resource_id") REFERENCES "learning_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_resource_progress"
  ADD CONSTRAINT "student_resource_progress_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_resource_progress"
  ADD CONSTRAINT "student_resource_progress_resource_id_fkey"
  FOREIGN KEY ("resource_id") REFERENCES "learning_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_resource_progress"
  ADD CONSTRAINT "student_resource_progress_recommendation_id_fkey"
  FOREIGN KEY ("recommendation_id") REFERENCES "student_recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
