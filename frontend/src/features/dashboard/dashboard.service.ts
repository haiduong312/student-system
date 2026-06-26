import { getData } from '@/lib/request';
import type { AdminDashboard, LecturerDashboard, StudentDashboard } from '@/types/domain';

export const dashboardService = {
  getStudentDashboard() {
    return getData<StudentDashboard>('/dashboard/student');
  },
  getLecturerDashboard() {
    return getData<LecturerDashboard>('/dashboard/lecturer');
  },
  getAdminDashboard() {
    return getData<AdminDashboard>('/dashboard/admin');
  },
};
