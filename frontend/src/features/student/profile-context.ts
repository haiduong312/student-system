import { useQuery, type QueryClient } from '@tanstack/react-query';
import { getData } from '@/lib/request';
import type { StudentProfile } from '@/types/domain';

export const STUDENT_PROFILE_QUERY_KEY = ['profile', 'me'] as const;

const NO_CAREER_GOAL_SCOPE = 'NO_CAREER_GOAL';
const GENERAL_SPECIALIZATION_SCOPE = 'GENERAL_SPECIALIZATION';

export function useStudentProfileQuery() {
  return useQuery({
    queryKey: STUDENT_PROFILE_QUERY_KEY,
    queryFn: () => getData<StudentProfile>('/profiles/me'),
  });
}

export function getStudentProfileScopeKey(profile?: StudentProfile | null) {
  return [
    profile?.careerGoalId ?? NO_CAREER_GOAL_SCOPE,
    profile?.specializationId ?? GENERAL_SPECIALIZATION_SCOPE,
  ] as const;
}

export function isSameProfileScope(
  profile: StudentProfile | null | undefined,
  value: { careerGoalId?: string | null; specializationId?: string | null },
) {
  if (!profile?.careerGoalId) {
    return false;
  }

  return (
    profile.careerGoalId === value.careerGoalId &&
    (profile.specializationId ?? null) === (value.specializationId ?? null)
  );
}

export function resetStudentCurrentContextQueries(queryClient: QueryClient) {
  const queryKeys = [
    ['assessment', 'start'],
    ['dashboard', 'student'],
    ['recommendations', 'me'],
    ['roadmaps', 'me'],
    ['roadmaps', 'history', 'me'],
    ['competency-analysis', 'me'],
    ['analysis-history', 'me'],
  ] as const;

  queryKeys.forEach((queryKey) => {
    queryClient.removeQueries({ queryKey });
  });
}

export function invalidateStudentCurrentContextQueries(queryClient: QueryClient) {
  const queryKeys = [
    STUDENT_PROFILE_QUERY_KEY,
    ['dashboard', 'student'],
    ['recommendations', 'me'],
    ['roadmaps', 'me'],
    ['roadmaps', 'history', 'me'],
    ['competency-analysis', 'me'],
    ['analysis-history', 'me'],
  ] as const;

  queryKeys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}
