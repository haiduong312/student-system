import { PrismaPg } from '@prisma/adapter-pg';
import {
  AssignmentStatus,
  CatalogStatus,
  DifficultyLevel,
  NotificationChannel,
  NotificationLogStatus,
  NotificationType,
  Prisma,
  PrismaClient,
  ProjectStatus,
  QuestionStatus,
  QuestionType,
  RecommendationType,
  RoadmapPhase,
  SkillLevel,
  SkillType,
  TemplateStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const DEFAULT_DATABASE_URL =
  'postgresql://nguyenhaiduong@localhost:5432/student_system?schema=public';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL),
});

const BCRYPT_SALT_ROUNDS = 12;

type SeedSkillCategory = {
  name: string;
  description: string;
  roadmapPhase: RoadmapPhase;
};

type SeedSkill = {
  name: string;
  categoryName: string;
  description: string;
  type: SkillType;
  defaultRequiredLevel: number;
  defaultWeight: number;
};

type RequiredSkillSeed = {
  careerGoalName: string;
  specializationName?: string | null;
  skillName: string;
  requiredLevel: number;
  weight: number;
  learningOrder: number;
  roadmapPhase?: RoadmapPhase;
};

type SeedUser = {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
};

type SeedStudent = {
  email: string;
  studentCode: string;
  className: string;
  major: string;
  academicYear: string;
  phone: string;
  dateOfBirth: Date;
};

type SeedStudentProfile = {
  email: string;
  careerGoalName: string;
  specializationName: string | null;
  summary: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
};

type SeedStudentSkill = {
  email: string;
  skillName: string;
  currentLevel: number;
  description: string;
};

const careerGoalSeeds = [
  {
    name: 'Software Engineer',
    description:
      'Build, maintain, and improve software systems across frontend, backend, database, and deployment environments.',
  },
  {
    name: 'Data Analyst',
    description:
      'Analyze data, create reports, build dashboards, and support business decision-making.',
  },
  {
    name: 'QA Engineer',
    description:
      'Ensure software quality through manual testing, automation testing, and defect management.',
  },
];

const skillCategorySeeds: SeedSkillCategory[] = [
  {
    name: 'General IT',
    description: 'Core skills used across software, data, QA, and delivery work.',
    roadmapPhase: RoadmapPhase.CORE_FOUNDATION,
  },
  {
    name: 'Frontend',
    description: 'Client-side engineering skills for web interfaces and user experience.',
    roadmapPhase: RoadmapPhase.SPECIALIZATION,
  },
  {
    name: 'Backend',
    description: 'Server-side engineering skills for APIs, data access, and security.',
    roadmapPhase: RoadmapPhase.CAREER_TRACK,
  },
  {
    name: 'Mobile',
    description: 'Mobile application engineering skills for native-like experiences.',
    roadmapPhase: RoadmapPhase.SPECIALIZATION,
  },
  {
    name: 'DevOps',
    description: 'Deployment, automation, operating system, and observability skills.',
    roadmapPhase: RoadmapPhase.PRACTICE_PROJECT,
  },
  {
    name: 'Data',
    description: 'Data analysis, reporting, visualization, and basic data pipeline skills.',
    roadmapPhase: RoadmapPhase.CAREER_TRACK,
  },
  {
    name: 'QA',
    description: 'Testing, defect management, quality assurance, and automation skills.',
    roadmapPhase: RoadmapPhase.CAREER_TRACK,
  },
];

const specializationSeeds = [
  {
    careerGoalName: 'Software Engineer',
    name: 'Frontend Engineer',
    description:
      'Build responsive, accessible, and maintainable user interfaces for web products.',
  },
  {
    careerGoalName: 'Software Engineer',
    name: 'Backend Engineer',
    description:
      'Design APIs, database interactions, authentication, authorization, and secure services.',
  },
  {
    careerGoalName: 'Software Engineer',
    name: 'Mobile Engineer',
    description:
      'Build mobile applications with smooth navigation, usable interfaces, and reliable API integration.',
  },
  {
    careerGoalName: 'Software Engineer',
    name: 'DevOps Engineer',
    description:
      'Automate builds, deployments, monitoring, and cloud-based software operations.',
  },
  {
    careerGoalName: 'Data Analyst',
    name: 'Business Intelligence',
    description:
      'Turn business data into dashboards, metrics, and decision-ready reports.',
  },
  {
    careerGoalName: 'Data Analyst',
    name: 'Data Visualization',
    description:
      'Design effective charts, dashboards, and visual stories for different audiences.',
  },
  {
    careerGoalName: 'Data Analyst',
    name: 'Data Engineering Basics',
    description:
      'Prepare data pipelines, transformations, and data models for analytics use cases.',
  },
  {
    careerGoalName: 'QA Engineer',
    name: 'Manual Testing',
    description:
      'Plan, execute, and report manual test cases with clear defect documentation.',
  },
  {
    careerGoalName: 'QA Engineer',
    name: 'Automation Testing',
    description:
      'Automate regression tests and API checks to improve software quality feedback loops.',
  },
];

const skillSeeds: SeedSkill[] = [
  {
    name: 'Git',
    categoryName: 'General IT',
    description: 'Use version control for branching, commits, collaboration, and code history.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'SQL',
    categoryName: 'General IT',
    description: 'Query, filter, join, aggregate, and reason about relational data.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Problem Solving',
    categoryName: 'General IT',
    description: 'Break down technical problems and choose practical solution strategies.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Communication',
    categoryName: 'General IT',
    description: 'Explain technical work clearly in writing, meetings, and reviews.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 1,
    defaultWeight: 0.5,
  },
  {
    name: 'Teamwork',
    categoryName: 'General IT',
    description: 'Collaborate with teammates through planning, feedback, and shared ownership.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 1,
    defaultWeight: 0.5,
  },
  {
    name: 'English Reading',
    categoryName: 'General IT',
    description: 'Read technical documentation, tutorials, error messages, and release notes.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 1,
    defaultWeight: 0.5,
  },
  {
    name: 'REST API',
    categoryName: 'General IT',
    description: 'Understand HTTP resources, methods, status codes, and API integration basics.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Database Design',
    categoryName: 'General IT',
    description: 'Design entities, relationships, constraints, and normalized relational schemas.',
    type: SkillType.COMMON,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'HTML',
    categoryName: 'Frontend',
    description: 'Build semantic document structure for accessible web pages.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'CSS',
    categoryName: 'Frontend',
    description: 'Style layouts, components, typography, and responsive interfaces.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'JavaScript',
    categoryName: 'Frontend',
    description: 'Implement interactive behavior and client-side application logic.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'TypeScript',
    categoryName: 'Frontend',
    description: 'Use static typing to improve maintainability and reduce runtime errors.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'React',
    categoryName: 'Frontend',
    description: 'Build component-based user interfaces with state and reusable patterns.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'Next.js',
    categoryName: 'Frontend',
    description: 'Create React applications with routing, rendering strategies, and API features.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'UI/UX Basics',
    categoryName: 'Frontend',
    description: 'Apply basic usability, visual hierarchy, and interaction design principles.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Responsive Design',
    categoryName: 'Frontend',
    description: 'Build interfaces that adapt cleanly across desktop, tablet, and mobile screens.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'State Management',
    categoryName: 'Frontend',
    description: 'Model, update, and share application state predictably in user interfaces.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Node.js',
    categoryName: 'Backend',
    description: 'Build server-side JavaScript applications and tooling with Node.js.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'NestJS',
    categoryName: 'Backend',
    description: 'Build modular backend services using controllers, providers, modules, and guards.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'PostgreSQL',
    categoryName: 'Backend',
    description: 'Use PostgreSQL for relational persistence, indexing, and data integrity.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'Authentication',
    categoryName: 'Backend',
    description: 'Implement login, password hashing, token issuance, and session safety.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Authorization',
    categoryName: 'Backend',
    description: 'Control access by role, ownership, permissions, and policy checks.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Prisma ORM',
    categoryName: 'Backend',
    description: 'Model relational data and query safely through Prisma Client.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'API Security',
    categoryName: 'Backend',
    description: 'Protect APIs with validation, secure defaults, rate limits, and safe error handling.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'React Native',
    categoryName: 'Mobile',
    description: 'Build mobile applications with React Native components and platform APIs.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'Mobile UI',
    categoryName: 'Mobile',
    description: 'Design touch-friendly screens, spacing, navigation affordances, and feedback states.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'App Navigation',
    categoryName: 'Mobile',
    description: 'Implement stack, tab, deep link, and guarded mobile navigation flows.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Mobile API Integration',
    categoryName: 'Mobile',
    description: 'Connect mobile applications to APIs with loading, error, and offline-aware states.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Docker',
    categoryName: 'DevOps',
    description: 'Containerize applications and compose local development services.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'CI/CD',
    categoryName: 'DevOps',
    description: 'Automate testing, building, and deployment workflows.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Linux Basics',
    categoryName: 'DevOps',
    description: 'Use shell commands, permissions, processes, files, and services on Linux.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Cloud Deployment',
    categoryName: 'DevOps',
    description: 'Deploy applications to cloud environments with environment configuration.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Monitoring',
    categoryName: 'DevOps',
    description: 'Observe application health with logs, metrics, alerts, and dashboards.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Excel',
    categoryName: 'Data',
    description: 'Analyze tabular data with formulas, pivot tables, and structured reports.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Python',
    categoryName: 'Data',
    description: 'Use Python scripts and notebooks for data preparation and analysis.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Data Cleaning',
    categoryName: 'Data',
    description: 'Handle missing values, inconsistent formats, duplicates, and noisy data.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Data Visualization',
    categoryName: 'Data',
    description: 'Communicate insight through clear charts, dashboards, and visual encodings.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'Power BI',
    categoryName: 'Data',
    description: 'Build interactive BI reports, data models, measures, and dashboards.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'Dashboard Design',
    categoryName: 'Data',
    description: 'Design dashboards with useful metrics, layout, filters, and business context.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Basic Statistics',
    categoryName: 'Data',
    description: 'Apply descriptive statistics, distributions, and simple hypothesis thinking.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'ETL Basics',
    categoryName: 'Data',
    description: 'Extract, transform, and load data into analysis-ready structures.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Test Case Design',
    categoryName: 'QA',
    description: 'Design clear test cases with inputs, expected results, and coverage intent.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Bug Reporting',
    categoryName: 'QA',
    description: 'Report defects with reproducible steps, evidence, severity, and context.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Manual Testing',
    categoryName: 'QA',
    description: 'Execute exploratory and scripted tests against application requirements.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1,
  },
  {
    name: 'Selenium',
    categoryName: 'QA',
    description: 'Automate browser-based regression checks with Selenium.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
  {
    name: 'API Testing',
    categoryName: 'QA',
    description: 'Validate API contracts, responses, authentication, and failure cases.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 2,
    defaultWeight: 1.5,
  },
  {
    name: 'Test Automation Basics',
    categoryName: 'QA',
    description: 'Create maintainable automated tests with setup, assertions, and reporting.',
    type: SkillType.CAREER_SPECIFIC,
    defaultRequiredLevel: 3,
    defaultWeight: 2,
  },
];

const careerRequiredSkillSeeds: RequiredSkillSeed[] = [
  { careerGoalName: 'Software Engineer', skillName: 'Git', requiredLevel: 2, weight: 1, learningOrder: 1 },
  { careerGoalName: 'Software Engineer', skillName: 'SQL', requiredLevel: 2, weight: 1, learningOrder: 2 },
  { careerGoalName: 'Software Engineer', skillName: 'Problem Solving', requiredLevel: 2, weight: 1, learningOrder: 3 },
  { careerGoalName: 'Software Engineer', skillName: 'REST API', requiredLevel: 2, weight: 1, learningOrder: 4 },
  { careerGoalName: 'Software Engineer', skillName: 'Communication', requiredLevel: 1, weight: 0.5, learningOrder: 5 },
  { careerGoalName: 'Data Analyst', skillName: 'Excel', requiredLevel: 2, weight: 1, learningOrder: 1 },
  { careerGoalName: 'Data Analyst', skillName: 'SQL', requiredLevel: 2, weight: 1, learningOrder: 2 },
  { careerGoalName: 'Data Analyst', skillName: 'Basic Statistics', requiredLevel: 2, weight: 1, learningOrder: 3 },
  { careerGoalName: 'Data Analyst', skillName: 'Data Cleaning', requiredLevel: 2, weight: 1, learningOrder: 4 },
  { careerGoalName: 'Data Analyst', skillName: 'Communication', requiredLevel: 1, weight: 0.5, learningOrder: 5 },
  { careerGoalName: 'QA Engineer', skillName: 'Test Case Design', requiredLevel: 2, weight: 1, learningOrder: 1 },
  { careerGoalName: 'QA Engineer', skillName: 'Bug Reporting', requiredLevel: 2, weight: 1, learningOrder: 2 },
  { careerGoalName: 'QA Engineer', skillName: 'Manual Testing', requiredLevel: 2, weight: 1, learningOrder: 3 },
  { careerGoalName: 'QA Engineer', skillName: 'API Testing', requiredLevel: 1, weight: 0.5, learningOrder: 4 },
  { careerGoalName: 'QA Engineer', skillName: 'Communication', requiredLevel: 1, weight: 0.5, learningOrder: 5 },
];

const specializationRequiredSkillSeeds: RequiredSkillSeed[] = [
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'HTML', requiredLevel: 2, weight: 1, learningOrder: 1 },
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'CSS', requiredLevel: 2, weight: 1, learningOrder: 2 },
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'JavaScript', requiredLevel: 3, weight: 2, learningOrder: 3 },
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'TypeScript', requiredLevel: 2, weight: 1.5, learningOrder: 4 },
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'React', requiredLevel: 3, weight: 2, learningOrder: 5 },
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'Next.js', requiredLevel: 3, weight: 2, learningOrder: 6 },
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'UI/UX Basics', requiredLevel: 2, weight: 1, learningOrder: 7 },
  { careerGoalName: 'Software Engineer', specializationName: 'Frontend Engineer', skillName: 'Responsive Design', requiredLevel: 2, weight: 1, learningOrder: 8 },
  { careerGoalName: 'Software Engineer', specializationName: 'Backend Engineer', skillName: 'Node.js', requiredLevel: 2, weight: 1, learningOrder: 1 },
  { careerGoalName: 'Software Engineer', specializationName: 'Backend Engineer', skillName: 'NestJS', requiredLevel: 3, weight: 2, learningOrder: 2 },
  { careerGoalName: 'Software Engineer', specializationName: 'Backend Engineer', skillName: 'PostgreSQL', requiredLevel: 3, weight: 2, learningOrder: 3 },
  { careerGoalName: 'Software Engineer', specializationName: 'Backend Engineer', skillName: 'Authentication', requiredLevel: 2, weight: 1.5, learningOrder: 4 },
  { careerGoalName: 'Software Engineer', specializationName: 'Backend Engineer', skillName: 'Authorization', requiredLevel: 2, weight: 1.5, learningOrder: 5 },
  { careerGoalName: 'Software Engineer', specializationName: 'Backend Engineer', skillName: 'Prisma ORM', requiredLevel: 2, weight: 1, learningOrder: 6 },
  { careerGoalName: 'Software Engineer', specializationName: 'Backend Engineer', skillName: 'API Security', requiredLevel: 2, weight: 1, learningOrder: 7 },
  { careerGoalName: 'Software Engineer', specializationName: 'Mobile Engineer', skillName: 'React Native', requiredLevel: 3, weight: 2, learningOrder: 1 },
  { careerGoalName: 'Software Engineer', specializationName: 'Mobile Engineer', skillName: 'Mobile UI', requiredLevel: 2, weight: 1, learningOrder: 2 },
  { careerGoalName: 'Software Engineer', specializationName: 'Mobile Engineer', skillName: 'App Navigation', requiredLevel: 2, weight: 1, learningOrder: 3 },
  { careerGoalName: 'Software Engineer', specializationName: 'Mobile Engineer', skillName: 'Mobile API Integration', requiredLevel: 2, weight: 1.5, learningOrder: 4 },
  { careerGoalName: 'Software Engineer', specializationName: 'DevOps Engineer', skillName: 'Docker', requiredLevel: 3, weight: 2, learningOrder: 1 },
  { careerGoalName: 'Software Engineer', specializationName: 'DevOps Engineer', skillName: 'CI/CD', requiredLevel: 2, weight: 1.5, learningOrder: 2 },
  { careerGoalName: 'Software Engineer', specializationName: 'DevOps Engineer', skillName: 'Linux Basics', requiredLevel: 2, weight: 1, learningOrder: 3 },
  { careerGoalName: 'Software Engineer', specializationName: 'DevOps Engineer', skillName: 'Cloud Deployment', requiredLevel: 2, weight: 1.5, learningOrder: 4 },
  { careerGoalName: 'Software Engineer', specializationName: 'DevOps Engineer', skillName: 'Monitoring', requiredLevel: 2, weight: 1, learningOrder: 5 },
  { careerGoalName: 'Data Analyst', specializationName: 'Business Intelligence', skillName: 'Power BI', requiredLevel: 3, weight: 2, learningOrder: 1 },
  { careerGoalName: 'Data Analyst', specializationName: 'Business Intelligence', skillName: 'Dashboard Design', requiredLevel: 2, weight: 1.5, learningOrder: 2 },
  { careerGoalName: 'Data Analyst', specializationName: 'Business Intelligence', skillName: 'Data Visualization', requiredLevel: 3, weight: 2, learningOrder: 3 },
  { careerGoalName: 'Data Analyst', specializationName: 'Business Intelligence', skillName: 'SQL', requiredLevel: 3, weight: 2, learningOrder: 4 },
  { careerGoalName: 'Data Analyst', specializationName: 'Data Visualization', skillName: 'Data Visualization', requiredLevel: 3, weight: 2, learningOrder: 1 },
  { careerGoalName: 'Data Analyst', specializationName: 'Data Visualization', skillName: 'Dashboard Design', requiredLevel: 3, weight: 2, learningOrder: 2 },
  { careerGoalName: 'Data Analyst', specializationName: 'Data Visualization', skillName: 'Power BI', requiredLevel: 2, weight: 1.5, learningOrder: 3 },
  { careerGoalName: 'Data Analyst', specializationName: 'Data Engineering Basics', skillName: 'Python', requiredLevel: 2, weight: 1.5, learningOrder: 1 },
  { careerGoalName: 'Data Analyst', specializationName: 'Data Engineering Basics', skillName: 'SQL', requiredLevel: 3, weight: 2, learningOrder: 2 },
  { careerGoalName: 'Data Analyst', specializationName: 'Data Engineering Basics', skillName: 'ETL Basics', requiredLevel: 2, weight: 1.5, learningOrder: 3 },
  { careerGoalName: 'QA Engineer', specializationName: 'Manual Testing', skillName: 'Test Case Design', requiredLevel: 3, weight: 2, learningOrder: 1 },
  { careerGoalName: 'QA Engineer', specializationName: 'Manual Testing', skillName: 'Bug Reporting', requiredLevel: 3, weight: 2, learningOrder: 2 },
  { careerGoalName: 'QA Engineer', specializationName: 'Manual Testing', skillName: 'Manual Testing', requiredLevel: 3, weight: 2, learningOrder: 3 },
  { careerGoalName: 'QA Engineer', specializationName: 'Automation Testing', skillName: 'Selenium', requiredLevel: 3, weight: 2, learningOrder: 1 },
  { careerGoalName: 'QA Engineer', specializationName: 'Automation Testing', skillName: 'Test Automation Basics', requiredLevel: 3, weight: 2, learningOrder: 2 },
  { careerGoalName: 'QA Engineer', specializationName: 'Automation Testing', skillName: 'API Testing', requiredLevel: 2, weight: 1.5, learningOrder: 3 },
];

const userSeeds: SeedUser[] = [
  {
    email: 'admin@example.com',
    password: 'Admin@123',
    role: UserRole.ADMIN,
    fullName: 'Admin User',
  },
  {
    email: 'lecturer@example.com',
    password: 'Lecturer@123',
    role: UserRole.LECTURER,
    fullName: 'Lecturer Advisor',
  },
  {
    email: 'student.frontend@example.com',
    password: 'Student@123',
    role: UserRole.STUDENT,
    fullName: 'Frontend Student',
  },
  {
    email: 'student.backend@example.com',
    password: 'Student@123',
    role: UserRole.STUDENT,
    fullName: 'Backend Student',
  },
  {
    email: 'student.general@example.com',
    password: 'Student@123',
    role: UserRole.STUDENT,
    fullName: 'General Student',
  },
];

const studentSeeds: SeedStudent[] = [
  {
    email: 'student.frontend@example.com',
    studentCode: 'SE-FE-001',
    className: 'SE01',
    major: 'Software Engineering',
    academicYear: '2023-2027',
    phone: '0900000001',
    dateOfBirth: new Date('2004-02-15T00:00:00.000Z'),
  },
  {
    email: 'student.backend@example.com',
    studentCode: 'SE-BE-002',
    className: 'SE02',
    major: 'Software Engineering',
    academicYear: '2023-2027',
    phone: '0900000002',
    dateOfBirth: new Date('2004-06-20T00:00:00.000Z'),
  },
  {
    email: 'student.general@example.com',
    studentCode: 'SE-GEN-003',
    className: 'SE03',
    major: 'Software Engineering',
    academicYear: '2023-2027',
    phone: '0900000003',
    dateOfBirth: new Date('2004-10-05T00:00:00.000Z'),
  },
];

const studentProfileSeeds: SeedStudentProfile[] = [
  {
    email: 'student.frontend@example.com',
    careerGoalName: 'Software Engineer',
    specializationName: 'Frontend Engineer',
    summary:
      'Frontend-focused student building a portfolio around responsive web applications.',
    githubUrl: 'https://github.com/example/frontend-student',
    linkedinUrl: 'https://linkedin.com/in/frontend-student',
    portfolioUrl: 'https://frontend-student.example.com',
  },
  {
    email: 'student.backend@example.com',
    careerGoalName: 'Software Engineer',
    specializationName: 'Backend Engineer',
    summary:
      'Backend-focused student practicing API design, authentication, and relational data modeling.',
    githubUrl: 'https://github.com/example/backend-student',
    linkedinUrl: 'https://linkedin.com/in/backend-student',
  },
  {
    email: 'student.general@example.com',
    careerGoalName: 'Software Engineer',
    specializationName: null,
    summary:
      'Software engineering student exploring a general path before choosing a specialization.',
    githubUrl: 'https://github.com/example/general-student',
  },
];

const studentSkillSeeds: SeedStudentSkill[] = [
  { email: 'student.frontend@example.com', skillName: 'Git', currentLevel: 2, description: 'Comfortable with branches, commits, and pull request workflow.' },
  { email: 'student.frontend@example.com', skillName: 'HTML', currentLevel: 2, description: 'Can structure semantic pages for common product screens.' },
  { email: 'student.frontend@example.com', skillName: 'CSS', currentLevel: 2, description: 'Can build responsive layouts with reusable styles.' },
  { email: 'student.frontend@example.com', skillName: 'JavaScript', currentLevel: 2, description: 'Can implement interactive UI logic and fetch API data.' },
  { email: 'student.frontend@example.com', skillName: 'React', currentLevel: 1, description: 'Understands components and basic state management.' },
  { email: 'student.frontend@example.com', skillName: 'SQL', currentLevel: 1, description: 'Can write simple select queries and filters.' },
  { email: 'student.backend@example.com', skillName: 'Git', currentLevel: 2, description: 'Comfortable using Git in backend project workflows.' },
  { email: 'student.backend@example.com', skillName: 'SQL', currentLevel: 2, description: 'Can join tables and write basic aggregate queries.' },
  { email: 'student.backend@example.com', skillName: 'Node.js', currentLevel: 2, description: 'Can build simple server-side APIs with Node.js.' },
  { email: 'student.backend@example.com', skillName: 'NestJS', currentLevel: 1, description: 'Knows controllers, modules, and providers at a basic level.' },
  { email: 'student.backend@example.com', skillName: 'PostgreSQL', currentLevel: 1, description: 'Can use PostgreSQL for local development and simple schemas.' },
  { email: 'student.backend@example.com', skillName: 'Authentication', currentLevel: 1, description: 'Has practiced login flow and password hashing concepts.' },
  { email: 'student.general@example.com', skillName: 'Git', currentLevel: 1, description: 'Can commit changes and view project history.' },
  { email: 'student.general@example.com', skillName: 'SQL', currentLevel: 1, description: 'Can read simple queries and table structures.' },
  { email: 'student.general@example.com', skillName: 'Problem Solving', currentLevel: 1, description: 'Can solve small programming exercises with guidance.' },
  { email: 'student.general@example.com', skillName: 'Communication', currentLevel: 1, description: 'Can summarize progress and blockers in class projects.' },
];

const decimal = (value: number) => new Prisma.Decimal(value.toString());

function specializationKey(careerGoalName: string, specializationName: string) {
  return `${careerGoalName}::${specializationName}`;
}

async function seedSkillCategories() {
  const result = new Map<string, Awaited<ReturnType<typeof prisma.skillCategory.create>>>();

  for (const seed of skillCategorySeeds) {
    const category = await prisma.skillCategory.upsert({
      where: { name: seed.name },
      update: {
        description: seed.description,
        roadmapPhase: seed.roadmapPhase,
        status: CatalogStatus.ACTIVE,
      },
      create: {
        name: seed.name,
        description: seed.description,
        roadmapPhase: seed.roadmapPhase,
        status: CatalogStatus.ACTIVE,
      },
    });
    result.set(category.name, category);
  }

  return result;
}

async function seedCareerGoals() {
  const result = new Map<string, Awaited<ReturnType<typeof prisma.careerGoal.create>>>();

  for (const seed of careerGoalSeeds) {
    const careerGoal = await prisma.careerGoal.upsert({
      where: { name: seed.name },
      update: {
        description: seed.description,
        status: CatalogStatus.ACTIVE,
      },
      create: {
        name: seed.name,
        description: seed.description,
        status: CatalogStatus.ACTIVE,
      },
    });
    result.set(careerGoal.name, careerGoal);
  }

  return result;
}

async function seedSpecializations(
  careerGoals: Map<string, Awaited<ReturnType<typeof prisma.careerGoal.create>>>,
) {
  const result = new Map<string, Awaited<ReturnType<typeof prisma.specialization.create>>>();

  for (const seed of specializationSeeds) {
    const careerGoal = mustGet(careerGoals, seed.careerGoalName, 'career goal');
    const existing = await prisma.specialization.findFirst({
      where: {
        careerGoalId: careerGoal.id,
        name: seed.name,
      },
    });
    const data = {
      careerGoalId: careerGoal.id,
      name: seed.name,
      description: seed.description,
      status: AssignmentStatus.ACTIVE,
    };
    const specialization = existing
      ? await prisma.specialization.update({ where: { id: existing.id }, data })
      : await prisma.specialization.create({ data });

    result.set(specializationKey(seed.careerGoalName, seed.name), specialization);
  }

  return result;
}

async function seedSkills(
  categories: Map<string, Awaited<ReturnType<typeof prisma.skillCategory.create>>>,
) {
  const result = new Map<string, Awaited<ReturnType<typeof prisma.skill.create>>>();

  for (const seed of skillSeeds) {
    const category = mustGet(categories, seed.categoryName, 'skill category');
    const data = {
      categoryId: category.id,
      name: seed.name,
      description: seed.description,
      type: seed.type,
      defaultRequiredLevel: seed.defaultRequiredLevel,
      defaultWeight: decimal(seed.defaultWeight),
      status: CatalogStatus.ACTIVE,
    };

    const existingInCategory = await prisma.skill.findFirst({
      where: { categoryId: category.id, name: seed.name },
      orderBy: { createdAt: 'asc' },
    });
    const existingByName = existingInCategory
      ? null
      : await prisma.skill.findFirst({
          where: { name: seed.name },
          orderBy: { createdAt: 'asc' },
        });

    const skill = existingInCategory
      ? await prisma.skill.update({ where: { id: existingInCategory.id }, data })
      : existingByName
        ? await prisma.skill.update({ where: { id: existingByName.id }, data })
        : await prisma.skill.create({ data });

    result.set(skill.name, skill);
  }

  return result;
}

async function seedCareerRequiredSkills(
  careerGoals: Map<string, Awaited<ReturnType<typeof prisma.careerGoal.create>>>,
  specializations: Map<string, Awaited<ReturnType<typeof prisma.specialization.create>>>,
  skills: Map<string, Awaited<ReturnType<typeof prisma.skill.create>>>,
) {
  const seeds = [
    ...careerRequiredSkillSeeds.map((seed) => ({
      ...seed,
      specializationName: null,
      roadmapPhase: seed.roadmapPhase ?? RoadmapPhase.CAREER_TRACK,
    })),
    ...specializationRequiredSkillSeeds.map((seed) => ({
      ...seed,
      roadmapPhase: seed.roadmapPhase ?? RoadmapPhase.SPECIALIZATION,
    })),
  ];

  for (const seed of seeds) {
    const careerGoal = mustGet(careerGoals, seed.careerGoalName, 'career goal');
    const specialization = seed.specializationName
      ? mustGet(
          specializations,
          specializationKey(seed.careerGoalName, seed.specializationName),
          'specialization',
        )
      : null;
    const skill = mustGet(skills, seed.skillName, 'skill');

    const existing = await prisma.careerRequiredSkill.findFirst({
      where: {
        careerGoalId: careerGoal.id,
        specializationId: specialization?.id ?? null,
        skillId: skill.id,
      },
    });
    const data = {
      careerGoalId: careerGoal.id,
      specializationId: specialization?.id ?? null,
      skillId: skill.id,
      requiredLevel: seed.requiredLevel,
      weight: decimal(seed.weight),
      learningOrder: seed.learningOrder,
      isRequired: true,
      roadmapPhase: seed.roadmapPhase,
    };

    if (existing) {
      await prisma.careerRequiredSkill.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.careerRequiredSkill.create({ data });
    }
  }
}

async function seedUsers() {
  const result = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>();

  for (const seed of userSeeds) {
    const user = await upsertUser(seed);
    result.set(user.email, user);
  }

  return result;
}

async function upsertUser(seed: SeedUser) {
  const existing = await prisma.user.findUnique({ where: { email: seed.email } });
  const passwordAlreadyMatches = existing
    ? await safeComparePassword(seed.password, existing.passwordHash)
    : false;
  const passwordHash = passwordAlreadyMatches
    ? existing!.passwordHash
    : await bcrypt.hash(seed.password, BCRYPT_SALT_ROUNDS);

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        fullName: seed.fullName,
        role: seed.role,
        passwordHash,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: seed.email,
      fullName: seed.fullName,
      role: seed.role,
      passwordHash,
    },
  });
}

async function seedStudents(users: Map<string, Awaited<ReturnType<typeof prisma.user.create>>>) {
  const result = new Map<string, Awaited<ReturnType<typeof prisma.student.create>>>();

  for (const seed of studentSeeds) {
    const user = mustGet(users, seed.email, 'user');
    const data = {
      userId: user.id,
      studentCode: seed.studentCode,
      className: seed.className,
      major: seed.major,
      academicYear: seed.academicYear,
      phone: seed.phone,
      dateOfBirth: seed.dateOfBirth,
    };

    const existingByUser = await prisma.student.findUnique({
      where: { userId: user.id },
    });
    const student = existingByUser
      ? await prisma.student.update({ where: { id: existingByUser.id }, data })
      : await prisma.student.upsert({
          where: { studentCode: seed.studentCode },
          update: data,
          create: data,
        });

    result.set(seed.email, student);
  }

  return result;
}

async function seedLecturer(users: Map<string, Awaited<ReturnType<typeof prisma.user.create>>>) {
  const lecturerUser = mustGet(users, 'lecturer@example.com', 'user');
  const data = {
    userId: lecturerUser.id,
    lecturerCode: 'LEC-ADV-001',
    department: 'Software Engineering',
    phone: '0911000001',
    academicTitle: 'Advisor',
  };

  const existingByUser = await prisma.lecturer.findUnique({
    where: { userId: lecturerUser.id },
  });

  return existingByUser
    ? prisma.lecturer.update({ where: { id: existingByUser.id }, data })
    : prisma.lecturer.upsert({
        where: { lecturerCode: data.lecturerCode },
        update: data,
        create: data,
      });
}

async function seedStudentProfiles(
  students: Map<string, Awaited<ReturnType<typeof prisma.student.create>>>,
  careerGoals: Map<string, Awaited<ReturnType<typeof prisma.careerGoal.create>>>,
  specializations: Map<string, Awaited<ReturnType<typeof prisma.specialization.create>>>,
) {
  for (const seed of studentProfileSeeds) {
    const student = mustGet(students, seed.email, 'student');
    const careerGoal = mustGet(careerGoals, seed.careerGoalName, 'career goal');
    const specialization = seed.specializationName
      ? mustGet(
          specializations,
          specializationKey(seed.careerGoalName, seed.specializationName),
          'specialization',
        )
      : null;
    const mutableData = {
      careerGoalId: careerGoal.id,
      specializationId: specialization?.id ?? null,
      summary: seed.summary,
      githubUrl: seed.githubUrl ?? null,
      linkedinUrl: seed.linkedinUrl ?? null,
      portfolioUrl: seed.portfolioUrl ?? null,
      lastUpdatedAt: new Date(),
    };

    await prisma.studentProfile.upsert({
      where: { studentId: student.id },
      update: mutableData,
      create: {
        studentId: student.id,
        ...mutableData,
        completionPercent: decimal(0),
        matchPercent: decimal(0),
        riskScore: 0,
      },
    });
  }
}

async function seedStudentSkills(
  students: Map<string, Awaited<ReturnType<typeof prisma.student.create>>>,
  skills: Map<string, Awaited<ReturnType<typeof prisma.skill.create>>>,
) {
  for (const seed of studentSkillSeeds) {
    const student = mustGet(students, seed.email, 'student');
    const skill = mustGet(skills, seed.skillName, 'skill');

    await prisma.studentSkill.upsert({
      where: {
        studentId_skillId: {
          studentId: student.id,
          skillId: skill.id,
        },
      },
      update: {
        currentLevel: seed.currentLevel,
        description: seed.description,
        evidenceStatus: VerificationStatus.NO_EVIDENCE,
      },
      create: {
        studentId: student.id,
        skillId: skill.id,
        currentLevel: seed.currentLevel,
        description: seed.description,
        evidenceStatus: VerificationStatus.NO_EVIDENCE,
      },
    });
  }
}

async function seedStudentPortfolioSamples(
  students: Map<string, Awaited<ReturnType<typeof prisma.student.create>>>,
) {
  const frontendStudent = mustGet(students, 'student.frontend@example.com', 'student');
  const backendStudent = mustGet(students, 'student.backend@example.com', 'student');
  const generalStudent = mustGet(students, 'student.general@example.com', 'student');

  await upsertProject(frontendStudent.id, {
    title: 'Responsive Portfolio Website',
    description: 'A responsive portfolio built with React pages, reusable components, and API-backed project data.',
    roleInProject: 'Frontend Developer',
    technologies: ['HTML', 'CSS', 'JavaScript', 'React'],
    githubUrl: 'https://github.com/example/responsive-portfolio',
    demoUrl: 'https://portfolio.example.com',
    startDate: new Date('2025-01-10T00:00:00.000Z'),
    endDate: new Date('2025-03-30T00:00:00.000Z'),
    status: ProjectStatus.COMPLETED,
  });
  await upsertProject(backendStudent.id, {
    title: 'Student Profile API',
    description: 'A NestJS API prototype with PostgreSQL, Prisma ORM, authentication, and role-based access.',
    roleInProject: 'Backend Developer',
    technologies: ['Node.js', 'NestJS', 'PostgreSQL', 'Prisma ORM'],
    githubUrl: 'https://github.com/example/student-profile-api',
    demoUrl: null,
    startDate: new Date('2025-02-01T00:00:00.000Z'),
    endDate: null,
    status: ProjectStatus.IN_PROGRESS,
  });
  await upsertProject(generalStudent.id, {
    title: 'Programming Fundamentals Exercises',
    description: 'Small exercises for problem solving, Git practice, SQL basics, and class presentation.',
    roleInProject: 'Student Developer',
    technologies: ['Git', 'SQL'],
    githubUrl: 'https://github.com/example/programming-fundamentals',
    demoUrl: null,
    startDate: new Date('2025-03-01T00:00:00.000Z'),
    endDate: null,
    status: ProjectStatus.IN_PROGRESS,
  });

  await upsertCertificate(frontendStudent.id, {
    certificateName: 'Responsive Web Design Certificate',
    issuer: 'freeCodeCamp',
    issueDate: new Date('2025-04-01T00:00:00.000Z'),
    credentialId: 'FE-RWD-001',
    credentialUrl: 'https://example.com/certificates/fe-rwd-001',
  });
  await upsertCertificate(backendStudent.id, {
    certificateName: 'Backend API Fundamentals',
    issuer: 'Example Academy',
    issueDate: new Date('2025-04-15T00:00:00.000Z'),
    credentialId: 'BE-API-001',
    credentialUrl: 'https://example.com/certificates/be-api-001',
  });

  await upsertActivity(generalStudent.id, {
    title: 'Software Engineering Study Group',
    organization: 'Student IT Club',
    role: 'Member',
    description: 'Joined weekly study sessions for Git, SQL, and problem solving practice.',
    startDate: new Date('2025-01-15T00:00:00.000Z'),
    endDate: null,
  });
}

async function upsertProject(
  studentId: string,
  data: Omit<Prisma.StudentProjectUncheckedCreateInput, 'studentId'>,
) {
  const existing = await prisma.studentProject.findFirst({
    where: { studentId, title: data.title },
  });

  return existing
    ? prisma.studentProject.update({ where: { id: existing.id }, data })
    : prisma.studentProject.create({ data: { ...data, studentId } });
}

async function upsertCertificate(
  studentId: string,
  data: Omit<Prisma.StudentCertificateUncheckedCreateInput, 'studentId'>,
) {
  const existing = await prisma.studentCertificate.findFirst({
    where: { studentId, certificateName: data.certificateName },
  });

  return existing
    ? prisma.studentCertificate.update({ where: { id: existing.id }, data })
    : prisma.studentCertificate.create({ data: { ...data, studentId } });
}

async function upsertActivity(
  studentId: string,
  data: Omit<Prisma.StudentActivityUncheckedCreateInput, 'studentId'>,
) {
  const existing = await prisma.studentActivity.findFirst({
    where: { studentId, title: data.title },
  });

  return existing
    ? prisma.studentActivity.update({ where: { id: existing.id }, data })
    : prisma.studentActivity.create({ data: { ...data, studentId } });
}

async function seedAdvisorAssignments(
  lecturer: Awaited<ReturnType<typeof prisma.lecturer.create>>,
  students: Map<string, Awaited<ReturnType<typeof prisma.student.create>>>,
  users: Map<string, Awaited<ReturnType<typeof prisma.user.create>>>,
) {
  const admin = mustGet(users, 'admin@example.com', 'user');

  for (const student of students.values()) {
    const existing = await prisma.advisorAssignment.findFirst({
      where: {
        lecturerId: lecturer.id,
        studentId: student.id,
      },
    });
    const data = {
      lecturerId: lecturer.id,
      studentId: student.id,
      assignedById: admin.id,
      status: AssignmentStatus.ACTIVE,
    };

    if (existing) {
      await prisma.advisorAssignment.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.advisorAssignment.create({ data });
    }
  }
}

async function seedRecommendationTemplates(
  skills: Map<string, Awaited<ReturnType<typeof prisma.skill.create>>>,
) {
  for (const skill of skills.values()) {
    const level = toSkillLevel(skill.defaultRequiredLevel);
    const roadmapPhase = skill.type === SkillType.COMMON
      ? RoadmapPhase.CORE_FOUNDATION
      : RoadmapPhase.SPECIALIZATION;
    const title = `Practice ${skill.name}`;
    const existing = await prisma.recommendationTemplate.findFirst({
      where: {
        skillId: skill.id,
        skillCategoryId: null,
        careerGoalId: null,
        specializationId: null,
        level,
        recommendationType: RecommendationType.PRACTICE,
        roadmapPhase,
        title,
      },
    });
    const data = {
      skillId: skill.id,
      skillCategoryId: null,
      careerGoalId: null,
      specializationId: null,
      level,
      recommendationType: RecommendationType.PRACTICE,
      title,
      description: `Complete a focused practice task for ${skill.name} and record the outcome in your profile.`,
      difficultyLevel: toDifficultyLevel(skill.defaultRequiredLevel),
      estimatedDuration: skill.defaultRequiredLevel >= 3 ? '2-3 weeks' : '1-2 weeks',
      resourceUrl: null,
      priority: skill.defaultRequiredLevel,
      roadmapPhase,
      status: TemplateStatus.ACTIVE,
    };

    if (existing) {
      await prisma.recommendationTemplate.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.recommendationTemplate.create({ data });
    }
  }

  await seedCareerRecommendationTemplate(
    'Software Engineer',
    'Build a software portfolio project',
    'Create a small project that combines source control, API integration, and deployment-ready documentation.',
  );
}

async function seedCareerRecommendationTemplate(
  careerGoalName: string,
  title: string,
  description: string,
) {
  const careerGoal = await prisma.careerGoal.findUnique({
    where: { name: careerGoalName },
  });
  if (!careerGoal) {
    return;
  }

  const existing = await prisma.recommendationTemplate.findFirst({
    where: {
      skillId: null,
      skillCategoryId: null,
      careerGoalId: careerGoal.id,
      specializationId: null,
      title,
    },
  });
  const data = {
    skillId: null,
    skillCategoryId: null,
    careerGoalId: careerGoal.id,
    specializationId: null,
    level: null,
    recommendationType: RecommendationType.PORTFOLIO_TASK,
    title,
    description,
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    estimatedDuration: '3-4 weeks',
    resourceUrl: null,
    priority: 5,
    roadmapPhase: RoadmapPhase.PORTFOLIO_PREPARATION,
    status: TemplateStatus.ACTIVE,
  };

  if (existing) {
    await prisma.recommendationTemplate.update({ where: { id: existing.id }, data });
  } else {
    await prisma.recommendationTemplate.create({ data });
  }
}

async function seedAssessmentQuestions(
  skills: Map<string, Awaited<ReturnType<typeof prisma.skill.create>>>,
) {
  for (const skill of skills.values()) {
    const questionText = `Which answer best reflects practical use of ${skill.name}?`;
    const existing = await prisma.assessmentQuestion.findFirst({
      where: {
        skillId: skill.id,
        questionText,
      },
    });
    const data = {
      skillId: skill.id,
      questionText,
      questionType: QuestionType.SINGLE_CHOICE,
      level: Math.max(1, Math.min(skill.defaultRequiredLevel, 3)),
      explanation: `${skill.name} should be demonstrated through practical work, not only memorized definitions.`,
      status: QuestionStatus.ACTIVE,
    };
    const question = existing
      ? await prisma.assessmentQuestion.update({ where: { id: existing.id }, data })
      : await prisma.assessmentQuestion.create({ data });

    await upsertAssessmentOptions(question.id, [
      {
        optionText: `Apply ${skill.name} in a small real or simulated project task and explain the result.`,
        isCorrect: true,
        orderIndex: 1,
      },
      {
        optionText: `Only memorize the term ${skill.name} without using it in practice.`,
        isCorrect: false,
        orderIndex: 2,
      },
      {
        optionText: `Avoid feedback because ${skill.name} cannot be improved through review.`,
        isCorrect: false,
        orderIndex: 3,
      },
      {
        optionText: `Use ${skill.name} only after a project has already been completed.`,
        isCorrect: false,
        orderIndex: 4,
      },
    ]);
  }
}

async function upsertAssessmentOptions(
  questionId: string,
  options: Array<{ optionText: string; isCorrect: boolean; orderIndex: number }>,
) {
  for (const option of options) {
    const existing = await prisma.assessmentOption.findFirst({
      where: {
        questionId,
        optionText: option.optionText,
      },
    });

    if (existing) {
      await prisma.assessmentOption.update({
        where: { id: existing.id },
        data: option,
      });
    } else {
      await prisma.assessmentOption.create({
        data: {
          questionId,
          ...option,
        },
      });
    }
  }
}

async function seedNotifications(users: Map<string, Awaited<ReturnType<typeof prisma.user.create>>>) {
  for (const user of users.values()) {
    const title = user.role === UserRole.STUDENT
      ? 'Complete your competency profile'
      : 'Seed data is ready';
    const content = user.role === UserRole.STUDENT
      ? 'Your sample career goal, skills, and portfolio data are ready for competency analysis.'
      : 'Catalogs, users, sample students, required skills, templates, and questions have been seeded.';

    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        title,
        notificationType: NotificationType.SYSTEM,
      },
    });
    const notification = existing
      ? await prisma.notification.update({
          where: { id: existing.id },
          data: {
            content,
            notificationType: NotificationType.SYSTEM,
            isRead: false,
          },
        })
      : await prisma.notification.create({
          data: {
            userId: user.id,
            title,
            content,
            notificationType: NotificationType.SYSTEM,
          },
        });

    await upsertNotificationLog(notification.id, user.id);
  }
}

async function upsertNotificationLog(notificationId: string, userId: string) {
  const existing = await prisma.notificationLog.findFirst({
    where: {
      notificationId,
      userId,
      channel: NotificationChannel.IN_APP,
    },
  });
  const data = {
    notificationId,
    userId,
    channel: NotificationChannel.IN_APP,
    status: NotificationLogStatus.SENT,
    sentAt: new Date(),
  };

  if (existing) {
    await prisma.notificationLog.update({ where: { id: existing.id }, data });
  } else {
    await prisma.notificationLog.create({ data });
  }
}

async function safeComparePassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

function mustGet<T>(map: Map<string, T>, key: string, label: string): T {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label}: ${key}`);
  }

  return value;
}

function toSkillLevel(requiredLevel: number) {
  if (requiredLevel <= 0) {
    return SkillLevel.ZERO;
  }
  if (requiredLevel === 1) {
    return SkillLevel.BASIC;
  }
  if (requiredLevel === 2) {
    return SkillLevel.INTERMEDIATE;
  }

  return SkillLevel.GOOD;
}

function toDifficultyLevel(requiredLevel: number) {
  if (requiredLevel <= 1) {
    return DifficultyLevel.BEGINNER;
  }
  if (requiredLevel === 2) {
    return DifficultyLevel.INTERMEDIATE;
  }

  return DifficultyLevel.ADVANCED;
}

async function assertSeedHealth() {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.careerGoal.count(),
    prisma.specialization.count(),
    prisma.skill.count(),
    prisma.careerRequiredSkill.count(),
    prisma.studentSkill.count(),
    prisma.recommendationTemplate.count(),
    prisma.assessmentQuestion.count(),
  ]);

  const [users, students, careerGoals, specializations, skills, requiredSkills, studentSkills, templates, questions] = counts;
  console.log(
    [
      `Seed complete: ${users} users`,
      `${students} students`,
      `${careerGoals} career goals`,
      `${specializations} specializations`,
      `${skills} skills`,
      `${requiredSkills} required skills`,
      `${studentSkills} student skills`,
      `${templates} recommendation templates`,
      `${questions} assessment questions`,
    ].join(', '),
  );

  await verifySamplePassword('admin@example.com', 'Admin@123');
  await verifySamplePassword('student.frontend@example.com', 'Student@123');
  await verifySamplePassword('student.backend@example.com', 'Student@123');
  await verifySamplePassword('student.general@example.com', 'Student@123');
}

async function verifySamplePassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error(`Seeded login check failed for ${email}`);
  }
}

async function main() {
  const categories = await seedSkillCategories();
  const careerGoals = await seedCareerGoals();
  const specializations = await seedSpecializations(careerGoals);
  const skills = await seedSkills(categories);

  await seedCareerRequiredSkills(careerGoals, specializations, skills);

  const users = await seedUsers();
  const students = await seedStudents(users);
  const lecturer = await seedLecturer(users);

  await seedStudentProfiles(students, careerGoals, specializations);
  await seedStudentSkills(students, skills);
  await seedStudentPortfolioSamples(students);
  await seedAdvisorAssignments(lecturer, students, users);
  await seedRecommendationTemplates(skills);
  await seedAssessmentQuestions(skills);
  await seedNotifications(users);
  await assertSeedHealth();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
