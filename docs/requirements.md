# PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## Tên đề tài

**Student Digital Competency Profile & Personal Development Roadmap**

Tài liệu này mô tả yêu cầu chức năng theo code hiện tại của dự án. Những phần chưa có API/UI hoàn chỉnh được ghi rõ là chưa triển khai, tránh nhầm với chức năng đã hoàn thành.

## 1. Tổng quan

Hệ thống hỗ trợ sinh viên xây dựng hồ sơ năng lực số, làm bài đánh giá kỹ năng, nhận phân tích mức độ phù hợp với mục tiêu nghề nghiệp, nhận gợi ý phát triển và theo dõi lộ trình cá nhân. Admin cấu hình danh mục nền tảng; giảng viên/cố vấn theo dõi sinh viên được phân công và duyệt minh chứng.

## 2. Đối tượng sử dụng

| Tác nhân | Vai trò trong hệ thống |
|---|---|
| Admin | Quản lý catalog, career goals, required skills, question bank, advisor assignments, dashboard hệ thống |
| Lecturer | Xem dashboard giảng viên, duyệt minh chứng của sinh viên được phân công |
| Student | Quản lý hồ sơ năng lực, làm assessment, xem analysis/recommendations/roadmap/notifications |

## 3. Trạng thái triển khai hiện tại

| Nhóm chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Auth/JWT/refresh cookie | Đã có | Login, refresh, logout, profile/me, change password |
| Users | Một phần | Chỉ `GET /users`, `GET /users/me`; chưa có CRUD |
| Students/Lecturers CRUD | Chưa có API | Module/controller shell tồn tại |
| Skill categories/skills | Đã có | CRUD, search, filter, pagination |
| Career goals/required skills | Đã có | CRUD career goal, CRUD required skills |
| Assessment question bank | Đã có | Admin quản lý câu hỏi và options |
| Student assessment | Đã có | Start/submit assessment, chấm điểm và cập nhật student skills |
| Student profile/resources | Đã có | Profile, skills, projects, certificates, activities, experiences, evidence upload |
| Evidence review | Đã có | Student upload; Lecturer/Admin verify/reject |
| Competency analysis | Đã có | Analyze, history, detail, analyze specific student |
| Recommendations | Đã có | Student xem và cập nhật trạng thái |
| Roadmaps | Đã có API | Sinh roadmap, history, detail, update item |
| Notifications | Đã có | Danh sách, unread count, mark read/all read, cron tạo nhắc nhở |
| Dashboard | Đã có | Student/Lecturer/Admin dashboard |
| Specializations CRUD | Chưa có API/UI | Model có trong Prisma và được analysis/roadmap đọc nếu có dữ liệu |
| Recommendation templates CRUD | Chưa có API/UI | Model có trong Prisma, analysis service dùng để fallback |
| Advisor reviews API | Chưa có | Model có trong Prisma |
| Export PDF/Excel API | Chưa có | `ExportLog` có trong Prisma |
| Activity logs API | Chưa có | `ActivityLog` có trong Prisma |

## 4. Yêu cầu chức năng

### 4.1. Xác thực và phân quyền

Hệ thống phải cho phép user đăng nhập bằng email/password. Khi đăng nhập thành công, backend trả access token và set refresh token bằng cookie httpOnly. Frontend lưu access token và tự gọi refresh khi API trả 401.

Backend phải bảo vệ API bằng JWT theo mặc định. Endpoint public hiện có:

- `GET /api/health`.
- `POST /api/auth/login`.
- `POST /api/auth/refresh`.

Role hiện tại:

- `ADMIN`.
- `LECTURER`.
- `STUDENT`.

### 4.2. Quản lý user

Code hiện tại hỗ trợ:

- User hiện tại xem thông tin qua `/api/users/me`.
- Admin xem danh sách user qua `/api/users`.
- Auth profile trả kèm thông tin student hoặc lecturer nếu user có bản ghi tương ứng.

Chưa có API tạo/sửa/xóa user.

### 4.3. Danh mục kỹ năng

Admin quản lý:

- `skill_categories`: tên, mô tả, `roadmapPhase`, status.
- `skills`: category, name, description, `SkillType`, `defaultRequiredLevel`, `defaultWeight`, status.

`SkillType` gồm:

- `COMMON`: kỹ năng nền tảng, có default level/weight dùng khi tạo career goal.
- `CAREER_SPECIFIC`: kỹ năng chuyên ngành/nghề nghiệp, được chọn vào required skills.

Yêu cầu:

- Danh sách phải có phân trang, search, filter status/type/category.
- Tên skill không trùng trong cùng category.
- Không xóa skill/category đang bị ràng buộc nếu DB báo foreign key conflict.
- Skill detail cần trả `_count.assessmentQuestions`, `_count.careerRequiredSkills`, `_count.studentSkills`, `_count.recommendationTemplates`.

### 4.4. Mục tiêu nghề nghiệp và required skills

Admin quản lý `career_goals`:

- name.
- description.
- status.

Khi tạo career goal, service tự attach tất cả skill `COMMON` đang có vào `career_required_skills` với default level/weight. Nếu chưa có common skill nào, create career goal trả lỗi.

Admin quản lý required skills của career goal:

- `skillId`.
- `requiredLevel` từ 1 đến 3.
- `weight`.
- `learningOrder`.
- `isRequired`.

UI hiện chỉ chọn skill `CAREER_SPECIFIC` để thêm thủ công vào required skills. Common skills được tự thêm lúc tạo career goal.

### 4.5. Ngân hàng câu hỏi assessment

Admin quản lý `assessment_questions` và `assessment_options`.

Thông tin câu hỏi:

- `skillId`.
- `questionText`.
- `questionType`: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`.
- `level`.
- `explanation`.
- `status`: `ACTIVE` hoặc `INACTIVE`.
- `options`: danh sách option có text, `isCorrect`, `orderIndex`.

Quy tắc validate:

- Options không được rỗng.
- `SINGLE_CHOICE` phải có đúng 1 option đúng.
- `TRUE_FALSE` phải có đúng 2 options và đúng 1 option đúng.
- `MULTIPLE_CHOICE` phải có ít nhất 1 option đúng.

Xóa câu hỏi là soft delete theo nghiệp vụ: cập nhật `status = INACTIVE`.

### 4.6. Sinh viên làm assessment

Điều kiện:

- User phải là student.
- Student phải có profile và chọn career goal.
- Career goal phải có required skills.
- Required skills phải có câu hỏi `ACTIVE` phù hợp.

Luồng:

1. Student gọi `POST /api/assessments/start` với `careerGoalId`.
2. Hệ thống lấy required skills `isRequired = true` của career goal.
3. Mỗi skill chọn tối đa 6 câu hỏi active, có `level <= requiredLevel`.
4. Hệ thống tạo `Assessment` trạng thái `IN_PROGRESS` và `AssessmentQuestionItem`.
5. Student trả lời tất cả câu hỏi.
6. Student gọi `POST /api/assessments/:id/submit`.
7. Hệ thống kiểm tra bài thuộc về student hiện tại, chưa submit, không thiếu/không trùng answer.
8. Hệ thống chấm đúng/sai theo `selectedOption.isCorrect`.
9. Hệ thống tạo `AssessmentAnswer` và `AssessmentSkillResult`.
10. Hệ thống upsert `StudentSkill.currentLevel` theo level tính được.
11. Assessment chuyển sang `GRADED`.

Quy tắc tính level:

- Mỗi level cần đạt ít nhất 60% số câu đúng.
- `calculatedLevel` bắt đầu từ 0 và tăng liên tiếp qua từng level đạt ngưỡng.
- Nếu level 1 không đạt thì level tính được là 0 dù level cao hơn có câu đúng.

### 4.7. Hồ sơ năng lực sinh viên

Student quản lý profile:

- career goal.
- summary.
- GitHub URL.
- LinkedIn URL.
- portfolio URL.
- avatar upload.

Code hiện chưa cho chọn `specializationId` qua DTO/UI, dù database có trường này.

Student quản lý các resource:

- skills.
- projects.
- certificates.
- activities.
- experiences.

Mỗi resource hỗ trợ list/create/get/update/delete cho chính student. Admin và lecturer có endpoint read-only để xem profile/resources theo `studentId`.

### 4.8. Minh chứng

Student có thể upload evidence bằng một trong hai cách:

- Endpoint chung `/api/evidences`.
- Endpoint nested trong profile resource, ví dụ `/api/profiles/me/projects/:id/evidences`.

Evidence phải có file hoặc `evidenceUrl`. Khi tạo:

- Evidence có `status = PENDING`.
- Resource liên quan chuyển sang trạng thái verification `PENDING`.

Lecturer/Admin có thể:

- Xem queue pending.
- Verify evidence.
- Reject evidence với reviewer note.

Lecturer chỉ được truy cập/review evidence của student được phân công active trong `advisor_assignments`.

### 4.9. Phân tích năng lực

Student gọi analysis cho chính mình. Lecturer/Admin có thể phân tích cho student nếu có quyền truy cập.

Điều kiện:

- Student có profile.
- Student đã chọn career goal.
- Career goal có required skills.
- Nếu profile có specialization thì specialization phải thuộc career goal.

Dữ liệu đầu vào:

- Required skills của career goal.
- Nếu có specialization, lấy thêm required skills ở specialization scope và cho specialization override career-level khi trùng skill.
- Student skills hiện tại.
- Completion percent tính từ dữ liệu profile/resources/evidence.

Công thức:

```text
skillScore = min(currentLevel / requiredLevel, 1) * weight
gap = max(requiredLevel - currentLevel, 0)
priorityScore = gap * weight
matchPercent = totalSkillScore / totalWeight * 100
```

Match level:

- `< 40`: `NOT_MATCHED`.
- `< 70`: `DEVELOPING`.
- `< 85`: `GOOD_MATCH`.
- `>= 85`: `STRONG_MATCH`.

Skill status:

- `ACHIEVED` nếu `currentLevel >= requiredLevel`.
- `NEED_IMPROVEMENT` nếu `currentLevel > 0` nhưng chưa đạt.
- `MISSING` nếu `currentLevel = 0`.

### 4.10. Gợi ý phát triển

Sau mỗi analysis, hệ thống tạo recommendation cho skill `MISSING` hoặc `NEED_IMPROVEMENT`.

Nếu `deleteOldNewRecommendations = true`, hệ thống xóa recommendation cũ trạng thái `NEW` của các skill đang cần gợi ý trước khi tạo recommendation mới.

Thứ tự tìm template trong code:

1. `specializationId + careerGoalId + skillId`.
2. `careerGoalId + skillId`.
3. `skillCategoryId + skillId`.
4. `skillId`.
5. Tự sinh default recommendation.

Nếu tìm thấy template:

- title/description/type lấy từ template.
- roadmap phase lấy từ template nếu có, nếu không lấy từ required skill.

Nếu không có template:

- Hệ thống tạo recommendation default dạng "Improve {skillName}".

Student có thể cập nhật trạng thái recommendation:

- `NEW`.
- `SAVED`.
- `IN_PROGRESS`.
- `DONE`.
- `DISMISSED`.

### 4.11. Lộ trình phát triển cá nhân

Roadmap được sinh từ latest analysis result theo career goal/specialization hiện tại và recommendations thuộc analysis đó.

Điều kiện:

- Student có profile và career goal.
- Đã có analysis result.
- Analysis có skill `MISSING` hoặc `NEED_IMPROVEMENT`.
- Có recommendations tương ứng với latest analysis.

Khi sinh roadmap:

- Tính version kế tiếp theo student.
- Archive active roadmap hiện tại nếu `archiveCurrentActiveRoadmap = true`.
- Tạo `DevelopmentRoadmap`.
- Tạo `RoadmapItem` từ best recommendation theo skill.

Sắp xếp item:

1. `RoadmapPhase`.
2. `learningOrder`.
3. `priorityScore` giảm dần.
4. template priority giảm dần.
5. tên skill.

Progress:

```text
progressPercent = doneItemWeight / totalNonCancelledItemWeight * 100
```

Nếu progress đạt 100%, roadmap chuyển `COMPLETED`.

### 4.12. Thông báo

User xem notifications của mình, unread count, mark read và mark all read.

Scheduler hiện tạo notification:

- Nhắc profile không cập nhật quá 30 ngày.
- Nhắc profile chưa chọn career goal.
- Báo evidence bị reject.
- Nhắc roadmap item quá hạn.
- Cảnh báo profile yếu.

Notification có cơ chế dedup theo khoảng giờ để tránh spam.

### 4.13. Dashboard

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

## 5. API thực tế

Tất cả API có prefix `/api`.

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

### Notifications and dashboard

```text
GET   /notifications/me
GET   /notifications/me/unread-count
PATCH /notifications/:id/read
PATCH /notifications/read-all

GET /dashboard/student
GET /dashboard/lecturer
GET /dashboard/admin
```

## 6. Giao diện hiện tại

### Admin

- `/admin/dashboard`: dashboard hệ thống.
- `/admin/skill-categories`: quản lý nhóm skill.
- `/admin/skills`: quản lý skill.
- `/admin/career-goals`: quản lý career goal và required skills drawer.
- `/admin/assessment-questions`: quản lý question bank.
- `/admin/advisor-assignments`: route có trong menu; cần kiểm tra UI chi tiết khi phát triển tiếp.
- `/admin/users`, `/admin/students`, `/admin/lecturers`, `/admin/reports`: placeholder.

### Lecturer

- `/lecturer/dashboard`: dashboard giảng viên.
- `/lecturer/evidences`: duyệt evidence pending.
- `/lecturer/students`, `/lecturer/reviews`, `/lecturer/reports`: placeholder.

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
- `/student/analysis`.
- `/student/recommendations`.
- `/student/roadmap`.
- `/student/notifications`.
- `/student/portfolio`: route có trong menu; cần kiểm tra/hoàn thiện UI export portfolio khi có API.

## 7. Yêu cầu phi chức năng

### Bảo mật

- Password hash bằng bcrypt.
- Refresh token lưu hash trong database.
- Refresh token cookie httpOnly.
- Access token gửi qua Authorization header.
- DTO validation dùng whitelist và forbid non-whitelisted.
- Lecturer access phải giới hạn theo `advisor_assignments`.

### Hiệu năng

- Danh sách dùng pagination.
- Prisma schema có index theo các field filter/sort chính.
- Dashboard admin dùng aggregate/groupBy cho top missing skills và top career goals.

### Khả năng mở rộng

- Module được tách theo domain.
- Recommendation template đã có schema và service lookup, có thể bổ sung controller/UI sau.
- Specialization đã có schema và được analysis/roadmap đọc, có thể bổ sung quản trị sau.

## 8. Ghi chú gap cần xử lý tiếp

- Thêm CRUD user/student/lecturer nếu cần quản trị dữ liệu đầu vào đầy đủ.
- Thêm UI/API specialization nếu muốn dùng track chuyên sâu.
- Thêm UI/API recommendation templates để admin cấu hình gợi ý thay vì phụ thuộc default generated recommendation.
- Thêm advisor reviews API/UI nếu muốn lecturer ghi nhận xét.
- Thêm export portfolio/report API nếu cần PDF/Excel.
- Đồng bộ frontend roadmap với backend: backend `GET /roadmaps/me` trả object/null, không phải paginated list.
- Đồng bộ quyền đọc catalog: frontend student cần đọc `skills` và `career-goals`, trong khi backend hiện khóa các endpoint này theo `ADMIN`.
- Bổ sung test scripts tự động cho backend/frontend.
