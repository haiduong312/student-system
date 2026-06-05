# Thiết kế kiến trúc hệ thống Student Digital Competency Profile & Personal Development Roadmap

## 1. Kiến trúc tổng thể

Hệ thống phù hợp với mô hình **Modular Monolith + Clean Architecture nhẹ**.

```text
Next.js 15 + TypeScript + Ant Design
        |
        | REST API / JWT
        v
NestJS + Prisma
        |
        v
PostgreSQL
```

Cách tiếp cận này phù hợp vì hệ thống có nhiều module nghiệp vụ liên quan chặt chẽ như hồ sơ sinh viên, kỹ năng, phân tích năng lực, gợi ý và lộ trình. Chưa cần microservices, nhưng vẫn nên chia module rõ để dễ mở rộng.

## 2. Công nghệ đề xuất

### Frontend

- Next.js 15
- TypeScript
- Ant Design
- Axios hoặc Fetch API
- React Hook Form hoặc Ant Design Form
- Recharts hoặc Chart.js
- Zustand hoặc Context API cho auth state

### Backend

- NestJS
- TypeScript
- Prisma ORM
- JWT Authentication
- Role-based Authorization
- Multer upload file
- ExcelJS export Excel
- PDFKit hoặc Puppeteer export PDF
- NestJS Schedule/Cron

### Database

- PostgreSQL

## 3. Folder structure frontend

```text
frontend/
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── students/
│   │   │   ├── lecturers/
│   │   │   ├── skills/
│   │   │   ├── career-goals/
│   │   │   ├── advisor-assignments/
│   │   │   └── reports/
│   │   ├── lecturer/
│   │   │   ├── dashboard/
│   │   │   ├── students/
│   │   │   ├── evidences/
│   │   │   ├── reviews/
│   │   │   └── reports/
│   │   └── student/
│   │       ├── dashboard/
│   │       ├── profile/
│   │       ├── skills/
│   │       ├── projects/
│   │       ├── certificates/
│   │       ├── activities/
│   │       ├── experiences/
│   │       ├── evidences/
│   │       ├── analysis/
│   │       ├── recommendations/
│   │       ├── roadmap/
│   │       └── portfolio/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── styles/
```

## 4. Folder structure backend

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── utils/
│   ├── prisma/
│   ├── auth/
│   ├── users/
│   ├── students/
│   ├── lecturers/
│   ├── advisor-assignments/
│   ├── skill-categories/
│   ├── skills/
│   ├── career-goals/
│   ├── student-profiles/
│   ├── student-skills/
│   ├── student-projects/
│   ├── student-certificates/
│   ├── student-activities/
│   ├── student-experiences/
│   ├── evidences/
│   ├── competency-analysis/
│   ├── recommendations/
│   ├── roadmaps/
│   ├── advisor-reviews/
│   ├── notifications/
│   ├── dashboard/
│   ├── exports/
│   ├── activity-logs/
│   └── scheduler/
```

## 5. Prisma schema modules

### Identity & Access

- `User`
- `Student`
- `Lecturer`
- `AdvisorAssignment`

### Skill Catalog

- `SkillCategory`
- `Skill`

### Career Configuration

- `CareerGoal`
- `CareerRequiredSkill`
- `RecommendationTemplate`

### Student Profile

- `StudentProfile`
- `StudentSkill`
- `StudentProject`
- `StudentCertificate`
- `StudentActivity`
- `StudentExperience`
- `Evidence`

### Analysis

- `CompetencyAnalysisResult`
- `CompetencyAnalysisDetail`

### Recommendation & Roadmap

- `StudentRecommendation`
- `DevelopmentRoadmap`
- `RoadmapItem`

### Collaboration & Notification

- `AdvisorReview`
- `Notification`
- `NotificationLog`

### Audit & Export

- `ActivityLog`
- `ExportLog`

## 6. Backend modules

| Module | Chức năng |
|---|---|
| `auth` | Đăng nhập, đăng xuất, JWT, phân quyền |
| `users` | Quản lý tài khoản |
| `students` | Quản lý sinh viên |
| `lecturers` | Quản lý giảng viên/cố vấn |
| `advisor-assignments` | Phân công cố vấn |
| `skill-categories` | Quản lý nhóm kỹ năng |
| `skills` | Quản lý kỹ năng |
| `career-goals` | Quản lý mục tiêu nghề nghiệp |
| `student-profiles` | Quản lý hồ sơ năng lực |
| `student-skills` | Quản lý kỹ năng sinh viên |
| `student-projects` | Quản lý dự án |
| `student-certificates` | Quản lý chứng chỉ |
| `student-activities` | Quản lý hoạt động |
| `student-experiences` | Quản lý kinh nghiệm |
| `evidences` | Upload và xác nhận minh chứng |
| `competency-analysis` | Phân tích năng lực |
| `recommendations` | Sinh gợi ý phát triển |
| `roadmaps` | Sinh và theo dõi lộ trình |
| `advisor-reviews` | Nhận xét của cố vấn |
| `notifications` | Thông báo hệ thống |
| `dashboard` | Thống kê theo vai trò |
| `exports` | Xuất PDF/Excel |
| `activity-logs` | Lưu lịch sử thao tác |
| `scheduler` | Cron nhắc nhở tự động |

## 7. Frontend pages

### Auth

- `/login`
- `/change-password`

### Student

- `/student/dashboard`
- `/student/profile`
- `/student/skills`
- `/student/projects`
- `/student/certificates`
- `/student/activities`
- `/student/experiences`
- `/student/evidences`
- `/student/analysis`
- `/student/recommendations`
- `/student/roadmap`
- `/student/portfolio`

### Lecturer

- `/lecturer/dashboard`
- `/lecturer/students`
- `/lecturer/students/[id]`
- `/lecturer/evidences`
- `/lecturer/reviews`
- `/lecturer/reports`

### Admin

- `/admin/dashboard`
- `/admin/users`
- `/admin/students`
- `/admin/lecturers`
- `/admin/skill-categories`
- `/admin/skills`
- `/admin/career-goals`
- `/admin/career-goals/[id]/required-skills`
- `/admin/advisor-assignments`
- `/admin/reports`
- `/admin/activity-logs`

## 8. API cần xây dựng

### Auth

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/change-password
```

### Users

```text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
PATCH  /api/users/:id/status
DELETE /api/users/:id
```

### Students

```text
GET    /api/students
POST   /api/students
POST   /api/students/import
GET    /api/students/:id
PATCH  /api/students/:id
DELETE /api/students/:id
```

### Lecturers

```text
GET    /api/lecturers
POST   /api/lecturers
POST   /api/lecturers/import
GET    /api/lecturers/:id
PATCH  /api/lecturers/:id
DELETE /api/lecturers/:id
```

### Skills

```text
GET    /api/skill-categories
POST   /api/skill-categories
PATCH  /api/skill-categories/:id
DELETE /api/skill-categories/:id

GET    /api/skills
POST   /api/skills
PATCH  /api/skills/:id
DELETE /api/skills/:id
```

### Career goals

```text
GET    /api/career-goals
POST   /api/career-goals
GET    /api/career-goals/:id
PATCH  /api/career-goals/:id
DELETE /api/career-goals/:id

GET    /api/career-goals/:id/required-skills
POST   /api/career-goals/:id/required-skills
PATCH  /api/career-goals/:id/required-skills/:requiredSkillId
DELETE /api/career-goals/:id/required-skills/:requiredSkillId
```

### Student profile

```text
GET    /api/student-profile/me
PATCH  /api/student-profile/me
PATCH  /api/student-profile/me/career-goal
GET    /api/student-profile/:studentId
```

### Student competency data

```text
GET    /api/student-skills/me
POST   /api/student-skills
PATCH  /api/student-skills/:id
DELETE /api/student-skills/:id

GET    /api/student-projects/me
POST   /api/student-projects
PATCH  /api/student-projects/:id
DELETE /api/student-projects/:id

GET    /api/student-certificates/me
POST   /api/student-certificates
PATCH  /api/student-certificates/:id
DELETE /api/student-certificates/:id

GET    /api/student-activities/me
POST   /api/student-activities
PATCH  /api/student-activities/:id
DELETE /api/student-activities/:id

GET    /api/student-experiences/me
POST   /api/student-experiences
PATCH  /api/student-experiences/:id
DELETE /api/student-experiences/:id
```

### Evidences

```text
GET    /api/evidences/me
POST   /api/evidences
GET    /api/evidences/:id
GET    /api/evidences/pending
PATCH  /api/evidences/:id/verify
PATCH  /api/evidences/:id/reject
DELETE /api/evidences/:id
```

### Competency analysis

```text
POST   /api/competency/analyze/me
GET    /api/competency/analysis-history/me
GET    /api/competency/analysis-results/:id
GET    /api/competency/student/:studentId/latest
```

### Recommendations

```text
GET    /api/recommendations/me
PATCH  /api/recommendations/:id/status
GET    /api/recommendations/student/:studentId
```

### Roadmaps

```text
GET    /api/roadmaps/me
POST   /api/roadmaps/generate/me
GET    /api/roadmaps/:id
PATCH  /api/roadmaps/:id/status
PATCH  /api/roadmap-items/:id/status
POST   /api/roadmap-items/:id/evidence
GET    /api/roadmaps/student/:studentId
```

### Reviews

```text
GET    /api/advisor-reviews/student/:studentId
POST   /api/advisor-reviews
PATCH  /api/advisor-reviews/:id
DELETE /api/advisor-reviews/:id
```

### Notifications

```text
GET    /api/notifications/me
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### Dashboard

```text
GET    /api/dashboard/student
GET    /api/dashboard/lecturer
GET    /api/dashboard/admin
```

### Exports

```text
GET    /api/exports/portfolio/me
GET    /api/exports/students
GET    /api/exports/competency
GET    /api/exports/lecturer/students
```

## 9. Rule-based recommendation engine

Các công thức chính:

```text
skill_score = min(current_level / required_level, 1) * weight

match_percent = total_skill_score / total_weight * 100

gap = required_level - current_level

priority_score = gap * weight

roadmap_progress = completed_item_weight / total_item_weight * 100
```

Nên tách phần này thành service riêng:

```text
competency-analysis/
├── calculators/
│   ├── profile-completion.calculator.ts
│   ├── career-match.calculator.ts
│   ├── missing-skills.calculator.ts
│   └── risk-score.calculator.ts
├── engines/
│   └── competency-analysis.engine.ts
└── services/
```

## 10. Phân quyền

| Vai trò | Quyền |
|---|---|
| Student | Chỉ xem/sửa hồ sơ của chính mình |
| Lecturer | Xem sinh viên được phân công, xác nhận minh chứng, nhận xét |
| Admin | Quản lý toàn bộ dữ liệu và cấu hình hệ thống |

Backend cần có:

- `JwtAuthGuard`
- `RolesGuard`
- `OwnershipGuard`
- `AdvisorScopeGuard`

## 11. Kết luận

Hệ thống nên triển khai theo hướng **Modular Monolith**, backend NestJS chia module theo domain, frontend Next.js chia route theo vai trò, database PostgreSQL quản lý dữ liệu qua Prisma.

Thứ tự triển khai nên là:

1. Auth và phân quyền.
2. User, Student, Lecturer.
3. Skill catalog và Career goal.
4. Student profile.
5. Evidence verification.
6. Competency analysis.
7. Recommendation và Roadmap.
8. Dashboard, Notification, Export.
