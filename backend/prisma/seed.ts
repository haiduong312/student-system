import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL =
  'postgresql://nguyenhaiduong@localhost:5432/student_system?schema=public';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL),
});

type SeedSkill = {
  name: string;
  type: 'COMMON' | 'CAREER_SPECIFIC';
  defaultRequiredLevel: number;
  defaultWeight: number;
  description?: string;
};

const skills: SeedSkill[] = [
  {
    name: 'Git',
    type: 'COMMON',
    defaultRequiredLevel: 2,
    defaultWeight: 2,
    description: 'Version control and collaborative source code workflow.',
  },
  {
    name: 'SQL',
    type: 'COMMON',
    defaultRequiredLevel: 1,
    defaultWeight: 1,
    description: 'Querying and working with relational databases.',
  },
  {
    name: 'Problem Solving',
    type: 'COMMON',
    defaultRequiredLevel: 2,
    defaultWeight: 3,
    description: 'Analytical thinking and structured technical problem solving.',
  },
  {
    name: 'English Reading',
    type: 'COMMON',
    defaultRequiredLevel: 1,
    defaultWeight: 1,
    description: 'Reading technical documentation and English-language learning resources.',
  },
  {
    name: 'Communication',
    type: 'COMMON',
    defaultRequiredLevel: 1,
    defaultWeight: 1,
    description: 'Clear written and verbal communication in technical contexts.',
  },
  { name: 'JavaScript', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'TypeScript', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'React', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'Next.js', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'NestJS', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'REST API', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'Authentication', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'Power BI', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
  { name: 'Statistics', type: 'CAREER_SPECIFIC', defaultRequiredLevel: 1, defaultWeight: 1 },
];

async function upsertSkill(skill: SeedSkill) {
  const existing = await prisma.skill.findFirst({
    where: { name: skill.name },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  const data = {
    name: skill.name,
    description: skill.description,
    type: skill.type,
    defaultRequiredLevel: skill.defaultRequiredLevel,
    defaultWeight: skill.defaultWeight,
    status: 'ACTIVE',
  } as any;

  if (existing) {
    return prisma.skill.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.skill.create({
    data,
  });
}

async function main() {
  for (const skill of skills) {
    await upsertSkill(skill);
  }
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
