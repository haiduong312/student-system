import {
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  BulbOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  IdcardOutlined,
  NotificationOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SnippetsOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { UserRole } from '@/types/auth';

type MenuItem = Required<MenuProps>['items'][number];

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  LECTURER: 'Lecturer',
  STUDENT: 'Student',
};

export const roleBasePath: Record<UserRole, string> = {
  ADMIN: '/admin',
  LECTURER: '/lecturer',
  STUDENT: '/student',
};

export const roleMenu: Record<UserRole, MenuItem[]> = {
  ADMIN: [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
    { key: '/admin/students', icon: <TeamOutlined />, label: 'Students' },
    { key: '/admin/lecturers', icon: <IdcardOutlined />, label: 'Lecturers' },
    { key: '/admin/skill-categories', icon: <BookOutlined />, label: 'Skill Categories' },
    { key: '/admin/skills', icon: <BulbOutlined />, label: 'Skills' },
    { key: '/admin/career-goals', icon: <SolutionOutlined />, label: 'Career Goals' },
    { key: '/admin/assessment-questions', icon: <QuestionCircleOutlined />, label: 'Question Bank' },
    { key: '/admin/learning-resources', icon: <ReadOutlined />, label: 'Learning Resources' },
    { key: '/admin/recommendation-templates', icon: <SnippetsOutlined />, label: 'Recommendation Templates' },
    { key: '/admin/advisor-assignments', icon: <AuditOutlined />, label: 'Advisor Assignments' },
    { key: '/admin/reports', icon: <BarChartOutlined />, label: 'Reports' },
  ],
  LECTURER: [
    { key: '/lecturer/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/lecturer/students', icon: <TeamOutlined />, label: 'Students' },
    { key: '/lecturer/evidences', icon: <FileDoneOutlined />, label: 'Evidences' },
    { key: '/lecturer/reviews', icon: <FileTextOutlined />, label: 'Reviews' },
    { key: '/lecturer/reports', icon: <BarChartOutlined />, label: 'Reports' },
  ],
  STUDENT: [
    { key: '/student/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/student/profile', icon: <UserOutlined />, label: 'Profile' },
    { key: '/student/skills', icon: <BulbOutlined />, label: 'Skills' },
    { key: '/student/projects', icon: <ProjectOutlined />, label: 'Projects' },
    { key: '/student/certificates', icon: <SafetyCertificateOutlined />, label: 'Certificates' },
    { key: '/student/activities', icon: <TeamOutlined />, label: 'Activities' },
    { key: '/student/experiences', icon: <SolutionOutlined />, label: 'Experiences' },
    { key: '/student/evidences', icon: <FileDoneOutlined />, label: 'Evidences' },
    { key: '/student/assessment', icon: <QuestionCircleOutlined />, label: 'Assessment' },
    { key: '/student/analysis', icon: <BarChartOutlined />, label: 'Analysis' },
    { key: '/student/roadmap', icon: <AuditOutlined />, label: 'Roadmap' },
    { key: '/student/portfolio', icon: <FileTextOutlined />, label: 'Portfolio' },
    { key: '/student/notifications', icon: <NotificationOutlined />, label: 'Notifications' },
  ],
};
