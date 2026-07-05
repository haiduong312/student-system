import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
  quiet: true,
});

export type TestRole = 'ADMIN' | 'STUDENT' | 'LECTURER';

export interface RoleCredentials {
  email: string;
  password: string;
}

export interface TestEnvironment {
  E2E_BASE_URL: string;
  E2E_API_BASE_URL: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  STUDENT_EMAIL: string;
  STUDENT_PASSWORD: string;
  LECTURER_EMAIL: string;
  LECTURER_PASSWORD: string;
}

let cachedEnvironment: TestEnvironment | undefined;

export function getTestEnvironment(): TestEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  cachedEnvironment = {
    E2E_BASE_URL: readRequiredEnvironmentVariable('E2E_BASE_URL'),
    E2E_API_BASE_URL: readRequiredEnvironmentVariable('E2E_API_BASE_URL'),
    ADMIN_EMAIL: readRequiredEnvironmentVariable('ADMIN_EMAIL'),
    ADMIN_PASSWORD: readRequiredEnvironmentVariable('ADMIN_PASSWORD'),
    STUDENT_EMAIL: readRequiredEnvironmentVariable('STUDENT_EMAIL'),
    STUDENT_PASSWORD: readRequiredEnvironmentVariable('STUDENT_PASSWORD'),
    LECTURER_EMAIL: readRequiredEnvironmentVariable('LECTURER_EMAIL'),
    LECTURER_PASSWORD: readRequiredEnvironmentVariable('LECTURER_PASSWORD'),
  };

  return cachedEnvironment;
}

export function getRoleCredentials(role: TestRole): RoleCredentials {
  const environment = getTestEnvironment();

  if (role === 'ADMIN') {
    return {
      email: environment.ADMIN_EMAIL,
      password: environment.ADMIN_PASSWORD,
    };
  }
  if (role === 'STUDENT') {
    return {
      email: environment.STUDENT_EMAIL,
      password: environment.STUDENT_PASSWORD,
    };
  }

  return {
    email: environment.LECTURER_EMAIL,
    password: environment.LECTURER_PASSWORD,
  };
}

function readRequiredEnvironmentVariable(name: keyof TestEnvironment) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.e2e or in the CI secret environment.`,
    );
  }

  return value;
}
