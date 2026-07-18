# PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## Tên đề tài

**Student Digital Competency Profile & Personal Development Roadmap**

Tài liệu này mô tả yêu cầu chức năng theo source code hiện tại trong `backend/src`, `backend/prisma/schema.prisma` và `frontend/src`. Những phần chỉ có model/service nội bộ hoặc UI placeholder được ghi rõ để tránh nhầm với chức năng đã hoàn chỉnh end-to-end.

## 1. Tổng quan

Hệ thống hỗ trợ sinh viên xây dựng hồ sơ năng lực số, chọn mục tiêu nghề nghiệp và chuyên sâu, làm bài đánh giá kỹ năng, nhận phân tích mức độ phù hợp, nhận gợi ý phát triển kèm tài nguyên học tập và theo dõi lộ trình cá nhân. Admin quản lý danh mục nền tảng, tài khoản, phân công cố vấn và template gợi ý. Giảng viên/cố vấn theo dõi sinh viên được phân công, duyệt minh chứng và viết nhận xét.

## 2. Đối tượng sử dụng

| Tác nhân | Vai trò trong hệ thống |
|---|---|
| Admin | Quản lý user, student, lecturer, catalog, career goals, specializations, required skills, question bank, learning resources, recommendation templates, advisor assignments, dashboard hệ thống |
| Lecturer | Xem dashboard giảng viên, xem sinh viên được phân công, duyệt minh chứng, tạo/xem advisor review |
| Student | Quản lý profile/resources/evidence, làm assessment, xem analysis/recommendations/roadmap/notifications/advisor reviews |

## 3. Trạng thái triển khai hiện tại

| Nhóm chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Auth/JWT/refresh cookie | Đã có | Login, refresh, logout, profile/me, change password; user inactive bị chặn đăng nhập/refresh |
| Users | Đã có một phần | Admin list/detail/update/deactivate/reactivate/reset-password; chưa có endpoint tạo user generic |
| Students | Đã có API | Admin list/create/import/detail/update/deactivate/reactivate; lecturer list/detail trong phạm vi phân công; student đọc hồ sơ của chính mình |
| Lecturers | Đã có API | Admin list/create/detail/update/deactivate/reactivate; lecturer đọc hồ sơ của chính mình |
| Advisor assignments | Đã có API | Admin CRUD phân công cố vấn |
| Skill categories | Đã có API | Admin CRUD nhóm kỹ năng |
| Skills | Đã có API | Admin CRUD; list cho Admin/Lecturer/Student, non-admin chỉ thấy active skills |
| Career goals | Đã có API | Admin CRUD và required skills; list cho Admin/Lecturer/Student, non-admin chỉ thấy active goals |
| Specializations | Đã có API | Admin CRUD và required skills dưới `/admin/...`; public active list theo career goal |
| Learning resources | Đã có API | Admin CRUD tài nguyên, link/unlink skill; student cập nhật tiến độ resource |
| Recommendation templates | Đã có API | Admin CRUD template và link resource vào template |
| Assessment question bank | Đã có API | Admin CRUD câu hỏi/options; delete là chuyển inactive |
| Student assessment | Đã có API | Start/submit assessment theo career goal/specialization trong profile, có attempt limit/cooldown/time limit |
| Student profile/resources | Đã có API/UI | Profile, specialization, skills, projects, certificates, activities, experiences, avatar và nested evidence upload |
| Evidence review | Đã có API/UI một phần | Student upload; Lecturer/Admin verify/reject; lecturer bị giới hạn theo assignment |
| Competency analysis | Đã có API/UI | Analyze, history, detail, analyze student được phép truy cập |
| Recommendations | Đã có API/UI | Student xem/cập nhật trạng thái, kèm snapshot resources và progress |
| Roadmaps | Đã có API/UI | Sinh roadmap, active roadmap, history, detail, update item status |
| Notifications | Đã có API/UI | Danh sách, unread count, mark read/all read, cron tạo nhắc nhở |
| Advisor reviews | Đã có API | Lecturer tạo review, student/admin/lecturer xem theo quyền; frontend lecturer reviews còn placeholder |
| Dashboard | Đã có API/UI | Student/Lecturer/Admin dashboard |
| Activity logs | Có service nội bộ | Nhiều thao tác ghi log; chưa có controller đọc log |
| Export logs | Có service nội bộ | Có service ghi log export; chưa có API export PDF/Excel hoàn chỉnh |

## 4. Yêu cầu chức năng

### 4.1. Xác thực và phân quyền

Hệ thống cho phép user đăng nhập bằng email/password. Khi đăng nhập thành công, backend trả access token và set refresh token bằng cookie httpOnly ở path `/api/auth`. Frontend lưu access token và tự gọi refresh khi API trả 401.

Backend bảo vệ API bằng JWT mặc định. Endpoint public hiện có:

- `GET /api/health`.
- `POST /api/auth/login`.
- `POST /api/auth/refresh`.
- `GET /api/career-goals/:careerGoalId/specializations`.

Role hiện tại:

- `ADMIN`.
- `LECTURER`.
- `STUDENT`.

User có `status = INACTIVE` không được login, refresh hoặc dùng JWT. Password và reset password yêu cầu ít nhất 8 ký tự, tối đa 128 ký tự, có ít nhất một chữ và một số.

### 4.2. Quản lý user, student và lecturer

Admin quản lý user:

- Xem danh sách user có pagination/search/filter theo role/status/isActive.
- Xem detail user.
- Cập nhật `fullName`, `email`, `phone`; cập nhật `avatarUrl` nếu user là student.
- Deactivate/reactivate user.
- Reset password.

Admin quản lý student:

- Tạo student kèm user account.
- Import danh sách student bằng body `{ records: [...] }` hoặc array trực tiếp; record thiếu password sẽ được sinh temporary password.
- List/search/filter theo class, major, academic year, status/isActive.
- Update thông tin user, student và profile (`careerGoalId`, `specializationId`, summary, GitHub, LinkedIn, portfolio).
- Deactivate/reactivate thông qua status của user.

Admin quản lý lecturer:

- Tạo lecturer kèm user account.
- List/search/filter theo department, status/isActive.
- Update thông tin user và lecturer.
- Deactivate/reactivate thông qua status của user.

Lecturer chỉ xem được student được phân công active. Student chỉ xem được record student của chính mình.

### 4.3. Phân công cố vấn

Admin quản lý `advisor_assignments`:

- Tạo phân công lecturer/student.
- List/search/filter theo lecturer, student, status.
- Xem detail.
- Update status hoặc lecturer/student.
- Delete phân công.

Không được tạo trùng cùng cặp lecturer/student do unique constraint.

### 4.4. Danh mục kỹ năng

Admin quản lý:

- `skill_categories`: tên, mô tả, `roadmapPhase`, status.
- `skills`: category, name, description, `SkillType`, `defaultRequiredLevel`, `defaultWeight`, status.

`SkillType` gồm:

- `COMMON`: kỹ năng nền tảng, có default level/weight dùng khi tạo career goal.
- `CAREER_SPECIFIC`: kỹ năng chuyên ngành/nghề nghiệp, thường được thêm thủ công vào required skills.

Yêu cầu:

- Danh sách có phân trang, search, filter status/type/category.
- Tên category không trùng toàn hệ thống.
- Tên skill không trùng trong cùng category.
- Không xóa skill/category đang bị ràng buộc nếu DB báo foreign key conflict; một số thay đổi catalog sẽ làm analysis/recommendation/roadmap/assessment liên quan trở nên obsolete/cancelled.
- Skill list cho Lecturer/Student chỉ trả skill active.

### 4.5. Career goals, specializations và required skills

Admin quản lý `career_goals`:

- `name`.
- `description`.
- `status`.

Khi tạo career goal, service tự attach tất cả skill `COMMON` đang active vào `career_required_skills` với default level/weight. Nếu chưa có common skill nào, create career goal trả lỗi.

Admin quản lý required skills của career goal và specialization:

- `skillId`.
- `requiredLevel`.
- `weight`.
- `learningOrder`.
- `isRequired`.
- `roadmapPhase`.

Admin quản lý `specializations` dưới prefix `/api/admin/...`:

- List/filter/search specializations.
- List specialization theo career goal.
- Create/update/deactivate specialization.
- CRUD required skills ở scope specialization.

Endpoint public `GET /api/career-goals/:careerGoalId/specializations` trả các specialization active của career goal active.

Khi phân tích/assessment/roadmap có specialization, required skill cấp specialization override required skill cấp career goal nếu trùng skill.

### 4.6. Learning resources và recommendation templates

Admin quản lý `learning_resources`:

- `title`, `description`, `resourceType`, `url`, `provider`, `difficultyLevel`, `estimatedDuration`, `language`, `isFree`, `status`.
- Link resource với skill bằng `targetLevel`, `roadmapPhase`, `relevanceScore`, `orderIndex`.
- Delete resource là deactivate (`status = INACTIVE`).

Admin quản lý `recommendation_templates`:

- Scope optional theo skill, skill category, career goal, specialization, level.
- Nội dung gồm type, title, description, difficulty, duration, URL, priority, roadmap phase, status.
- Link/unlink learning resource vào template.
- Delete template là deactivate (`status = INACTIVE`).

Khi analysis tạo recommendation từ template, hệ thống copy các learning resource active của template sang snapshot `student_recommendation_resources`. Student cập nhật tiến độ resource qua `PATCH /api/learning-resources/:id/progress`.

Trạng thái tiến độ resource:

- `NOT_STARTED -> IN_PROGRESS | SKIPPED`.
- `IN_PROGRESS -> COMPLETED | SKIPPED`.
- `SKIPPED -> IN_PROGRESS`.
- `COMPLETED` không chuyển tiếp.

Nếu tất cả resource của một recommendation đã completed, recommendation được chuyển `DONE` và roadmap item active tương ứng cũng được đánh dấu `DONE`.

### 4.7. Ngân hàng câu hỏi assessment

Admin quản lý `assessment_questions` và `assessment_options`.

Thông tin câu hỏi:

- `skillId`.
- `questionText`.
- `questionType`: `SINGLE_CHOICE`, `TRUE_FALSE`.
- `level`.
- `explanation`.
- `status`: `ACTIVE` hoặc `INACTIVE`.
- `options`: danh sách option có text, `isCorrect`, `orderIndex`.

Quy tắc validate:

- Options không được rỗng.
- `SINGLE_CHOICE` phải có đúng 1 option đúng.
- `TRUE_FALSE` phải có đúng 2 options và đúng 1 option đúng.
- Xóa câu hỏi là soft delete: cập nhật `status = INACTIVE`.
- Câu hỏi bị deactivate sẽ cancel các assessment `IN_PROGRESS` đang dùng câu đó.

### 4.8. Sinh viên làm assessment

Điều kiện:

- User phải là student active.
- Student phải có profile và đã chọn career goal active.
- Nếu có specialization thì specialization phải active và thuộc career goal.
- Career goal/specialization scope phải có required skills active.
- Mỗi required skill phải có câu hỏi active đủ phủ từng level từ 1 đến `requiredLevel`.

Luồng:

1. Student gọi `POST /api/assessments/start`.
2. Hệ thống lấy career goal và specialization từ profile hiện tại, không lấy từ body.
3. Hệ thống kiểm tra không có assessment đang làm còn hạn.
4. Nếu assessment đang làm đã quá hạn, hệ thống chuyển assessment đó sang `CANCELLED`.
5. Hệ thống giới hạn tối đa 3 assessment đã `SUBMITTED` hoặc `GRADED` cho cùng career goal/specialization.
6. Hệ thống áp dụng cooldown 30 phút sau lần submit/cancel gần nhất.
7. Mỗi skill chọn tối đa 6 câu hỏi active, `level <= requiredLevel`; desired count là `min(6, max(requiredLevel * 2, requiredLevel))`.
8. Hệ thống tạo `Assessment` trạng thái `IN_PROGRESS` và `AssessmentQuestionItem`.
9. Response trả `expiresAt`, policy và câu hỏi không kèm đáp án đúng.
10. Student trả lời tất cả câu hỏi trong 60 phút.
11. Student gọi `POST /api/assessments/:id/submit`.
12. Hệ thống kiểm tra bài thuộc student hiện tại, match profile hiện tại, chưa submit, chưa quá hạn, không thiếu/không trùng answer.
13. Hệ thống chấm đúng/sai theo `selectedOption.isCorrect`.
14. Hệ thống tạo `AssessmentAnswer` và `AssessmentSkillResult`.
15. Hệ thống upsert `StudentSkill.currentLevel`, chỉ tăng level nếu kết quả mới cao hơn level hiện có.
16. Assessment chuyển sang `GRADED`.

Quy tắc tính level:

- Mỗi level cần đạt ít nhất 60% số câu đúng.
- `calculatedLevel` bắt đầu từ 0 và tăng liên tiếp qua từng level đạt ngưỡng.
- Nếu level 1 không đạt thì level tính được là 0 dù level cao hơn có câu đúng.

### 4.9. Hồ sơ năng lực sinh viên

Student quản lý profile:

- career goal.
- specialization.
- summary.
- GitHub URL.
- LinkedIn URL.
- portfolio URL.
- avatar upload.

Student quản lý các resource:

- skills.
- projects.
- certificates.
- activities.
- experiences.

Mỗi resource hỗ trợ list/create/get/update/delete cho chính student. Admin và lecturer có endpoint read-only để xem profile/resources theo `studentId`; lecturer vẫn bị giới hạn theo assignment.

### 4.10. Minh chứng

Student có thể upload evidence bằng một trong hai cách:

- Endpoint chung `/api/evidences`.
- Endpoint nested trong profile resource, ví dụ `/api/profiles/me/projects/:id/evidences`.

Evidence phải có file hoặc `evidenceUrl`. Khi tạo:

- Evidence có `status = PENDING`.
- Resource liên quan được tính lại verification status từ các evidence hiện có.

Lecturer/Admin có thể:

- Xem queue pending.
- Verify evidence.
- Reject evidence với reviewer note.

Lecturer chỉ được truy cập/review evidence của student được phân công active trong `advisor_assignments`. Khi verify skill evidence, reviewer có thể gửi `currentLevel`; service cập nhật `StudentSkill`, `verifiedById`, `verifiedAt` tương ứng.

### 4.11. Phân tích năng lực

Student gọi analysis cho chính mình. Lecturer/Admin có thể phân tích cho student nếu có quyền truy cập.

Điều kiện:

- Student có profile.
- Student đã chọn career goal active.
- Nếu profile có specialization thì specialization active và thuộc career goal.
- Scope hiện tại có required skills active.

Dữ liệu đầu vào:

- Required skills của career goal.
- Nếu có specialization, lấy thêm required skills ở specialization scope và cho specialization override career-level khi trùng skill.
- Student skills hiện tại.
- Completion percent tính từ hồ sơ cơ bản, career goal, skills, projects, certificates, activities/experiences và evidence trong scope.

Công thức:

```text
skillScore = min(currentLevel / requiredLevel, 1) * weight
gap = max(requiredLevel - currentLevel, 0)
priorityScore = gap * weight
matchPercent = totalSkillScore / totalWeight * 100
```

Completion percent:

- `+10` nếu có hồ sơ cơ bản (`studentCode` và `major`).
- `+15` nếu có career goal.
- `+20` nếu có ít nhất một student skill.
- `+20` nếu có ít nhất một project.
- `+10` nếu có ít nhất một certificate.
- `+10` nếu có ít nhất một activity hoặc experience.
- Tối đa `+15` từ evidence trong scope: `VERIFIED = 1`, `PENDING = 0.3`, `REJECTED = 0`, lấy tổng có trọng số tối đa 1 rồi nhân 15.

Match level:

- `< 40`: `NOT_MATCHED`.
- `< 70`: `DEVELOPING`.
- `< 85`: `GOOD_MATCH`.
- `>= 85`: `STRONG_MATCH`.

Risk score:

- `+25` nếu completion `< 50`.
- `+25` nếu match `< 40`.
- `+20` nếu mọi skill hiện tại đều `<= 0`.
- Giới hạn tối đa 100.

Skill status:

- `ACHIEVED` nếu `currentLevel >= requiredLevel`.
- `NEED_IMPROVEMENT` nếu `currentLevel > 0` nhưng chưa đạt.
- `MISSING` nếu `currentLevel = 0`.

Mỗi lần analysis mới trong cùng career goal/specialization sẽ chuyển analysis current cũ sang `OBSOLETE`.

### 4.12. Gợi ý phát triển

Sau mỗi analysis, hệ thống tạo recommendation cho skill `MISSING` hoặc `NEED_IMPROVEMENT`.

Nếu `deleteOldNewRecommendations = true` hoặc không truyền giá trị, hệ thống xóa recommendation cũ trạng thái `NEW` của các skill đang cần gợi ý trước khi tạo recommendation mới.

Thứ tự tìm template trong code:

1. `specializationId + careerGoalId + skillId`.
2. `careerGoalId + skillId`.
3. `skillCategoryId + skillId`.
4. `skillId`.
5. Tự sinh default recommendation.

Khi tìm template, hệ thống ưu tiên template active đúng `SkillLevel` suy ra từ `requiredLevel`, sau đó template `level = null`, sau đó template ưu tiên cao/cập nhật mới.

Student có thể cập nhật trạng thái recommendation:

- `NEW -> SAVED | DISMISSED`.
- `SAVED -> IN_PROGRESS | DISMISSED`.
- `IN_PROGRESS -> SAVED | DONE`.
- `DONE`, `DISMISSED`, `OBSOLETE` không được đổi.

Recommendation list chỉ trả recommendation thuộc context career goal/specialization hiện tại, analysis `CURRENT` hoặc template active phù hợp.

Recommendation là dữ liệu trung gian, không có module điều hướng riêng trên giao
diện student. Màn Analysis hiển thị danh sách gọn `Suggested actions` gồm skill,
lý do và số tài nguyên. Student không cần thêm recommendation thủ công vào roadmap.

### 4.13. Lộ trình phát triển cá nhân

Roadmap được sinh từ latest `CURRENT` analysis result theo career goal/specialization hiện tại và recommendations thuộc analysis đó.

Điều kiện:

- Student có profile và career goal active.
- Đã có analysis current.
- Analysis có skill `MISSING` hoặc `NEED_IMPROVEMENT`.
- Có recommendations tương ứng với latest analysis và status thuộc `NEW`, `SAVED`, `IN_PROGRESS`.

Khi sinh roadmap:

- Tính version kế tiếp theo student.
- Archive active roadmap hiện tại nếu `archiveCurrentActiveRoadmap = true`.
- Nếu không archive mà đã có active roadmap, trả lỗi.
- Trong bước `Review suggestions`, các recommendation bỏ chọn được truyền bằng
  `excludedRecommendationIds` và chuyển sang `DISMISSED`.
- Tạo `DevelopmentRoadmap`.
- Tạo `RoadmapItem` từ best recommendation theo skill.

Việc exclude, archive roadmap active và tạo roadmap version mới được thực hiện
trong cùng transaction. Roadmap là snapshot theo version nên các version đã sinh
không bị sửa item khi recommendation thay đổi. Khi roadmap item hoàn thành,
recommendation liên kết được đồng bộ sang `DONE`.

Sắp xếp item:

1. `RoadmapPhase`.
2. `learningOrder`.
3. `priorityScore` giảm dần.
4. template priority giảm dần.
5. tên skill.

Status transition của roadmap item:

- `TODO -> IN_PROGRESS | CANCELLED`.
- `IN_PROGRESS -> TODO | DONE | CANCELLED`.
- `DONE -> IN_PROGRESS` và bắt buộc có note.
- `CANCELLED` không đổi.

Progress:

```text
progressPercent = doneItemWeight / totalNonCancelledItemWeight * 100
```

Nếu progress đạt 100%, roadmap chuyển `COMPLETED`. Khi item chuyển `DONE`, recommendation liên quan được chuyển `DONE` nếu còn ở trạng thái actionable.

### 4.14. Thông báo

User xem notifications của mình, unread count, mark read và mark all read.

Scheduler tạo notification:

- 08:00 hằng ngày: nhắc profile không cập nhật quá 30 ngày.
- 08:30 hằng ngày: nhắc profile chưa chọn career goal.
- Mỗi giờ: báo evidence bị reject.
- 09:00 hằng ngày: nhắc roadmap item quá hạn.
- 09:30 hằng ngày: cảnh báo profile yếu.

Notification có cơ chế dedup theo khoảng giờ để tránh spam.

### 4.15. Advisor reviews

Lecturer có thể tạo review cho student được phân công active:

- `reviewContent`.
- `suggestion`.
- `rating` từ 1 đến 5.

Khi tạo review, student nhận notification `ADVISOR_REVIEW`. Student xem review của mình; Admin xem toàn bộ; Lecturer/Admin/Student xem review theo student/detail nếu có quyền truy cập student.

### 4.16. Dashboard

Student dashboard hiển thị:

- completion percent.
- match percent.
- career goal.
- missing skills từ latest analysis.
- roadmap progress.

Lecturer dashboard hiển thị:

- số student được phân công active.
- số weak students.
- số pending evidence.

Admin dashboard hiển thị:

- tổng student.
- tổng lecturer.
- top missing skills.
- top career goals.

### 4.17. Activity log và export log

Code hiện có global service ghi `ActivityLog` cho các thao tác như login, create/update user/student/lecturer, learning resource, recommendation template, evidence review, advisor review, competency analysis, roadmap. Nếu ghi log lỗi, service chỉ warn và không làm fail request chính.

Code cũng có `ExportLogsService` để ghi `ExportLog`, nhưng chưa có controller export PDF/Excel hoàn chỉnh.

## 5. API thực tế

Tất cả API có prefix `/api`.

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

### Catalog, career goals, specializations

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

GET    /career-goals
POST   /career-goals
GET    /career-goals/:id
PATCH  /career-goals/:id
DELETE /career-goals/:id
GET    /career-goals/:careerGoalId/required-skills
POST   /career-goals/:careerGoalId/required-skills
PATCH  /career-goals/:careerGoalId/required-skills/:requiredSkillId
DELETE /career-goals/:careerGoalId/required-skills/:requiredSkillId

GET    /career-goals/:careerGoalId/specializations

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

### Learning resources and recommendation templates

```text
GET    /learning-resources
POST   /learning-resources
GET    /learning-resources/:id
PATCH  /learning-resources/:id
DELETE /learning-resources/:id
PATCH  /learning-resources/:id/progress
POST   /learning-resources/:id/skills
PATCH  /learning-resources/:id/skills/:skillId
DELETE /learning-resources/:id/skills/:skillId

GET    /recommendation-templates
POST   /recommendation-templates
GET    /recommendation-templates/:id
PATCH  /recommendation-templates/:id
DELETE /recommendation-templates/:id
GET    /recommendation-templates/:id/resources
POST   /recommendation-templates/:id/resources
DELETE /recommendation-templates/:id/resources/:resourceId
```

### Advisor assignments and reviews

```text
GET    /advisor-assignments
POST   /advisor-assignments
GET    /advisor-assignments/:id
PATCH  /advisor-assignments/:id
DELETE /advisor-assignments/:id

POST /advisor-reviews/students/:studentId
GET  /advisor-reviews/me
GET  /advisor-reviews
GET  /advisor-reviews/students/:studentId
GET  /advisor-reviews/:id
```

### Assessment

```text
GET    /assessment-questions
POST   /assessment-questions
GET    /assessment-questions/:id
PATCH  /assessment-questions/:id
DELETE /assessment-questions/:id

POST /assessments/start
POST /assessments/:id/submit
```

### Profiles

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

### Evidences, analysis, recommendations, roadmaps

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

### Notifications, uploads and dashboard

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

## 6. Giao diện hiện tại

### Admin

- `/admin/dashboard`: dashboard hệ thống.
- `/admin/skill-categories`: quản lý nhóm skill.
- `/admin/skills`: quản lý skill.
- `/admin/career-goals`: quản lý career goal, specializations và required skills.
- `/admin/assessment-questions`: quản lý question bank.
- `/admin/users`, `/admin/students`, `/admin/lecturers`, `/admin/advisor-assignments`, `/admin/reports`: route có trong menu nhưng hiện là placeholder UI.

### Lecturer

- `/lecturer/dashboard`: dashboard giảng viên.
- `/lecturer/evidences`: duyệt evidence pending.
- `/lecturer/students`, `/lecturer/reviews`, `/lecturer/reports`: placeholder UI.

### Student

- `/student/dashboard`.
- `/student/profile`.
- `/student/skills`.
- `/student/projects`.
- `/student/certificates`.
- `/student/activities`.
- `/student/experiences`.
- `/student/evidences`.
- `/student/assessment`.
- `/student/analysis`: kết quả phân tích và `Suggested actions`.
- `/student/recommendations`: route tương thích cũ, redirect sang `/student/analysis`
  và không xuất hiện trong menu.
- `/student/roadmap`: review suggestions, generate và theo dõi roadmap.
- `/student/notifications`.
- `/student/portfolio`: placeholder UI.

## 7. Yêu cầu phi chức năng

### Bảo mật

- Password hash bằng bcrypt.
- Refresh token lưu hash trong database.
- Refresh token cookie httpOnly.
- Access token gửi qua Authorization header.
- DTO validation dùng whitelist và forbid non-whitelisted.
- User inactive bị chặn bởi auth service/JWT validation.
- Lecturer access phải giới hạn theo `advisor_assignments`.
- Private profile uploads được phục vụ qua `/api/uploads/profiles/:filename` và vẫn đi qua JWT.

### Hiệu năng

- Danh sách dùng offset pagination.
- Prisma schema có index theo các field filter/sort chính.
- Dashboard admin dùng aggregate/groupBy cho top missing skills và top career goals.
- Notification scheduler xử lý theo batch size 100.

### Khả năng mở rộng

- Module được tách theo domain.
- Catalog invalidation đã có service riêng để stale analysis/recommendation/roadmap/assessment khi thay đổi career context.
- Recommendation template và learning resource đã có schema/API, có thể mở rộng UI admin.
- Export log đã có service nội bộ để gắn với API export sau này.

## 8. Ghi chú gap cần xử lý tiếp

- Frontend admin cho users/students/lecturers/advisor assignments/reports vẫn là placeholder dù backend đã có nhiều API.
- Frontend lecturer reviews/students/reports vẫn là placeholder dù backend đã có advisor reviews và student access API.
- Chưa có controller đọc `ActivityLog`.
- Chưa có API export portfolio/report PDF/Excel hoàn chỉnh, dù có `ExportLogsService`.
- Frontend domain type còn một số giá trị legacy như `VERIFIED_WITH_PENDING_CHANGES` không tồn tại trong Prisma enum hiện tại; khi làm UI nên đồng bộ lại theo backend.
