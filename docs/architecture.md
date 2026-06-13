# Thiết kế kiến trúc hệ thống Student Digital Competency Profile & Personal Development Roadmap

Tài liệu này mô tả kiến trúc đúng theo code hiện tại trong `backend/src`, `backend/prisma/schema.prisma` và `frontend/src`.

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

### Database

- PostgreSQL.
- Schema chính: `backend/prisma/schema.prisma`.
- Seed hiện tại chỉ upsert một số skill nền tảng trong `backend/prisma/seed.ts`.

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

Các route admin `users`, `students`, `lecturers`, `reports`, lecturer `students`, `reviews`, `reports`, và student `portfolio` hiện là placeholder UI. Các route có UI nghiệp vụ rõ gồm dashboard, catalog, question bank, profile resources, evidence review, assessment, analysis, recommendations, roadmap và notifications.

## 4. Cấu trúc backend hiện tại

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── app.module.ts
    ├── main.ts
    ├── auth/
    ├── users/
    ├── students/
    ├── lecturers/
    ├── advisor-assignments/
    ├── skill-categories/
    ├── skills/
    ├── career-goals/
    ├── assessment-questions/
    ├── assessments/
    ├── profiles/
    ├── evidences/
    ├── competency-analysis/
    ├── recommendations/
    ├── roadmaps/
    ├── notifications/
    ├── dashboard/
    ├── prisma/
    └── common/
```

`students` và `lecturers` đã có module/controller/service shell nhưng controller chưa expose endpoint CRUD riêng.

## 5. Prisma modules

### Identity & Access

- `User`
- `Student`
- `Lecturer`
- `AdvisorAssignment`

### Skill Catalog

- `SkillCategory`
- `Skill`

### Assessment Question Bank

- `AssessmentQuestion`
- `AssessmentOption`

### Assessment

- `Assessment`
- `AssessmentQuestionItem`
- `AssessmentAnswer`
- `AssessmentSkillResult`

### Career Configuration

- `CareerGoal`
- `Specialization`
- `CareerRequiredSkill`

`Specialization` tồn tại trong Prisma và được analysis/roadmap đọc nếu `student_profiles.specialization_id` có dữ liệu. Code hiện tại chưa có controller/UI riêng để CRUD specialization hoặc chọn specialization trong profile.

### Student Profile

- `StudentProfile`
- `StudentSkill`
- `StudentProject`
- `StudentCertificate`
- `StudentActivity`
- `StudentExperience`
- `Evidence`
- `AdvisorReview`

### Analysis, Recommendation & Roadmap

- `CompetencyAnalysisResult`
- `CompetencyAnalysisDetail`
- `RecommendationTemplate`
- `StudentRecommendation`
- `DevelopmentRoadmap`
- `RoadmapItem`
- `StudentRoadmapProgress`

`RecommendationTemplate` có trong schema và được `CompetencyAnalysisService` dùng để fallback template, nhưng hiện chưa có controller/UI quản trị template.

### Notification, Audit & Export

- `Notification`
- `NotificationLog`
- `ActivityLog`
- `ExportLog`

`ActivityLog` và `ExportLog` tồn tại trong schema nhưng hiện chưa có API export/audit log.

## 6. Backend modules

| Module | Trạng thái | Chức năng trong code |
|---|---|---|
| `auth` | Có API | Login, refresh, logout, profile/me, change password |
| `users` | Một phần | `GET /users`, `GET /users/me`; chưa có CRUD user |
| `students` | Shell | Chưa expose endpoint |
| `lecturers` | Shell | Chưa expose endpoint |
| `advisor-assignments` | Có API | CRUD phân công cố vấn cho admin |
| `skill-categories` | Có API | CRUD nhóm kỹ năng |
| `skills` | Có API | CRUD kỹ năng, lọc theo type/status/category, đếm question bank |
| `career-goals` | Có API | CRUD mục tiêu nghề nghiệp, quản lý required skills |
| `assessment-questions` | Có API mới | Admin CRUD ngân hàng câu hỏi |
| `assessments` | Có API mới | Student start/submit bài đánh giá |
| `profiles` | Có API | Profile sinh viên, resources, avatar, evidence nested upload |
| `evidences` | Có API | Upload, danh sách, queue pending, verify/reject |
| `competency-analysis` | Có API | Phân tích năng lực, lịch sử, chi tiết |
| `recommendations` | Có API | Student xem/cập nhật trạng thái gợi ý |
| `roadmaps` | Có API | Sinh roadmap, active roadmap, history, update item status |
| `notifications` | Có API | Danh sách, unread count, mark read/all read |
| `dashboard` | Có API | Dashboard theo Student/Lecturer/Admin |

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

### Users

```text
GET /users/me
GET /users
```

### Catalog

```text
GET    /skill-categories
POST   /skill-categories
GET    /skill-categories/:id
PATCH  /skill-categories/:id
DELETE /skill-categories/:id

GET    /skills
POST   /skills
GET    /skills/:id
PATCH  /skills/:id
DELETE /skills/:id
```

### Career goals

```text
GET    /career-goals
POST   /career-goals
GET    /career-goals/:id
PATCH  /career-goals/:id
DELETE /career-goals/:id

GET    /career-goals/:careerGoalId/required-skills
POST   /career-goals/:careerGoalId/required-skills
PATCH  /career-goals/:careerGoalId/required-skills/:requiredSkillId
DELETE /career-goals/:careerGoalId/required-skills/:requiredSkillId
```

### Assessment question bank

```text
GET    /assessment-questions
POST   /assessment-questions
GET    /assessment-questions/:id
PATCH  /assessment-questions/:id
DELETE /assessment-questions/:id
```

`DELETE` không xóa vật lý mà chuyển `status` sang `INACTIVE`.

### Assessments

```text
POST /assessments/start
POST /assessments/:id/submit
```

### Profiles and student resources

```text
GET   /profiles/me
PATCH /profiles/me
POST  /profiles/me/avatar

GET    /profiles/me/skills
POST   /profiles/me/skills
GET    /profiles/me/skills/:id
PATCH  /profiles/me/skills/:id
DELETE /profiles/me/skills/:id
POST   /profiles/me/skills/:id/evidences

GET    /profiles/me/projects
POST   /profiles/me/projects
GET    /profiles/me/projects/:id
PATCH  /profiles/me/projects/:id
DELETE /profiles/me/projects/:id
POST   /profiles/me/projects/:id/evidences

GET    /profiles/me/certificates
POST   /profiles/me/certificates
GET    /profiles/me/certificates/:id
PATCH  /profiles/me/certificates/:id
DELETE /profiles/me/certificates/:id
POST   /profiles/me/certificates/:id/evidences

GET    /profiles/me/activities
POST   /profiles/me/activities
GET    /profiles/me/activities/:id
PATCH  /profiles/me/activities/:id
DELETE /profiles/me/activities/:id
POST   /profiles/me/activities/:id/evidences

GET    /profiles/me/experiences
POST   /profiles/me/experiences
GET    /profiles/me/experiences/:id
PATCH  /profiles/me/experiences/:id
DELETE /profiles/me/experiences/:id
POST   /profiles/me/experiences/:id/evidences

GET /profiles/:studentId
GET /profiles/:studentId/skills
GET /profiles/:studentId/projects
GET /profiles/:studentId/certificates
GET /profiles/:studentId/activities
GET /profiles/:studentId/experiences
```

### Evidences

```text
POST  /evidences
GET   /evidences/me
GET   /evidences/pending
GET   /evidences
GET   /evidences/:id
PATCH /evidences/:id/verify
PATCH /evidences/:id/reject
```

### Competency analysis

Controller hỗ trợ hai alias base path: `/competency-analysis` và `/competency`.

```text
POST /competency/analyze/me
GET  /competency/analysis-history/me
GET  /competency/analysis-results/:id
POST /competency/students/:studentId/analyze
```

### Recommendations

```text
GET   /recommendations/me
PATCH /recommendations/:id/status
```

### Roadmaps

```text
POST  /roadmaps/generate/me
GET   /roadmaps/me
GET   /roadmaps/history/me
GET   /roadmaps/:id
PATCH /roadmap-items/:id/status
PATCH /roadmaps/items/:id/status
POST  /roadmaps/students/:studentId/generate
```

`GET /roadmaps/me` trả về active roadmap hoặc `null`, không trả paginated list.

### Notifications

```text
GET   /notifications/me
GET   /notifications/me/unread-count
PATCH /notifications/:id/read
PATCH /notifications/read-all
```

### Dashboard

```text
GET /dashboard/student
GET /dashboard/lecturer
GET /dashboard/admin
```

## 8. API chưa có trong code hiện tại

Các phần sau có model hoặc placeholder UI/tài liệu cũ, nhưng chưa có controller/API hoàn chỉnh:

- CRUD `students`.
- CRUD `lecturers`.
- CRUD/create/update/delete `users`.
- CRUD `specializations`.
- CRUD `recommendation-templates`.
- API `advisor-reviews`.
- API `exports` PDF/Excel.
- API `activity-logs`.

## 9. Luồng nghiệp vụ chính

### Assessment

```text
Admin
  -> tạo Skill/Skill Category
  -> tạo Career Goal
  -> cấu hình Required Skills
  -> tạo Assessment Questions theo Skill

Student
  -> chọn Career Goal trong Profile
  -> POST /assessments/start
  -> nhận danh sách câu hỏi theo required skills
  -> submit tất cả answer
  -> hệ thống chấm điểm, tạo AssessmentSkillResult
  -> upsert StudentSkill.currentLevel
```

Quy tắc chọn câu hỏi:

- Lấy required skills `isRequired = true` theo career goal.
- Mỗi skill chọn tối đa 6 câu.
- Số câu mong muốn bằng `min(6, max(requiredLevel * 2, requiredLevel))`.
- Chỉ chọn câu `ACTIVE` và `level <= requiredLevel`.
- Ưu tiên phủ các level từ thấp đến cao, sau đó bổ sung câu còn thiếu.

Quy tắc tính level:

- Mỗi level cần đạt tối thiểu 60% số câu đúng.
- Level hiện tại tăng liên tiếp từ level 1; nếu một level không đạt thì dừng.

### Competency analysis and roadmap

```text
Student Profile + Student Skills
        |
        v
POST /competency/analyze/me
        |
        v
CompetencyAnalysisResult + Details
        |
        v
StudentRecommendation
        |
        v
POST /roadmaps/generate/me
        |
        v
DevelopmentRoadmap + RoadmapItems
```

Roadmap được sinh từ kết quả phân tích mới nhất và recommendation thuộc chính kết quả đó. Khi sinh roadmap mới, active roadmap hiện tại được archive mặc định.

### Evidence review

```text
Student uploads evidence
        |
        v
Evidence PENDING + resource verification PENDING
        |
        v
Lecturer/Admin verify or reject
        |
        v
Evidence VERIFIED/REJECTED + resource status updated
```

Lecturer chỉ được review evidence của sinh viên đang được phân công active.

## 10. Chuẩn response và lỗi

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

## 11. Phân quyền

| Vai trò | Quyền chính |
|---|---|
| `STUDENT` | Quản lý profile/resource/evidence của chính mình, làm assessment, xem analysis/recommendation/roadmap/notification của mình |
| `LECTURER` | Xem dashboard lecturer, xem profile/analysis/roadmap của sinh viên được phân công, duyệt evidence pending của sinh viên được phân công |
| `ADMIN` | Quản lý catalog, career goals, question bank, advisor assignments, xem dashboard admin, duyệt evidence toàn hệ thống |

## 12. Ghi chú hiện trạng codebase

- Dự án hiện chưa khai báo script test tự động trong `backend/package.json` hoặc `frontend/package.json`.
- `frontend/src/features/student/WorkflowPages.tsx` đang gọi `GET /roadmaps/me` như paginated list, trong khi backend trả về object/null. Tài liệu API ở trên theo backend source of truth.
- Frontend student profile/skills cần danh sách `career-goals` và `skills` để chọn option, nhưng backend hiện khóa các controller catalog này theo `ADMIN`; cần thêm read-only endpoint hoặc nới role cho list/detail phù hợp.
- Một số trang frontend là placeholder để giữ sitemap theo vai trò.
- Các model `Specialization`, `RecommendationTemplate`, `ActivityLog`, `ExportLog` đã có trong Prisma nhưng chưa có UI/API quản trị riêng.
