import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { StudentProfile } from '@/types/domain';
import { profileService } from './profile.service';

export const STUDENT_PROFILE_QUERY_KEY = ['profile', 'me'] as const;

const NO_CAREER_GOAL_SCOPE = 'NO_CAREER_GOAL';
const GENERAL_SPECIALIZATION_SCOPE = 'GENERAL_SPECIALIZATION';

export type StudentProfileScopeKey = readonly [string, string];

const STUDENT_CURRENT_CONTEXT_QUERY_ROOTS = [
  ['dashboard', 'student'],
  ['assessment'],
  ['analysis', 'current'],
  ['analysis', 'history'],
  ['recommendations', 'me'],
  ['roadmaps', 'active'],
  ['roadmaps', 'history'],
  ['learning-resources', 'progress'],
] as const;

const LEGACY_STUDENT_CONTEXT_QUERY_ROOTS = [
  ['competency-analysis', 'me'],
  ['analysis-history', 'me'],
  ['roadmaps', 'me'],
] as const;

export const studentQueryKeys = {
  profile: STUDENT_PROFILE_QUERY_KEY,
  dashboardStudent: (scopeKey: StudentProfileScopeKey) =>
    ['dashboard', 'student', ...scopeKey] as const,
  assessmentStart: (scopeKey: StudentProfileScopeKey) =>
    ['assessment', 'start', ...scopeKey] as const,
  assessmentLatest: (scopeKey: StudentProfileScopeKey) =>
    ['assessment', 'latest', ...scopeKey] as const,
  assessmentCooldown: (scopeKey: StudentProfileScopeKey) =>
    ['assessment', 'cooldown', ...scopeKey] as const,
  analysisCurrent: (scopeKey: StudentProfileScopeKey) =>
    ['analysis', 'current', ...scopeKey] as const,
  analysisHistory: ['analysis', 'history'] as const,
  recommendationsMe: (scopeKey: StudentProfileScopeKey) =>
    ['recommendations', 'me', ...scopeKey] as const,
  roadmapsActive: (scopeKey: StudentProfileScopeKey) =>
    ['roadmaps', 'active', ...scopeKey] as const,
  roadmapsHistory: ['roadmaps', 'history'] as const,
  learningResourceProgress: (scopeKey: StudentProfileScopeKey) =>
    ['learning-resources', 'progress', ...scopeKey] as const,
  evidencesMe: ['evidences', 'me'] as const,
  evidencesPending: ['evidences', 'pending'] as const,
  notificationsMe: ['notifications', 'me'] as const,
} as const;

export function useStudentProfileQuery() {
  return useQuery({
    queryKey: STUDENT_PROFILE_QUERY_KEY,
    queryFn: () => profileService.getMyProfile(),
  });
}

export function useCurrentProfileContext() {
  const profileQuery = useStudentProfileQuery();

  return useMemo(() => {
    const profile = profileQuery.data ?? null;
    const careerGoalId = profile?.careerGoalId ?? null;
    const specializationId = profile?.specializationId ?? null;
    const hasCareerGoal = Boolean(careerGoalId);

    return {
      profile,
      careerGoalId,
      specializationId,
      careerGoalName: profile?.careerGoal?.name ?? null,
      specializationName: profile?.specialization?.name ?? null,
      hasCareerGoal,
      hasSpecialization: Boolean(specializationId),
      isProfileLoaded: profileQuery.isSuccess,
      isContextReady: profileQuery.isSuccess && hasCareerGoal,
      loading: profileQuery.isLoading,
      fetching: profileQuery.isFetching,
      error: profileQuery.error,
      scopeKey: getStudentProfileScopeKey(profile),
    };
  }, [
    profileQuery.data,
    profileQuery.error,
    profileQuery.isFetching,
    profileQuery.isLoading,
    profileQuery.isSuccess,
  ]);
}

export function getStudentProfileScopeKey(
  profile?: StudentProfile | null,
): StudentProfileScopeKey {
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
  STUDENT_CURRENT_CONTEXT_QUERY_ROOTS.forEach((queryKey) => {
    queryClient.removeQueries({ queryKey });
  });
  LEGACY_STUDENT_CONTEXT_QUERY_ROOTS.forEach((queryKey) => {
    queryClient.removeQueries({ queryKey });
  });
}

export function invalidateStudentCurrentContextQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: STUDENT_PROFILE_QUERY_KEY });
  STUDENT_CURRENT_CONTEXT_QUERY_ROOTS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
  LEGACY_STUDENT_CONTEXT_QUERY_ROOTS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}
