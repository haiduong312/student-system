export const E2E_DATA_PREFIX = 'E2E';

export function uniqueE2EName(label: string) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${E2E_DATA_PREFIX}-${label}-${timestamp}-${random}`;
}
