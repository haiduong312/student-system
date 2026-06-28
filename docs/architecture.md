# Thiết kế kiến trúc hệ thống Student Digital Competency Profile & Personal Development Roadmap

Tài liệu này mô tả kiến trúc đúng theo source code hiện tại trong `backend/src`, `backend/prisma/schema.prisma` và `frontend/src`.

## 1. Kiến trúc tổng thể

Hệ thống đang được triển khai theo mô hình **Modular Monolith**:

```text
Next.js 15 + React 18 + Ant Design
        |
        | Axios REST API + Bearer access token + refresh cookie
        v
NestJS 11 + Prisma 7
        |
        v
PostgreSQL
```

Backend dùng `api` làm global prefix, Swagger ở `/api/docs`, CORS bật `origin: true` và `credentials: true`. Các request được bảo vệ mặc định bằng `JwtAuthGuard`; endpoint public dùng decorator `@Public()`. Phân quyền theo `UserRole` được áp dụng bằng `@Roles(...)` và `RolesGuard`.

## 2. Công nghệ đang dùng

### Frontend

- Next.js 15 App Router.
- React 18, TypeScript.
- Ant Design 5 và `@ant-design/icons`.
- TanStack React Query cho server state.
- Axios client tại `frontend/src/lib/api.ts`.
- Access token lưu qua `authStorage`; refresh token là cookie httpOnly do backend set ở path `/api/auth`.

### Backend

- NestJS 11, TypeScript.
- Prisma ORM 7 với PostgreSQL adapter `@prisma/adapter-pg`.
- JWT access token + refresh token hash trong bảng `users`.
- Swagger/OpenAPI.
- Global `ValidationPipe`, `GlobalExceptionFilter`, `ResponseInterceptor`.
- Multer upload qua `FileInterceptor`.
- `@nestjs/schedule` cho notification cron.
- `ActivityLogsService` và `ExportLogsService` là global modules.

### Database

- PostgreSQL.
- Schema chính: `backend/prisma/schema.prisma`.
- Seed hiện tại upsert một số skill nền tảng trong `backend/prisma/seed.ts`.

## 3. Cấu trúc frontend hiện tại

```text
frontend/src/
├── app/
│   ├── login/
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── students/
│   │   ├── lecturers/
│   │   ├── skill-categories/
│   │   ├── skills/
│   │   ├── career-goals/
│   │   ├── assessment-questions/
│   │   ├── advisor-assignments/
│   │   └── reports/
│   ├── lecturer/
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── evidences/
│   │   ├── reviews/
│   │   └── reports/
│   └── student/
│       ├── dashboard/
│       ├── profile/
│       ├── skills/
│       ├── projects/
│       ├── certificates/
│       ├── activities/
│       ├── experiences/
│       ├── evidences/
│       ├── assessment/
│       ├── analysis/
│       ├── recommendations/
│       ├── roadmap/
│       ├── portfolio/
│       └── notifications/
├── components/
├── features/
├── hooks/
├── lib/
└── types/
```

Các route có UI nghiệp vụ rõ:

- Dashboard theo role.
- Admin catalog: skill categories, skills, career goals, specializations, required skills.
- Admin question bank.
- Student profile/resources/evidence, assessment, analysis, recommendations, roadmap, notifications.
- Lecturer evidence review.

Các route hiện là placeholder UI:

- Admin: `users`, `students`, `lecturers`, `advisor-assignments`, `reports`.
- Lecturer: `students`, `reviews`, `reports`.
- Student: `portfolio`.

Lưu ý: backend đã có API cho nhiều route placeholder này, nhưng frontend chưa dựng màn quản trị tương ứng.

## 4. Cấu trúc backend hiện tại

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── app.module.ts
    ├── main.ts
    ├── activity-logs/
    ├── advisor-assignments/
    ├── advisor-reviews/
    ├── assessment-questions/
    ├── assessments/
    ├── auth/
    ├── career-goals/
    ├── common/
    ├── competency-analysis/
    ├── dashboard/
    ├── evidences/
    ├── export-logs/
    ├── learning-resources/
    ├── lecturers/
    ├── notifications/
    ├── prisma/
    ├── profiles/
    ├── recommendation-templates/
    ├── recommendations/
    ├── roadmaps/
    ├── skill-categories/
    ├── skills/
    ├── students/
    └── users/
```

`app.module.ts` import đầy đủ các module domain trên. `ActivityLogsModule` và `ExportLogsModule` là `@Global()` modules, cung cấp service nội bộ cho các module khác.

## 5. Prisma modules

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
- `Specialization`
- `CareerRequiredSkill`

### Assessment Question Bank & Runtime

- `AssessmentQuestion`
- `AssessmentOption`
- `Assessment`
- `AssessmentQuestionItem`
- `AssessmentAnswer`
- `AssessmentSkillResult`

### Student Profile & Evidence

- `StudentProfile`
- `StudentSkill`
- `StudentProject`
- `StudentCertificate`
- `StudentActivity`
- `StudentExperience`
- `Evidence`
- `AdvisorReview`

### Analysis, Recommendation, Resource & Roadmap

- `CompetencyAnalysisResult`
- `CompetencyAnalysisDetail`
- `RecommendationTemplate`
- `StudentRecommendation`
- `LearningResource`
- `LearningResourceSkill`
- `RecommendationTemplateResource`
- `StudentRecommendationResource`
- `StudentResourceProgress`
- `DevelopmentRoadmap`
- `RoadmapItem`
- `StudentRoadmapProgress`

### Notification, Audit & Export

- `Notification`
- `NotificationLog`
- `ActivityLog`
- `ExportLog`

## 6. Backend modules

| Module | Trạng thái | Chức năng trong code |
|---|---|---|
| `auth` | Có API | Login, refresh, logout, profile/me, change password |
| `users` | Có API một phần | Admin list/detail/update/deactivate/reactivate/reset-password; current user |
| `students` | Có API | Admin CRUD/import/status, lecturer/student read theo quyền |
| `lecturers` | Có API | Admin CRUD/status, lecturer read own detail |
| `advisor-assignments` | Có API | Admin CRUD phân công cố vấn |
| `skill-categories` | Có API | Admin CRUD nhóm kỹ năng |
| `skills` | Có API | Admin CRUD; list cho cả 3 role, non-admin active-only |
| `career-goals` | Có API | Admin CRUD career goal và career-level required skills; list cho cả 3 role |
| `career-goals/specializations` | Có API | Admin CRUD specialization và specialization required skills; public active list theo career goal |
| `learning-resources` | Có API | Admin CRUD/link skill, student update progress |
| `recommendation-templates` | Có API | Admin CRUD template và link learning resources |
| `assessment-questions` | Có API | Admin CRUD ngân hàng câu hỏi/options |
| `assessments` | Có API | Student start/submit bài đánh giá |
| `profiles` | Có API | Profile sinh viên, resources, avatar, nested evidence upload |
| `evidences` | Có API | Upload, danh sách, queue pending, verify/reject |
| `advisor-reviews` | Có API | Lecturer tạo review, student/admin/lecturer xem theo quyền |
| `competency-analysis` | Có API | Phân tích năng lực, lịch sử, chi tiết; base path alias `competency` |
| `recommendations` | Có API | Student xem/cập nhật trạng thái gợi ý |
| `roadmaps` | Có API | Sinh roadmap, active roadmap, history, detail, update item status |
| `notifications` | Có API | Danh sách, unread count, mark read/all read, scheduler |
| `dashboard` | Có API | Dashboard theo Student/Lecturer/Admin |
| `activity-logs` | Service nội bộ | Ghi log thao tác, chưa có controller đọc log |
| `export-logs` | Service nội bộ | Ghi log export, chưa có controller export |
| `common/upload` | Có API | Serve private profile uploads |

## 7. API thực tế

Tất cả endpoint bên dưới có prefix `/api`.

### Health

```text
GET /health
```

### Auth

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/profile
GET  /auth/me
POST /auth/change-password
```

### Users, students, lecturers

```text
GET   /users/me
GET   /users
GET   /users/:id
PATCH /users/:id
PATCH /users/:id/deactivate
PATCH /users/:id/reactivate
PATCH /users/:id/reset-password

GET   /students
POST  /students
POST  /students/import
GET   /students/:id
PATCH /students/:id
PATCH /students/:id/deactivate
PATCH /students/:id/reactivate

GET   /lecturers
POST  /lecturers
GET   /lecturers/:id
PATCH /lecturers/:id
PATCH /lecturers/:id/deactivate
PATCH /lecturers/:id/reactivate
```

### Catalog and career configuration

```text
GET|POST /skill-categories
GET|PATCH|DELETE /skill-categories/:id

GET|POST /skills
GET|PATCH|DELETE /skills/:id

GET|POST /career-goals
GET|PATCH|DELETE /career-goals/:id
GET|POST /career-goals/:careerGoalId/required-skills
PATCH|DELETE /career-goals/:careerGoalId/required-skills/:requiredSkillId

GET /career-goals/:careerGoalId/specializations

GET    /admin/specializations
GET    /admin/specializations/:id
GET    /admin/career-goals/:careerGoalId/specializations
POST   /admin/specializations
PATCH  /admin/specializations/:id
DELETE /admin/specializations/:id
GET    /admin/specializations/:specializationId/required-skills
POST   /admin/specializations/:specializationId/required-skills
PATCH  /admin/specializations/:specializationId/required-skills/:id
DELETE /admin/specializations/:specializationId/required-skills/:id
```

### Resources, templates, assignments, reviews

```text
GET|POST /learning-resources
GET|PATCH|DELETE /learning-resources/:id
PATCH /learning-resources/:id/progress
POST /learning-resources/:id/skills
PATCH|DELETE /learning-resources/:id/skills/:skillId

GET|POST /recommendation-templates
GET|PATCH|DELETE /recommendation-templates/:id
GET|POST /recommendation-templates/:id/resources
DELETE /recommendation-templates/:id/resources/:resourceId

GET|POST /advisor-assignments
GET|PATCH|DELETE /advisor-assignments/:id

POST /advisor-reviews/students/:studentId
GET  /advisor-reviews/me
GET  /advisor-reviews
GET  /advisor-reviews/students/:studentId
GET  /advisor-reviews/:id
```

### Assessment

```text
GET|POST /assessment-questions
GET|PATCH|DELETE /assessment-questions/:id

POST /assessments/start
POST /assessments/:id/submit
```

### Profiles and student resources

```text
GET   /profiles/me
PATCH /profiles/me
POST  /profiles/me/avatar

GET|POST /profiles/me/skills
GET|PATCH|DELETE /profiles/me/skills/:id
POST /profiles/me/skills/:id/evidences

GET|POST /profiles/me/projects
GET|PATCH|DELETE /profiles/me/projects/:id
POST /profiles/me/projects/:id/evidences

GET|POST /profiles/me/certificates
GET|PATCH|DELETE /profiles/me/certificates/:id
POST /profiles/me/certificates/:id/evidences

GET|POST /profiles/me/activities
GET|PATCH|DELETE /profiles/me/activities/:id
POST /profiles/me/activities/:id/evidences

GET|POST /profiles/me/experiences
GET|PATCH|DELETE /profiles/me/experiences/:id
POST /profiles/me/experiences/:id/evidences

GET /profiles/:studentId
GET /profiles/:studentId/skills
GET /profiles/:studentId/projects
GET /profiles/:studentId/certificates
GET /profiles/:studentId/activities
GET /profiles/:studentId/experiences
```

### Evidence, competency, recommendations, roadmaps

```text
POST  /evidences
GET   /evidences/me
GET   /evidences/pending
GET   /evidences
GET   /evidences/:id
PATCH /evidences/:id/verify
PATCH /evidences/:id/reject

POST /competency/analyze/me
GET  /competency/analysis-history/me
GET  /competency/analysis-results/:id
POST /competency/students/:studentId/analyze

POST /competency-analysis/analyze/me
GET  /competency-analysis/analysis-history/me
GET  /competency-analysis/analysis-results/:id
POST /competency-analysis/students/:studentId/analyze

GET   /recommendations/me
PATCH /recommendations/:id/status

POST  /roadmaps/generate/me
GET   /roadmaps/me
GET   /roadmaps/history/me
GET   /roadmaps/:id
PATCH /roadmap-items/:id/status
PATCH /roadmaps/items/:id/status
POST  /roadmaps/students/:studentId/generate
```

### Notifications, uploads, dashboard

```text
GET   /notifications/me
GET   /notifications/me/unread-count
PATCH /notifications/:id/read
PATCH /notifications/read-all

GET /uploads/profiles/:filename

GET /dashboard/student
GET /dashboard/lecturer
GET /dashboard/admin
```

## 8. Luồng nghiệp vụ chính

### Assessment

```text
Admin
  -> tạo Skill/Skill Category
  -> tạo Career Goal
  -> cấu hình Required Skills và optional Specialization Required Skills
  -> tạo Assessment Questions theo Skill

Student
  -> chọn Career Goal/Specialization trong Profile
  -> POST /assessments/start
  -> nhận câu hỏi theo required skills của profile context
  -> submit tất cả answer trong 60 phút
  -> hệ thống chấm điểm, tạo AssessmentSkillResult
  -> upsert StudentSkill.currentLevel nếu kết quả cao hơn level hiện có
```

Assessment có tối đa 3 lần hoàn thành trong cùng career goal/specialization, cooldown 30 phút và tự cancel assessment đang làm đã hết hạn.

### Competency analysis, recommendation and roadmap

```text
Student Profile + Student Skills + Scoped Evidence
        |
        v
POST /competency/analyze/me
        |
        v
CompetencyAnalysisResult(CURRENT) + Details
        |
        v
StudentRecommendation + StudentRecommendationResource snapshots
        |
        v
POST /roadmaps/generate/me
        |
        v
DevelopmentRoadmap + RoadmapItems
```

Roadmap được sinh từ analysis `CURRENT` mới nhất và recommendation thuộc chính kết quả đó. Khi sinh roadmap mới, active roadmap hiện tại được archive mặc định. Resource progress có thể tự complete recommendation và roadmap item tương ứng.

### Evidence review

```text
Student uploads evidence
        |
        v
Evidence PENDING + resource verification status recalculated
        |
        v
Lecturer/Admin verify or reject
        |
        v
Evidence VERIFIED/REJECTED + resource status recalculated
```

Lecturer chỉ được review evidence của sinh viên đang được phân công active.

### Catalog invalidation

```text
Career/Skill catalog or required skill changes
        |
        v
CatalogContextInvalidationService
        |
        v
CURRENT analyses -> OBSOLETE
actionable recommendations -> OBSOLETE
ACTIVE roadmaps -> ARCHIVED
IN_PROGRESS assessments -> CANCELLED
profile match/risk analysis fields -> reset
```

Mục tiêu là không để analysis, recommendation, roadmap hoặc assessment cũ tiếp tục đại diện cho catalog đã đổi.

## 9. Chuẩn response và lỗi

Response thành công mặc định:

```json
{
  "success": true,
  "data": {}
}
```

Response phân trang:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Response lỗi:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "path": "/api/...",
  "timestamp": "..."
}
```

## 10. Phân quyền

| Vai trò | Quyền chính |
|---|---|
| `STUDENT` | Quản lý profile/resource/evidence của chính mình, làm assessment, xem analysis/recommendation/roadmap/notification/advisor review của mình, cập nhật resource progress |
| `LECTURER` | Xem dashboard lecturer, xem student/profile/analysis/roadmap/review trong phạm vi assignment active, duyệt evidence pending, tạo advisor review |
| `ADMIN` | Quản lý user/student/lecturer/catalog/career/specialization/question/resource/template/assignment, xem dashboard admin, duyệt evidence toàn hệ thống, xem toàn bộ advisor reviews |

## 11. Ghi chú hiện trạng codebase

- Backend có script `npm test` dùng Node test runner + `tsx` cho `src/**/*.spec.ts`.
- Frontend `npm run lint` đang trỏ `next lint`, trong Next.js 15 cần kiểm tra lại khi chạy thực tế.
- Một số frontend type có giá trị legacy không tồn tại trong Prisma enum hiện tại, ví dụ `VERIFIED_WITH_PENDING_CHANGES`.
- Chưa có controller đọc `ActivityLog` hoặc endpoint export PDF/Excel, dù schema/service đã có.
- Nhiều API quản trị mới chưa có UI tương ứng trong frontend.
