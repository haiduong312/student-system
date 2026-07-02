import { getData, getPage, patchData, postData } from '@/lib/request';
import type {
  CreateStudentRequest,
  DeactivateUserResult,
  ImportStudentsRequest,
  ImportStudentsResult,
  ManagedStudentProfile,
  ReactivateUserResult,
  Student,
  StudentActivityResource,
  StudentCertificateResource,
  StudentExperienceResource,
  StudentProfileResourceQueryParams,
  StudentProjectResource,
  StudentQueryParams,
  StudentSkillResource,
  UpdateStudentRequest,
} from '@/types/management';

export const studentsService = {
  getStudents(params: StudentQueryParams = {}) {
    return getPage<Student>('/students', { ...params });
  },

  getStudentDetail(id: string) {
    return getData<Student>(`/students/${id}`);
  },

  getStudentProfile(studentId: string) {
    return getData<ManagedStudentProfile>(`/profiles/${studentId}`);
  },

  getStudentSkills(studentId: string, params: StudentProfileResourceQueryParams = {}) {
    return getPage<StudentSkillResource>(`/profiles/${studentId}/skills`, { ...params });
  },

  getStudentProjects(studentId: string, params: StudentProfileResourceQueryParams = {}) {
    return getPage<StudentProjectResource>(`/profiles/${studentId}/projects`, { ...params });
  },

  getStudentCertificates(studentId: string, params: StudentProfileResourceQueryParams = {}) {
    return getPage<StudentCertificateResource>(`/profiles/${studentId}/certificates`, {
      ...params,
    });
  },

  getStudentActivities(studentId: string, params: StudentProfileResourceQueryParams = {}) {
    return getPage<StudentActivityResource>(`/profiles/${studentId}/activities`, { ...params });
  },

  getStudentExperiences(studentId: string, params: StudentProfileResourceQueryParams = {}) {
    return getPage<StudentExperienceResource>(`/profiles/${studentId}/experiences`, {
      ...params,
    });
  },

  createStudent(payload: CreateStudentRequest) {
    return postData<Student, CreateStudentRequest>('/students', payload);
  },

  updateStudent(id: string, payload: UpdateStudentRequest) {
    return patchData<Student, UpdateStudentRequest>(`/students/${id}`, payload);
  },

  importStudents(payload: ImportStudentsRequest) {
    return postData<ImportStudentsResult, ImportStudentsRequest>('/students/import', payload);
  },

  deactivateStudent(id: string) {
    return patchData<DeactivateUserResult>(`/students/${id}/deactivate`);
  },

  reactivateStudent(id: string) {
    return patchData<ReactivateUserResult>(`/students/${id}/reactivate`);
  },
};
