# PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## Đề tài

**Xây dựng hệ thống hồ sơ năng lực số và gợi ý lộ trình phát triển cá nhân cho sinh viên**

## Thông tin tài liệu

| Thuộc tính | Nội dung |
| --- | --- |
| Tên hệ thống | Student Digital Competency Profile & Personal Development Roadmap |
| Phạm vi | Hồ sơ năng lực số, phân tích năng lực, gợi ý và theo dõi lộ trình phát triển cá nhân |
| Đối tượng đọc | Giảng viên hướng dẫn, hội đồng, nhóm phát triển, người vận hành |
| Nền tảng hiện tại | Next.js, NestJS, Prisma, PostgreSQL |
| Tài liệu tham chiếu | `docs/requirements.md`, `docs/architecture.md`, `docs/database-design.md`, `backend/prisma/schema.prisma` |
| Ngày cập nhật | 06/06/2026 |

---

# 1. Giới Thiệu

## 1.1. Mục Đích

Tài liệu này mô tả đầy đủ quá trình phân tích và thiết kế hệ thống **Student Digital Competency Profile & Personal Development Roadmap**. Nội dung được xây dựng để sử dụng trong báo cáo đồ án, tài liệu thiết kế kỹ thuật, tài liệu bàn giao và làm căn cứ cho phát triển, kiểm thử, triển khai, vận hành hệ thống.

Tài liệu trả lời các câu hỏi chính:

- Hệ thống giải quyết bài toán gì?
- Các tác nhân sử dụng hệ thống là ai?
- Hệ thống cần đáp ứng những yêu cầu chức năng và phi chức năng nào?
- Dữ liệu được tổ chức, liên kết và bảo vệ ra sao?
- Frontend, backend và database phối hợp như thế nào?
- Thuật toán phân tích năng lực, gợi ý và sinh lộ trình hoạt động ra sao?
- Cần kiểm thử và triển khai hệ thống như thế nào để đảm bảo chất lượng?

## 1.2. Phạm Vi Tài Liệu

Tài liệu bao gồm:

- Tổng quan đề tài và bối cảnh nghiệp vụ.
- Khảo sát hiện trạng, vấn đề tồn tại và nhu cầu cải tiến.
- Phân tích tác nhân, phân quyền và yêu cầu hệ thống.
- Quy tắc nghiệp vụ, quy trình xử lý và use case.
- Thiết kế kiến trúc, module, API và giao diện.
- Thiết kế cơ sở dữ liệu, quan hệ bảng, ràng buộc và index.
- Thiết kế thuật toán rule-based cho phân tích năng lực, gợi ý và roadmap.
- Yêu cầu bảo mật, kiểm thử, triển khai, vận hành và hướng phát triển.

## 1.3. Phạm Vi Hệ Thống

Hệ thống được xây dựng cho môi trường khoa/trường đại học, tập trung vào quản lý hồ sơ năng lực thực tế của sinh viên. Hệ thống giúp sinh viên tự xây dựng hồ sơ năng lực, giúp giảng viên/cố vấn theo dõi quá trình phát triển của sinh viên và giúp nhà trường có dữ liệu để đánh giá năng lực đầu ra.

Các nhóm chức năng chính:

- Xác thực, quản lý phiên đăng nhập và phân quyền theo vai trò.
- Quản lý tài khoản, sinh viên, giảng viên/cố vấn.
- Quản lý nhóm kỹ năng, kỹ năng, chuyên ngành/domain, mục tiêu nghề nghiệp và bộ kỹ năng yêu cầu.
- Quản lý hồ sơ năng lực sinh viên.
- Quản lý kỹ năng, dự án, chứng chỉ, hoạt động, kinh nghiệm và minh chứng.
- Duyệt, xác nhận, từ chối minh chứng.
- Phân tích năng lực theo mục tiêu nghề nghiệp.
- Xác định kỹ năng còn thiếu và điểm ưu tiên cải thiện.
- Sinh gợi ý học tập, thực hành, dự án, chứng chỉ, tài liệu theo chuyên ngành và mục tiêu nghề nghiệp.
- Sinh và theo dõi lộ trình phát triển cá nhân.
- Gửi thông báo nhắc nhở và cảnh báo hồ sơ yếu.
- Dashboard thống kê theo vai trò.
- Xuất portfolio PDF và báo cáo Excel theo định hướng mở rộng.

Ngoài phạm vi:

- Quản lý điểm số học phần.
- Đăng ký học phần.
- Quản lý học phí.
- Quản lý thời khóa biểu toàn trường.
- Tuyển dụng trực tiếp giữa doanh nghiệp và sinh viên.
- Hệ thống machine learning phức tạp.

## 1.4. Thuật Ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Hồ sơ năng lực số | Bộ dữ liệu tập trung mô tả kỹ năng, dự án, chứng chỉ, hoạt động, kinh nghiệm và minh chứng của sinh viên |
| Mục tiêu nghề nghiệp | Vai trò nghề nghiệp sinh viên muốn hướng tới, ví dụ Front-end Developer, Back-end Developer, Data Analyst |
| Chuyên ngành/domain | Nhánh định hướng trong ngành CNTT, ví dụ Software Engineering, Data Science, Cybersecurity, AI, Cloud/DevOps |
| Kỹ năng yêu cầu | Kỹ năng và mức độ tối thiểu cần có để đạt một mục tiêu nghề nghiệp |
| Minh chứng | File hoặc đường dẫn dùng để chứng minh kỹ năng, dự án, chứng chỉ, hoạt động hoặc kinh nghiệm |
| Completion percent | Tỷ lệ hoàn thiện hồ sơ năng lực |
| Match percent | Tỷ lệ phù hợp giữa năng lực hiện tại và mục tiêu nghề nghiệp |
| Risk score | Điểm rủi ro của hồ sơ, dùng để cảnh báo sinh viên cần cải thiện |
| Recommendation | Gợi ý học tập, thực hành, dự án, chứng chỉ hoặc tài liệu |
| Roadmap | Lộ trình phát triển gồm các nhiệm vụ có thứ tự, trọng số và trạng thái |

---

# 2. Khảo Sát Hiện Trạng

## 2.1. Hiện Trạng

Trong nhiều môi trường đại học, sinh viên chủ yếu được quản lý qua thông tin hành chính, lớp học, điểm số và học phần. Các dữ liệu này cần thiết nhưng chưa phản ánh đầy đủ năng lực thực tế của sinh viên, đặc biệt là:

- Kỹ năng chuyên môn.
- Kỹ năng mềm.
- Dự án cá nhân hoặc dự án nhóm.
- Chứng chỉ đã đạt được.
- Kinh nghiệm thực tập, làm việc, freelance.
- Hoạt động ngoại khóa, câu lạc bộ, cuộc thi.
- Minh chứng như file, link GitHub, link demo, link chứng chỉ.

Các thông tin trên thường nằm rải rác ở nhiều nơi như CV cá nhân, GitHub, Google Drive, file báo cáo, email hoặc trao đổi riêng với giảng viên. Vì vậy, sinh viên khó tự đánh giá năng lực của mình, giảng viên/cố vấn khó theo dõi tiến bộ của từng sinh viên, còn khoa/trường khó thống kê năng lực đầu ra theo lớp, ngành hoặc khóa.

## 2.2. Vấn Đề Tồn Tại

| Vấn đề | Ảnh hưởng |
| --- | --- |
| Thông tin năng lực bị phân tán | Khó tổng hợp và đánh giá toàn diện |
| Sinh viên tự khai kỹ năng nhưng thiếu minh chứng | Độ tin cậy của hồ sơ không cao |
| Chưa có bộ tiêu chí theo mục tiêu nghề nghiệp | Sinh viên không biết cần học gì tiếp theo |
| Cố vấn khó theo dõi từng sinh viên | Khó cảnh báo sớm sinh viên có hồ sơ yếu |
| Báo cáo thủ công | Tốn thời gian và dễ sai sót |
| Thiếu lộ trình cá nhân hóa | Sinh viên phát triển theo cảm tính, thiếu thứ tự ưu tiên |

## 2.3. Nhu Cầu Cải Tiến

Hệ thống cần cung cấp một nền tảng tập trung để:

- Sinh viên chủ động xây dựng và cập nhật hồ sơ năng lực.
- Giảng viên/cố vấn xem, nhận xét và xác nhận minh chứng.
- Admin quản lý dữ liệu nền tảng và tiêu chí đánh giá.
- Hệ thống tự động phân tích độ phù hợp giữa năng lực hiện tại và mục tiêu nghề nghiệp.
- Hệ thống chỉ ra kỹ năng còn thiếu, mức thiếu hụt và mức độ ưu tiên.
- Hệ thống gợi ý nội dung học tập, dự án, chứng chỉ, tài liệu.
- Hệ thống sinh roadmap giúp sinh viên biết nên làm gì trước, làm gì sau.
- Các bên liên quan có dashboard, báo cáo và cảnh báo phù hợp.

## 2.4. Bên Liên Quan

| Bên liên quan | Mối quan tâm |
| --- | --- |
| Sinh viên | Biết năng lực hiện tại, biết kỹ năng còn thiếu, có lộ trình phát triển rõ ràng |
| Giảng viên/cố vấn | Theo dõi sinh viên phụ trách, xác nhận minh chứng, hỗ trợ sinh viên cần cải thiện |
| Admin/cán bộ khoa | Quản lý danh mục, người dùng, phân công cố vấn, thống kê toàn hệ thống |
| Khoa/trường | Có dữ liệu đánh giá chất lượng đào tạo và năng lực đầu ra |
| Hội đồng đánh giá | Cần tài liệu rõ ràng về phạm vi, thiết kế, thuật toán, dữ liệu và tính khả thi |

## 2.5. Ràng Buộc

- Hệ thống phù hợp với quy mô đồ án và vận hành nội bộ khoa/trường.
- Chưa cần microservices, ưu tiên kiến trúc dễ triển khai và dễ bảo trì.
- Gợi ý phát triển dùng rule-based recommendation để dễ giải thích kết quả.
- Không bắt buộc nhập đầy đủ toàn bộ domain CNTT ngay từ đầu; hệ thống hỗ trợ template theo nhiều mức cụ thể và cơ chế fallback.
- Dữ liệu cá nhân của sinh viên phải được bảo vệ.
- Người dùng chỉ được thao tác trong phạm vi vai trò và quyền truy cập của mình.

---

# 3. Tổng Quan Hệ Thống

## 3.1. Mô Tả Tổng Quát

Hệ thống là ứng dụng web gồm frontend, backend và cơ sở dữ liệu. Người dùng đăng nhập bằng tài khoản có vai trò `ADMIN`, `LECTURER` hoặc `STUDENT`. Sau khi đăng nhập, người dùng được điều hướng đến khu vực chức năng tương ứng.

Sinh viên cập nhật hồ sơ năng lực, thêm kỹ năng, dự án, chứng chỉ, hoạt động, kinh nghiệm và upload minh chứng. Giảng viên/cố vấn xem hồ sơ sinh viên phụ trách, duyệt minh chứng và theo dõi cảnh báo. Admin quản lý dữ liệu nền tảng như kỹ năng, mục tiêu nghề nghiệp, kỹ năng yêu cầu và phân công cố vấn.

Backend phân tích năng lực bằng engine rule-based. Kết quả phân tích được lưu lại, dùng để sinh recommendation, roadmap và dashboard.

## 3.2. Sơ Đồ Context

```mermaid
flowchart LR
    Student["Sinh viên"] --> Web["Ứng dụng web"]
    Lecturer["Giảng viên / Cố vấn"] --> Web
    Admin["Admin / Cán bộ khoa"] --> Web

    Web --> API["REST API NestJS"]
    API --> DB[("PostgreSQL")]
    API --> Storage["Lưu trữ file minh chứng"]
    API --> Scheduler["Notification scheduler"]
    API --> Swagger["Swagger API docs"]

    Scheduler --> DB
```

## 3.3. Kiến Trúc Mức Cao

```mermaid
flowchart TB
    subgraph Frontend["Frontend: Next.js + TypeScript + Ant Design"]
        Pages["App Router pages"]
        Features["Feature components"]
        Hooks["Auth hooks / React Query"]
        ApiClient["Axios API client"]
    end

    subgraph Backend["Backend: NestJS + Prisma"]
        Auth["Auth"]
        Catalog["Skill / Career catalog"]
        Profile["Profiles / Evidences"]
        Analysis["Competency analysis"]
        Roadmap["Recommendations / Roadmaps"]
        Dashboard["Dashboard / Notifications"]
        Common["Guards / Filters / Interceptors / Validation"]
    end

    subgraph Data["Data layer"]
        Prisma["Prisma ORM"]
        PostgreSQL[("PostgreSQL")]
    end

    Pages --> Features --> Hooks --> ApiClient
    ApiClient --> Auth
    ApiClient --> Catalog
    ApiClient --> Profile
    ApiClient --> Analysis
    ApiClient --> Roadmap
    ApiClient --> Dashboard
    Auth --> Prisma
    Catalog --> Prisma
    Profile --> Prisma
    Analysis --> Prisma
    Roadmap --> Prisma
    Dashboard --> Prisma
    Prisma --> PostgreSQL
```

---

# 4. Tác Nhân Và Phân Quyền

## 4.1. Tác Nhân

| Tác nhân | Vai trò trong hệ thống |
| --- | --- |
| Admin | Quản trị người dùng, danh mục, mục tiêu nghề nghiệp, phân công cố vấn, báo cáo |
| Giảng viên/cố vấn | Theo dõi sinh viên được phân công, xem hồ sơ, duyệt minh chứng, xem phân tích và roadmap |
| Sinh viên | Cập nhật hồ sơ, upload minh chứng, xem phân tích, nhận gợi ý, thực hiện roadmap |

## 4.2. Ma Trận Phân Quyền

| Chức năng | Admin | Giảng viên/cố vấn | Sinh viên |
| --- | --- | --- | --- |
| Đăng nhập, đổi mật khẩu | Có | Có | Có |
| Xem dashboard | Có | Có | Có |
| Quản lý người dùng | Có | Không | Không |
| Quản lý nhóm kỹ năng | Có | Xem | Xem |
| Quản lý kỹ năng | Có | Xem | Xem |
| Quản lý mục tiêu nghề nghiệp | Có | Xem | Xem |
| Cấu hình kỹ năng yêu cầu | Có | Không | Không |
| Phân công cố vấn | Có | Không | Không |
| Cập nhật hồ sơ sinh viên | Không | Không | Chỉ hồ sơ của mình |
| Xem hồ sơ sinh viên | Có | Sinh viên được phân công | Chỉ hồ sơ của mình |
| Upload minh chứng | Không | Không | Có |
| Duyệt minh chứng | Có | Có, trong phạm vi phụ trách | Không |
| Chạy phân tích năng lực | Có | Cho sinh viên phụ trách | Cho bản thân |
| Xem gợi ý và roadmap | Có | Cho sinh viên phụ trách | Cho bản thân |
| Cập nhật trạng thái gợi ý | Không | Không | Có |
| Cập nhật tiến độ roadmap | Không | Theo dõi | Có |
| Xem thông báo | Có | Có | Có |
| Xuất báo cáo | Có | Theo nhóm phụ trách | Portfolio cá nhân |

## 4.3. Nguyên Tắc Phân Quyền

- API mặc định yêu cầu JWT, trừ các endpoint public.
- Backend dùng `JwtAuthGuard` để xác thực token.
- Backend dùng `RolesGuard` và decorator `@Roles(...)` để kiểm tra vai trò.
- Sinh viên thao tác với dữ liệu của mình qua các endpoint `me`.
- Giảng viên/cố vấn chỉ nên truy cập sinh viên trong danh sách được phân công.
- Admin có quyền quản trị cao nhất đối với danh mục, cấu hình và báo cáo.

---

# 5. Yêu Cầu Chức Năng

## 5.1. Xác Thực Và Tài Khoản

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-AUTH-01 | Đăng nhập | Người dùng đăng nhập bằng email và mật khẩu |
| FR-AUTH-02 | Cấp token | Hệ thống trả access token, refresh token và thông tin người dùng |
| FR-AUTH-03 | Làm mới token | Client dùng refresh token để xin access token mới |
| FR-AUTH-04 | Đăng xuất | Hệ thống thu hồi refresh token |
| FR-AUTH-05 | Đổi mật khẩu | Người dùng đổi mật khẩu sau khi xác nhận mật khẩu hiện tại |
| FR-AUTH-06 | Xem profile đăng nhập | Người dùng lấy thông tin tài khoản hiện tại |
| FR-AUTH-07 | Kiểm soát trạng thái tài khoản | Tài khoản `LOCKED` hoặc `INACTIVE` không được đăng nhập |

## 5.2. Quản Lý Người Dùng

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-USER-01 | Xem danh sách người dùng | Admin xem danh sách tài khoản trong hệ thống |
| FR-USER-02 | Quản lý sinh viên | Admin tạo, cập nhật, khóa/mở khóa sinh viên theo thiết kế mở rộng |
| FR-USER-03 | Quản lý giảng viên | Admin tạo, cập nhật, khóa/mở khóa giảng viên theo thiết kế mở rộng |
| FR-USER-04 | Tìm kiếm và lọc | Lọc theo vai trò, trạng thái, khoa/lớp/ngành |
| FR-USER-05 | Import danh sách | Hỗ trợ import từ Excel theo thiết kế mở rộng |

## 5.3. Danh Mục Kỹ Năng

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-SKCAT-01 | Quản lý nhóm kỹ năng | Admin thêm, sửa, xóa, kích hoạt/vô hiệu hóa nhóm kỹ năng |
| FR-SKILL-01 | Quản lý kỹ năng | Admin thêm, sửa, xóa, kích hoạt/vô hiệu hóa kỹ năng |
| FR-SKILL-02 | Phân loại kỹ năng | Mỗi kỹ năng có thể thuộc một nhóm kỹ năng |
| FR-SKILL-03 | Tra cứu kỹ năng | Người dùng tìm kiếm kỹ năng theo tên, nhóm, trạng thái |

## 5.4. Mục Tiêu Nghề Nghiệp

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-SPEC-01 | Quản lý chuyên ngành/domain | Admin thêm, sửa, xóa, kích hoạt/vô hiệu hóa chuyên ngành trong CNTT |
| FR-SPEC-02 | Gắn career goal với chuyên ngành | Một career goal có thể thuộc một hoặc nhiều chuyên ngành để lọc dữ liệu phù hợp |
| FR-CAREER-01 | Quản lý career goal | Admin thêm, sửa, xóa, kích hoạt/vô hiệu hóa mục tiêu nghề nghiệp |
| FR-CAREER-02 | Cấu hình kỹ năng yêu cầu | Admin gán kỹ năng vào career goal |
| FR-CAREER-03 | Cấu hình mức độ yêu cầu | Mỗi kỹ năng có `requiredLevel` |
| FR-CAREER-04 | Cấu hình trọng số | Mỗi kỹ năng có `weight` để tính điểm |
| FR-CAREER-05 | Cấu hình thứ tự học | Mỗi kỹ năng có `learningOrder` để sinh roadmap |

## 5.5. Hồ Sơ Năng Lực Sinh Viên

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-PROFILE-01 | Xem hồ sơ cá nhân | Sinh viên xem hồ sơ của mình |
| FR-PROFILE-02 | Cập nhật hồ sơ | Sinh viên cập nhật tóm tắt, chuyên ngành/domain, mục tiêu nghề nghiệp, GitHub, LinkedIn, portfolio |
| FR-PROFILE-03 | Upload avatar | Sinh viên upload ảnh đại diện |
| FR-PROFILE-04 | Tính completion percent | Hệ thống tính tỷ lệ hoàn thiện hồ sơ |
| FR-PROFILE-05 | Tính risk score | Hệ thống tính điểm rủi ro để cảnh báo |
| FR-PROFILE-06 | Cố vấn xem hồ sơ | Giảng viên/cố vấn xem hồ sơ sinh viên trong phạm vi phụ trách |

## 5.6. Dữ Liệu Năng Lực

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-SSKILL-01 | Quản lý kỹ năng cá nhân | Sinh viên thêm, sửa, xóa kỹ năng và mức độ hiện tại |
| FR-PROJ-01 | Quản lý dự án | Sinh viên thêm, sửa, xóa dự án, công nghệ, link GitHub/demo |
| FR-CERT-01 | Quản lý chứng chỉ | Sinh viên thêm, sửa, xóa chứng chỉ, đơn vị cấp, ngày cấp, link xác thực |
| FR-ACT-01 | Quản lý hoạt động | Sinh viên thêm, sửa, xóa hoạt động ngoại khóa |
| FR-EXP-01 | Quản lý kinh nghiệm | Sinh viên thêm, sửa, xóa kinh nghiệm thực tập/làm việc |
| FR-EVID-01 | Upload minh chứng | Sinh viên upload file hoặc URL minh chứng cho từng loại tài nguyên |
| FR-EVID-02 | Theo dõi trạng thái | Minh chứng có trạng thái `PENDING`, `VERIFIED`, `REJECTED` |

## 5.7. Duyệt Minh Chứng

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-REVIEW-01 | Xem hàng đợi minh chứng | Giảng viên/cố vấn và admin xem minh chứng chờ duyệt |
| FR-REVIEW-02 | Xác nhận minh chứng | Người có quyền chuyển trạng thái sang `VERIFIED` |
| FR-REVIEW-03 | Từ chối minh chứng | Người có quyền chuyển trạng thái sang `REJECTED` và ghi lý do |
| FR-REVIEW-04 | Gửi thông báo | Hệ thống thông báo kết quả đến sinh viên |
| FR-REVIEW-05 | Cập nhật trạng thái liên quan | Tài nguyên liên quan được cập nhật trạng thái xác thực |

## 5.8. Phân Tích Năng Lực

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-ANALYSIS-01 | Phân tích cho bản thân | Sinh viên yêu cầu hệ thống phân tích hồ sơ của mình |
| FR-ANALYSIS-02 | Phân tích cho sinh viên | Giảng viên/cố vấn hoặc admin phân tích một sinh viên |
| FR-ANALYSIS-03 | Lưu lịch sử | Mỗi lần phân tích tạo một `CompetencyAnalysisResult` |
| FR-ANALYSIS-04 | Chi tiết kỹ năng | Kết quả gồm từng kỹ năng, mức hiện tại, mức yêu cầu, gap, điểm ưu tiên |
| FR-ANALYSIS-05 | Phân loại match level | Hệ thống phân loại `NOT_MATCHED`, `DEVELOPING`, `GOOD_MATCH`, `STRONG_MATCH` |

## 5.9. Gợi Ý Và Roadmap

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-REC-01 | Sinh gợi ý | Hệ thống tạo recommendation theo kỹ năng thiếu |
| FR-REC-02 | Xem gợi ý | Sinh viên xem danh sách recommendation của mình |
| FR-REC-03 | Cập nhật trạng thái gợi ý | Sinh viên đánh dấu `SAVED`, `IN_PROGRESS`, `DONE`, `DISMISSED` |
| FR-REC-04 | Template theo chuyên ngành | Hệ thống ưu tiên mẫu gợi ý khớp chuyên ngành, career goal, skill hoặc skill category |
| FR-REC-05 | Fallback recommendation | Nếu chưa có template cụ thể, hệ thống dùng template tổng quát hơn hoặc sinh gợi ý mặc định |
| FR-ROAD-01 | Sinh roadmap | Hệ thống tạo lộ trình từ danh sách kỹ năng thiếu |
| FR-ROAD-02 | Xem roadmap | Sinh viên xem roadmap và các item |
| FR-ROAD-03 | Cập nhật tiến độ | Sinh viên cập nhật trạng thái item |
| FR-ROAD-04 | Tính progress percent | Hệ thống tính tiến độ roadmap theo trọng số item |

## 5.10. Thông Báo Và Dashboard

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| FR-NOTI-01 | Thông báo cá nhân | Mỗi người dùng xem danh sách thông báo của mình |
| FR-NOTI-02 | Đếm thông báo chưa đọc | Hệ thống trả về số thông báo chưa đọc |
| FR-NOTI-03 | Đánh dấu đã đọc | Người dùng đánh dấu một hoặc tất cả thông báo đã đọc |
| FR-NOTI-04 | Nhắc cập nhật hồ sơ | Scheduler nhắc sinh viên lâu chưa cập nhật hồ sơ |
| FR-NOTI-05 | Cảnh báo hồ sơ yếu | Scheduler gửi cảnh báo nếu completion/match/risk vượt ngưỡng |
| FR-DASH-01 | Dashboard sinh viên | Hiển thị tổng quan hồ sơ, match, roadmap, gợi ý |
| FR-DASH-02 | Dashboard giảng viên | Hiển thị sinh viên phụ trách, minh chứng chờ duyệt, cảnh báo |
| FR-DASH-03 | Dashboard admin | Hiển thị thống kê toàn hệ thống |

---

# 6. Yêu Cầu Phi Chức Năng

| Nhóm | Yêu cầu | Thiết kế đáp ứng |
| --- | --- | --- |
| Bảo mật | Xác thực JWT, refresh token, phân quyền theo vai trò | `JwtAuthGuard`, `RolesGuard`, bcrypt, refresh token hash |
| Bảo vệ dữ liệu | Sinh viên không truy cập dữ liệu của sinh viên khác | Endpoint `me`, kiểm tra ownership trong service |
| Validation | Chặn payload sai cấu trúc | `ValidationPipe`, DTO, class-validator |
| Hiệu năng | Danh sách có phân trang và index | Pagination DTO, index trong Prisma schema |
| Mở rộng | Module tách theo miền nghiệp vụ | NestJS modules, frontend features, Prisma models theo domain |
| Dễ bảo trì | Code tổ chức rõ controller/service/DTO | Modular monolith |
| Nhất quán API | Response thành công/lỗi có cấu trúc thống nhất | `ResponseInterceptor`, `GlobalExceptionFilter` |
| Khả dụng | Web app chạy trên trình duyệt hiện đại | Next.js App Router, Ant Design |
| Quan sát hệ thống | Log request và lỗi server | Request logging middleware, Nest Logger |
| Tài liệu API | Có tài liệu API tự động | Swagger tại `/api/docs` |

---

# 7. Quy Tắc Nghiệp Vụ

## 7.1. Tài Khoản Và Vai Trò

- Mỗi người dùng có một email duy nhất.
- Mỗi user có một trong ba vai trò: `ADMIN`, `LECTURER`, `STUDENT`.
- Tài khoản chỉ đăng nhập được khi trạng thái là `ACTIVE`.
- Mật khẩu không được lưu plaintext, phải lưu bằng `passwordHash`.
- Refresh token được lưu dưới dạng hash để có thể thu hồi khi logout.

## 7.2. Sinh Viên Và Giảng Viên

- Mỗi sinh viên gắn với một user qua quan hệ 1-1.
- Mỗi giảng viên gắn với một user qua quan hệ 1-1.
- Một giảng viên có thể phụ trách nhiều sinh viên.
- Một sinh viên có thể có nhiều bản ghi phân công theo thời gian, nhưng nên chỉ có một phân công `ACTIVE` chính trong quy trình vận hành.

## 7.3. Hồ Sơ Năng Lực

- Mỗi sinh viên có một hồ sơ năng lực chính.
- Hồ sơ có thể gắn với một mục tiêu nghề nghiệp hiện tại.
- Sinh viên có thể thêm nhiều kỹ năng, dự án, chứng chỉ, hoạt động, kinh nghiệm.
- Mỗi cặp `studentId + skillId` chỉ tồn tại một lần trong `student_skills`.
- Dữ liệu thuộc sinh viên được xóa cascade khi sinh viên bị xóa.

## 7.4. Minh Chứng

- Minh chứng liên kết với tài nguyên thông qua `relatedEntityType` và `relatedEntityId`.
- Loại tài nguyên hợp lệ: `SKILL`, `PROJECT`, `CERTIFICATE`, `ACTIVITY`, `EXPERIENCE`, `ROADMAP_ITEM`.
- Minh chứng mới upload có trạng thái `PENDING`.
- Minh chứng được giảng viên/cố vấn hoặc admin duyệt sang `VERIFIED` hoặc `REJECTED`.
- Khi từ chối minh chứng, cần có ghi chú để sinh viên biết lý do và cập nhật lại.

## 7.5. Phân Tích Và Gợi Ý

- Sinh viên cần có career goal để phân tích đầy đủ.
- Career goal cần có danh sách required skills.
- Mức kỹ năng hiện tại thấp hơn mức yêu cầu được xem là kỹ năng cần cải thiện.
- Điểm ưu tiên càng cao thì kỹ năng càng cần được đưa lên đầu danh sách cải thiện.
- Lịch sử phân tích cần được lưu để theo dõi tiến bộ theo thời gian.

---

# 8. Quy Trình Nghiệp Vụ Chính

## 8.1. Admin Cấu Hình Dữ Liệu Nền Tảng

```mermaid
flowchart TD
    A["Admin đăng nhập"] --> B["Quản lý nhóm kỹ năng"]
    B --> C["Quản lý kỹ năng"]
    C --> D["Quản lý mục tiêu nghề nghiệp"]
    D --> E["Cấu hình kỹ năng yêu cầu"]
    E --> F["Thiết lập required level, weight, learning order"]
    F --> G["Phân công cố vấn cho sinh viên"]
    G --> H["Hệ thống sẵn sàng phân tích năng lực"]
```

## 8.2. Sinh Viên Xây Dựng Hồ Sơ

```mermaid
flowchart TD
    A["Sinh viên đăng nhập"] --> B["Cập nhật thông tin profile"]
    B --> C["Chọn mục tiêu nghề nghiệp"]
    C --> D["Thêm kỹ năng"]
    D --> E["Thêm dự án / chứng chỉ / hoạt động / kinh nghiệm"]
    E --> F["Upload minh chứng"]
    F --> G["Hệ thống tính completion percent và risk score"]
    G --> H["Sinh viên xem dashboard cá nhân"]
```

## 8.3. Phân Tích Năng Lực Và Sinh Roadmap

```mermaid
flowchart TD
    A["Người dùng yêu cầu phân tích"] --> B["Lấy student profile"]
    B --> C["Lấy career goal"]
    C --> D["Lấy required skills"]
    D --> E["Lấy student skills"]
    E --> F["Tính match percent"]
    F --> G["Xác định missing skills"]
    G --> H["Tính priority score"]
    H --> I["Lưu analysis result"]
    I --> J["Sinh recommendations"]
    J --> K["Sinh roadmap theo learning order và priority"]
```

## 8.4. Giảng Viên/Cố Vấn Duyệt Minh Chứng

```mermaid
flowchart TD
    A["Giảng viên/cố vấn đăng nhập"] --> B["Xem pending evidences"]
    B --> C["Mở chi tiết minh chứng"]
    C --> D{"Minh chứng hợp lệ?"}
    D -->|Có| E["Verify evidence"]
    D -->|Không| F["Reject evidence và ghi lý do"]
    E --> G["Cập nhật trạng thái liên quan"]
    F --> G
    G --> H["Gửi thông báo cho sinh viên"]
```

---

# 9. Use Case

## 9.1. Use Case Tổng Quát

```mermaid
flowchart LR
    Admin["Admin"] --> UC1["Quản lý người dùng"]
    Admin --> UC2["Quản lý danh mục kỹ năng"]
    Admin --> UC3["Quản lý career goal"]
    Admin --> UC4["Phân công cố vấn"]
    Admin --> UC5["Xem dashboard admin"]

    Lecturer["Giảng viên / Cố vấn"] --> UC6["Xem sinh viên phụ trách"]
    Lecturer --> UC7["Xem hồ sơ sinh viên"]
    Lecturer --> UC8["Duyệt minh chứng"]
    Lecturer --> UC9["Phân tích sinh viên"]
    Lecturer --> UC10["Xem báo cáo phụ trách"]

    Student["Sinh viên"] --> UC11["Cập nhật profile"]
    Student --> UC12["Quản lý kỹ năng"]
    Student --> UC13["Quản lý dự án / chứng chỉ / hoạt động / kinh nghiệm"]
    Student --> UC14["Upload minh chứng"]
    Student --> UC15["Phân tích năng lực"]
    Student --> UC16["Xem gợi ý và roadmap"]
    Student --> UC17["Cập nhật tiến độ roadmap"]
```

## 9.2. Use Case: Đăng Nhập

| Thuộc tính | Nội dung |
| --- | --- |
| Tác nhân | Admin, giảng viên/cố vấn, sinh viên |
| Mục tiêu | Xác thực người dùng và khởi tạo phiên làm việc |
| Tiền điều kiện | Tài khoản tồn tại và đang `ACTIVE` |
| Hậu điều kiện | Client lưu access token, refresh token và thông tin user |

Luồng chính:

1. Người dùng nhập email và mật khẩu.
2. Frontend gửi `POST /api/auth/login`.
3. Backend kiểm tra email, mật khẩu và trạng thái tài khoản.
4. Backend cấp access token và refresh token.
5. Frontend lưu session và điều hướng theo vai trò.

Luồng ngoại lệ:

- Sai email hoặc mật khẩu: trả về 401.
- Tài khoản bị khóa hoặc inactive: trả về 403.
- Payload không hợp lệ: trả về 400.

## 9.3. Use Case: Sinh Viên Cập Nhật Kỹ Năng

| Thuộc tính | Nội dung |
| --- | --- |
| Tác nhân | Sinh viên |
| Mục tiêu | Khai báo kỹ năng và mức độ hiện tại |
| Tiền điều kiện | Sinh viên đã đăng nhập |
| Hậu điều kiện | `student_skills` được tạo/cập nhật, profile cập nhật `lastUpdatedAt` |

Luồng chính:

1. Sinh viên vào trang Skills.
2. Hệ thống hiển thị danh sách kỹ năng đã khai báo và danh mục kỹ năng.
3. Sinh viên chọn kỹ năng, mức độ hiện tại và mô tả.
4. Frontend gửi `POST /api/profiles/me/skills`.
5. Backend kiểm tra ownership và ràng buộc trùng lặp.
6. Backend lưu bản ghi và trả về kết quả.

Luồng ngoại lệ:

- Kỹ năng đã tồn tại: hệ thống báo lỗi hoặc yêu cầu cập nhật bản ghi hiện có.
- Mức độ không hợp lệ: trả về validation error.
- Token hết hạn: frontend tự động refresh token.

## 9.4. Use Case: Upload Và Duyệt Minh Chứng

| Thuộc tính | Nội dung |
| --- | --- |
| Tác nhân chính | Sinh viên |
| Tác nhân phụ | Giảng viên/cố vấn, admin |
| Mục tiêu | Ghi nhận và xác thực minh chứng cho một tài nguyên trong hồ sơ |
| Tiền điều kiện | Sinh viên có tài nguyên cần chứng minh |
| Hậu điều kiện | Evidence có trạng thái `VERIFIED` hoặc `REJECTED`, sinh viên nhận thông báo |

Luồng chính:

1. Sinh viên upload file hoặc URL minh chứng.
2. Backend tạo `Evidence` với trạng thái `PENDING`.
3. Giảng viên/cố vấn vào hàng đợi pending.
4. Giảng viên/cố vấn xem nội dung minh chứng.
5. Nếu hợp lệ, gọi `PATCH /api/evidences/:id/verify`.
6. Nếu không hợp lệ, gọi `PATCH /api/evidences/:id/reject` kèm lý do.
7. Backend cập nhật trạng thái và tạo notification cho sinh viên.

## 9.5. Use Case: Phân Tích Năng Lực

| Thuộc tính | Nội dung |
| --- | --- |
| Tác nhân | Sinh viên, giảng viên/cố vấn, admin |
| Mục tiêu | Đánh giá độ phù hợp của sinh viên với mục tiêu nghề nghiệp |
| Tiền điều kiện | Sinh viên có profile, career goal có required skills |
| Hậu điều kiện | Kết quả phân tích và chi tiết từng kỹ năng được lưu |

Luồng chính:

1. Tác nhân yêu cầu phân tích.
2. Hệ thống lấy profile, career goal, required skills và student skills.
3. Engine tính `completionPercent`, `matchPercent`, `riskScore`.
4. Engine tính chi tiết từng kỹ năng: current level, required level, gap, achieved score, priority score.
5. Hệ thống lưu `CompetencyAnalysisResult` và `CompetencyAnalysisDetail`.
6. Hệ thống tạo recommendation theo missing skills.
7. Kết quả được trả về cho frontend.

Luồng ngoại lệ:

- Chưa chọn career goal: yêu cầu sinh viên chọn mục tiêu.
- Career goal chưa có required skills: thông báo chưa đủ dữ liệu phân tích.
- Người dùng không có quyền xem sinh viên: trả về 403.

---

# 10. Thiết Kế Kiến Trúc

## 10.1. Mô Hình Kiến Trúc

Hệ thống sử dụng mô hình **Modular Monolith** kết hợp các nguyên tắc clean architecture nhẹ.

Lý do lựa chọn:

- Phù hợp quy mô đồ án và sản phẩm nội bộ khoa/trường.
- Các module nghiệp vụ liên kết chặt chẽ, chưa cần tách microservices.
- Dễ triển khai, dễ debug, dễ chạy local.
- Vẫn đảm bảo khả năng mở rộng nhờ tách module theo domain.

```text
Frontend: Next.js 15 + React 19 + TypeScript + Ant Design
        |
        | REST API / JSON / JWT
        v
Backend: NestJS 11 + TypeScript + Prisma
        |
        v
Database: PostgreSQL
```

## 10.2. Công Nghệ Sử Dụng

| Lớp | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | Next.js 15 | Web app, routing theo App Router |
| Frontend | React 19 | Xây dựng UI component |
| Frontend | TypeScript | Kiểu hóa dữ liệu và giảm lỗi runtime |
| Frontend | Ant Design 5 | UI components |
| Frontend | TanStack React Query | Quản lý server state |
| Frontend | Axios | HTTP client, interceptor token |
| Backend | NestJS 11 | REST API, module architecture |
| Backend | Prisma 7.8 | ORM và type-safe database access |
| Backend | Passport JWT | Xác thực access token và refresh token |
| Backend | class-validator | Validate DTO |
| Backend | Swagger | Tài liệu API |
| Database | PostgreSQL | Lưu trữ dữ liệu quan hệ |

## 10.3. Module Backend

| Module | Trách nhiệm |
| --- | --- |
| `auth` | Đăng nhập, refresh token, logout, profile, đổi mật khẩu |
| `users` | Xem người dùng hiện tại, danh sách người dùng cho admin |
| `students` | Khung module quản lý sinh viên |
| `lecturers` | Khung module quản lý giảng viên |
| `advisor-assignments` | CRUD phân công cố vấn |
| `skill-categories` | CRUD nhóm kỹ năng |
| `skills` | CRUD kỹ năng |
| `specializations` | CRUD chuyên ngành/domain và quan hệ với career goal |
| `career-goals` | CRUD career goal, required skills và mapping chuyên ngành |
| `profiles` | Profile sinh viên, skills, projects, certificates, activities, experiences, avatar, evidence upload |
| `evidences` | Upload, xem, duyệt, từ chối minh chứng |
| `competency-analysis` | Engine và API phân tích năng lực |
| `recommendation-templates` | Admin cấu hình bộ mẫu gợi ý theo chuyên ngành, career goal, skill category và skill |
| `recommendations` | Sinh, xem và cập nhật trạng thái recommendation |
| `roadmaps` | Sinh roadmap, xem roadmap, cập nhật item status |
| `notifications` | Notification API và scheduler |
| `dashboard` | Tổng hợp thống kê theo vai trò |
| `common` | Guards, decorators, filters, interceptors, pagination, upload options |
| `prisma` | Kết nối database |

## 10.4. Cấu Trúc Frontend

| Khu vực | Trang |
| --- | --- |
| Auth | `/login` |
| Admin | `/admin/dashboard`, `/admin/users`, `/admin/students`, `/admin/lecturers`, `/admin/skill-categories`, `/admin/skills`, `/admin/career-goals`, `/admin/advisor-assignments`, `/admin/reports` |
| Lecturer | `/lecturer/dashboard`, `/lecturer/students`, `/lecturer/evidences`, `/lecturer/reviews`, `/lecturer/reports` |
| Student | `/student/dashboard`, `/student/profile`, `/student/skills`, `/student/projects`, `/student/certificates`, `/student/activities`, `/student/experiences`, `/student/evidences`, `/student/analysis`, `/student/recommendations`, `/student/roadmap`, `/student/portfolio`, `/student/notifications` |

## 10.5. Luồng Request/Response

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as NestJS API
    participant Guard as Guards/Pipes
    participant Service as Service
    participant DB as PostgreSQL

    UI->>API: HTTP request with Bearer token
    API->>Guard: Validate JWT, role, DTO
    Guard-->>API: Request accepted
    API->>Service: Execute use case
    Service->>DB: Prisma query/mutation
    DB-->>Service: Data
    Service-->>API: Result
    API-->>UI: { success: true, data }
```

## 10.6. Chuẩn Response Và Lỗi

Response thành công được bọc bởi `ResponseInterceptor`:

```json
{
  "success": true,
  "data": {}
}
```

Response lỗi được chuẩn hóa bởi `GlobalExceptionFilter`:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "path": "/api/example",
  "timestamp": "2026-06-05T00:00:00.000Z"
}
```

---

# 11. Thiết Kế Dữ Liệu

## 11.1. Tổng Quan Database

Database sử dụng PostgreSQL và được mô tả bằng Prisma schema tại `backend/prisma/schema.prisma`. Thiết kế chia theo các miền:

- Identity & Access.
- Skill Catalog.
- Specialization & Career Configuration.
- Student Profile.
- Evidence & Advisor Review.
- Competency Analysis.
- Recommendation & Roadmap.
- Notification.
- Audit & Export.

## 11.2. ERD Tổng Quát

```mermaid
erDiagram
    USERS ||--o| STUDENTS : has
    USERS ||--o| LECTURERS : has
    LECTURERS ||--o{ ADVISOR_ASSIGNMENTS : advises
    STUDENTS ||--o{ ADVISOR_ASSIGNMENTS : assigned

    SKILL_CATEGORIES ||--o{ SKILLS : contains
    SPECIALIZATIONS ||--o{ CAREER_GOAL_SPECIALIZATIONS : groups
    CAREER_GOALS ||--o{ CAREER_GOAL_SPECIALIZATIONS : belongs_to
    CAREER_GOALS ||--o{ CAREER_REQUIRED_SKILLS : requires
    SKILLS ||--o{ CAREER_REQUIRED_SKILLS : configured

    STUDENTS ||--|| STUDENT_PROFILES : owns
    SPECIALIZATIONS ||--o{ STUDENT_PROFILES : selected_by
    CAREER_GOALS ||--o{ STUDENT_PROFILES : selected_by
    STUDENTS ||--o{ STUDENT_SKILLS : has
    SKILLS ||--o{ STUDENT_SKILLS : declared

    STUDENTS ||--o{ STUDENT_PROJECTS : owns
    STUDENTS ||--o{ STUDENT_CERTIFICATES : owns
    STUDENTS ||--o{ STUDENT_ACTIVITIES : owns
    STUDENTS ||--o{ STUDENT_EXPERIENCES : owns
    STUDENTS ||--o{ EVIDENCES : uploads

    STUDENTS ||--o{ COMPETENCY_ANALYSIS_RESULTS : analyzed
    CAREER_GOALS ||--o{ COMPETENCY_ANALYSIS_RESULTS : target
    COMPETENCY_ANALYSIS_RESULTS ||--o{ COMPETENCY_ANALYSIS_DETAILS : includes
    SKILLS ||--o{ COMPETENCY_ANALYSIS_DETAILS : analyzed

    STUDENTS ||--o{ STUDENT_RECOMMENDATIONS : receives
    SPECIALIZATIONS ||--o{ RECOMMENDATION_TEMPLATES : scopes
    CAREER_GOALS ||--o{ RECOMMENDATION_TEMPLATES : scopes
    SKILL_CATEGORIES ||--o{ RECOMMENDATION_TEMPLATES : scopes
    SKILLS ||--o{ RECOMMENDATION_TEMPLATES : scopes
    SKILLS ||--o{ STUDENT_RECOMMENDATIONS : relates
    STUDENTS ||--o{ DEVELOPMENT_ROADMAPS : has
    DEVELOPMENT_ROADMAPS ||--o{ ROADMAP_ITEMS : contains

    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ ACTIVITY_LOGS : creates
    USERS ||--o{ EXPORT_LOGS : creates
```

## 11.3. Danh Sách Bảng

| Bảng | Mục đích |
| --- | --- |
| `users` | Tài khoản đăng nhập chung |
| `students` | Định danh sinh viên |
| `lecturers` | Định danh giảng viên/cố vấn |
| `advisor_assignments` | Phân công cố vấn cho sinh viên |
| `skill_categories` | Nhóm kỹ năng |
| `skills` | Danh mục kỹ năng |
| `specializations` | Chuyên ngành/domain trong ngành CNTT |
| `career_goal_specializations` | Quan hệ nhiều-nhiều giữa career goal và chuyên ngành |
| `career_goals` | Mục tiêu nghề nghiệp |
| `career_required_skills` | Kỹ năng yêu cầu theo career goal |
| `student_profiles` | Hồ sơ năng lực chính |
| `student_skills` | Kỹ năng sinh viên khai báo |
| `student_projects` | Dự án sinh viên |
| `student_certificates` | Chứng chỉ sinh viên |
| `student_activities` | Hoạt động sinh viên |
| `student_experiences` | Kinh nghiệm sinh viên |
| `evidences` | Minh chứng |
| `advisor_reviews` | Nhận xét của cố vấn |
| `competency_analysis_results` | Kết quả phân tích tổng quan |
| `competency_analysis_details` | Chi tiết phân tích từng kỹ năng |
| `recommendation_templates` | Mẫu gợi ý theo chuyên ngành, career goal, nhóm kỹ năng hoặc kỹ năng |
| `student_recommendations` | Gợi ý đã sinh cho sinh viên |
| `development_roadmaps` | Lộ trình phát triển |
| `roadmap_items` | Nhiệm vụ trong lộ trình |
| `student_roadmap_progress` | Lịch sử cập nhật tiến độ |
| `notifications` | Thông báo trong hệ thống |
| `notification_logs` | Lịch sử gửi thông báo |
| `activity_logs` | Lịch sử thao tác |
| `export_logs` | Lịch sử xuất file |

## 11.4. Ràng Buộc Quan Trọng

| Ràng buộc | Ý nghĩa |
| --- | --- |
| `users.email` unique | Mỗi email chỉ thuộc một tài khoản |
| `students.user_id` unique | Mỗi user sinh viên có một student |
| `students.student_code` unique | Mã sinh viên không trùng |
| `lecturers.user_id` unique | Mỗi user giảng viên có một lecturer |
| `lecturers.lecturer_code` unique | Mã giảng viên không trùng |
| `skill_categories.name` unique | Tên nhóm kỹ năng không trùng |
| `specializations.name` unique | Tên chuyên ngành/domain không trùng |
| `career_goal_specializations(career_goal_id, specialization_id)` unique | Một career goal không gắn trùng một chuyên ngành |
| `career_goals.name` unique | Tên career goal không trùng |
| `skills(category_id, name)` unique | Tên kỹ năng không trùng trong cùng nhóm |
| `advisor_assignments(lecturer_id, student_id)` unique | Không tạo trùng phân công |
| `career_required_skills(career_goal_id, skill_id)` unique | Một kỹ năng chỉ cấu hình một lần trong career goal |
| `student_profiles.student_id` unique | Mỗi sinh viên có một profile |
| `student_skills(student_id, skill_id)` unique | Sinh viên không khai báo trùng một kỹ năng |
| `competency_analysis_details(analysis_result_id, skill_id)` unique | Mỗi kỹ năng có một dòng chi tiết trong một kết quả phân tích |

## 11.5. Index Tối Ưu Truy Vấn

| Nhóm truy vấn | Index tiêu biểu |
| --- | --- |
| Người dùng | `users(role, status)`, `users(status, created_at)` |
| Sinh viên | `students(class_name, major)`, `students(major, academic_year)` |
| Chuyên ngành | `specializations(is_active, name)`, `career_goal_specializations(specialization_id, career_goal_id)` |
| Hàng đợi minh chứng | `evidences(status, created_at)` |
| Hồ sơ cần cảnh báo | `student_profiles(completion_percent)`, `student_profiles(match_percent)`, `student_profiles(risk_score)` |
| Lịch sử phân tích | `competency_analysis_results(student_id, analyzed_at)` |
| Roadmap | `development_roadmaps(student_id, status)`, `roadmap_items(roadmap_id, order_index)` |
| Recommendation template | `recommendation_templates(specialization_id, career_goal_id, skill_id, priority)`, `recommendation_templates(skill_category_id, skill_id, priority)` |
| Thông báo chưa đọc | `notifications(user_id, is_read, created_at)` |

---

# 12. Thiết Kế Thuật Toán

## 12.1. Mức Độ Kỹ Năng

| Giá trị | Ý nghĩa |
| --- | --- |
| 0 | Chưa biết |
| 1 | Cơ bản |
| 2 | Khá |
| 3 | Tốt |

## 12.2. Tính Điểm Kỹ Năng

Với mỗi kỹ năng yêu cầu:

```text
ratio = min(currentLevel / requiredLevel, 1)
achievedScore = ratio * weight
gap = max(requiredLevel - currentLevel, 0)
priorityScore = gap * weight
```

Trạng thái chi tiết:

- `MISSING`: `currentLevel <= 0`.
- `NEED_IMPROVEMENT`: `0 < currentLevel < requiredLevel`.
- `ACHIEVED`: `currentLevel >= requiredLevel`.

## 12.3. Tính Tỷ Lệ Phù Hợp

```text
matchPercent = sum(achievedScore) / sum(weight) * 100
```

| Match percent | Match level | Ý nghĩa |
| --- | --- | --- |
| Dưới 40 | `NOT_MATCHED` | Chưa phù hợp |
| Từ 40 đến dưới 70 | `DEVELOPING` | Đang phát triển |
| Từ 70 đến dưới 85 | `GOOD_MATCH` | Khá phù hợp |
| Từ 85 trở lên | `STRONG_MATCH` | Phù hợp tốt |

## 12.4. Tính Risk Score

Thiết kế hiện tại trong engine:

| Điều kiện | Điểm |
| --- | --- |
| `completionPercent < 50` | +25 |
| `matchPercent < 40` | +25 |
| Tất cả required skills có `currentLevel <= 0` | +20 |

Tổng điểm được giới hạn tối đa 100.

Thiết kế mở rộng có thể bổ sung:

| Điều kiện | Điểm |
| --- | --- |
| Chưa có dự án | +20 |
| Chưa chọn career goal | +15 |
| Không cập nhật hồ sơ trong 60 ngày | +15 |
| Nhiều minh chứng bị từ chối | +10 |

## 12.5. Sinh Recommendation

Quy trình:

1. Lấy missing skills từ kết quả phân tích.
2. Sắp xếp theo `priorityScore` giảm dần.
3. Lấy `specializationId`, `careerGoalId`, `skillCategoryId` và `skillId` làm ngữ cảnh gợi ý.
4. Tìm `recommendation_templates` theo cơ chế ưu tiên từ cụ thể đến tổng quát.
5. Tạo `StudentRecommendation` với title, description, reason, priority score.
6. Gán trạng thái mặc định là `NEW`.
7. Cho phép sinh viên cập nhật sang `SAVED`, `IN_PROGRESS`, `DONE`, `DISMISSED`.

Thứ tự chọn template:

| Mức ưu tiên | Điều kiện match | Ý nghĩa |
| --- | --- | --- |
| 1 | `specializationId + careerGoalId + skillId` | Gợi ý cụ thể nhất cho đúng chuyên ngành, mục tiêu và kỹ năng |
| 2 | `specializationId + skillId` | Gợi ý theo chuyên ngành khi career goal chưa có template riêng |
| 3 | `careerGoalId + skillId` | Gợi ý theo vai trò nghề nghiệp |
| 4 | `skillCategoryId + skillId` | Gợi ý theo nhóm kỹ năng |
| 5 | `skillId` | Gợi ý chung cho kỹ năng |
| 6 | Không có template | Sinh gợi ý mặc định từ tên kỹ năng, gap và priority score |

Cơ chế này giúp hệ thống có thể bắt đầu bằng bộ mẫu nhỏ, ví dụ theo kỹ năng nền tảng hoặc nhóm kỹ năng, sau đó mở rộng dần cho từng chuyên ngành có nhu cầu. Admin không cần nhập trước toàn bộ domain trong ngành CNTT.

## 12.6. Sinh Roadmap

Roadmap builder sắp xếp missing skills theo:

1. `learningOrder` tăng dần.
2. Nếu trùng `learningOrder`, sắp xếp `priorityScore` giảm dần.

Mỗi missing skill tạo một roadmap item:

- `title`: Improve tên kỹ năng.
- `description`: mô tả khoảng cách thiếu hụt và priority score.
- `itemType`: `LEARN` nếu gap >= 2, ngược lại `PRACTICE`.
- `orderIndex`: thứ tự trong roadmap.
- `weight`: `max(priorityScore, 1)`.

## 12.7. Tính Tiến Độ Roadmap

```text
progressPercent = sum(weight của item DONE) / sum(weight của tất cả item) * 100
```

Trạng thái item:

- `TODO`.
- `IN_PROGRESS`.
- `DONE`.
- `CANCELLED`.

---

# 13. Thiết Kế API

API có global prefix là `/api`. Swagger được cấu hình tại `/api/docs`.

## 13.1. Auth API

| Method | Endpoint | Vai trò | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public | Đăng nhập |
| POST | `/api/auth/refresh` | Public + refresh guard | Làm mới token |
| POST | `/api/auth/logout` | Authenticated | Đăng xuất |
| GET | `/api/auth/profile` | Authenticated | Lấy profile hiện tại |
| GET | `/api/auth/me` | Authenticated | Lấy profile hiện tại |
| POST | `/api/auth/change-password` | Authenticated | Đổi mật khẩu |

## 13.2. Catalog API

| Method | Endpoint | Vai trò | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/skill-categories` | Authenticated | Danh sách nhóm kỹ năng |
| POST | `/api/skill-categories` | Admin | Tạo nhóm kỹ năng |
| GET | `/api/skill-categories/:id` | Authenticated | Chi tiết nhóm kỹ năng |
| PATCH | `/api/skill-categories/:id` | Admin | Cập nhật nhóm kỹ năng |
| DELETE | `/api/skill-categories/:id` | Admin | Xóa nhóm kỹ năng |
| GET | `/api/skills` | Authenticated | Danh sách kỹ năng |
| POST | `/api/skills` | Admin | Tạo kỹ năng |
| GET | `/api/skills/:id` | Authenticated | Chi tiết kỹ năng |
| PATCH | `/api/skills/:id` | Admin | Cập nhật kỹ năng |
| DELETE | `/api/skills/:id` | Admin | Xóa kỹ năng |
| GET | `/api/specializations` | Authenticated | Danh sách chuyên ngành/domain |
| POST | `/api/specializations` | Admin | Tạo chuyên ngành/domain |
| GET | `/api/specializations/:id` | Authenticated | Chi tiết chuyên ngành/domain |
| PATCH | `/api/specializations/:id` | Admin | Cập nhật chuyên ngành/domain |
| DELETE | `/api/specializations/:id` | Admin | Xóa chuyên ngành/domain |

## 13.3. Career Goal API

| Method | Endpoint | Vai trò | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/career-goals` | Authenticated | Danh sách career goals |
| POST | `/api/career-goals` | Admin | Tạo career goal |
| GET | `/api/career-goals/:id` | Authenticated | Chi tiết career goal |
| PATCH | `/api/career-goals/:id` | Admin | Cập nhật career goal |
| DELETE | `/api/career-goals/:id` | Admin | Xóa career goal |
| GET | `/api/career-goals/:careerGoalId/required-skills` | Authenticated | Danh sách kỹ năng yêu cầu |
| POST | `/api/career-goals/:careerGoalId/required-skills` | Admin | Thêm required skill |
| PATCH | `/api/career-goals/:careerGoalId/required-skills/:requiredSkillId` | Admin | Cập nhật required skill |
| DELETE | `/api/career-goals/:careerGoalId/required-skills/:requiredSkillId` | Admin | Xóa required skill |
| GET | `/api/career-goals/:careerGoalId/specializations` | Authenticated | Danh sách chuyên ngành của career goal |
| POST | `/api/career-goals/:careerGoalId/specializations` | Admin | Gắn career goal với chuyên ngành |
| DELETE | `/api/career-goals/:careerGoalId/specializations/:specializationId` | Admin | Gỡ career goal khỏi chuyên ngành |

## 13.4. Profile Và Student Resource API

| Nhóm | Endpoint mẫu | Method |
| --- | --- | --- |
| Profile cá nhân | `/api/profiles/me` | GET, PATCH |
| Avatar | `/api/profiles/me/avatar` | POST |
| Profile sinh viên | `/api/profiles/:studentId` | GET |
| Skills | `/api/profiles/me/skills` | GET, POST |
| Skill detail | `/api/profiles/me/skills/:id` | GET, PATCH, DELETE |
| Skill evidence | `/api/profiles/me/skills/:id/evidences` | POST |
| Projects | `/api/profiles/me/projects` | GET, POST |
| Project detail | `/api/profiles/me/projects/:id` | GET, PATCH, DELETE |
| Project evidence | `/api/profiles/me/projects/:id/evidences` | POST |
| Certificates | `/api/profiles/me/certificates` | GET, POST |
| Certificate detail | `/api/profiles/me/certificates/:id` | GET, PATCH, DELETE |
| Certificate evidence | `/api/profiles/me/certificates/:id/evidences` | POST |
| Activities | `/api/profiles/me/activities` | GET, POST |
| Activity detail | `/api/profiles/me/activities/:id` | GET, PATCH, DELETE |
| Activity evidence | `/api/profiles/me/activities/:id/evidences` | POST |
| Experiences | `/api/profiles/me/experiences` | GET, POST |
| Experience detail | `/api/profiles/me/experiences/:id` | GET, PATCH, DELETE |
| Experience evidence | `/api/profiles/me/experiences/:id/evidences` | POST |

Admin và lecturer xem tài nguyên của sinh viên qua:

- `/api/profiles/:studentId/skills`
- `/api/profiles/:studentId/projects`
- `/api/profiles/:studentId/certificates`
- `/api/profiles/:studentId/activities`
- `/api/profiles/:studentId/experiences`

## 13.5. Evidence API

| Method | Endpoint | Vai trò | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/evidences` | Student | Upload minh chứng |
| GET | `/api/evidences/me` | Student | Minh chứng của bản thân |
| GET | `/api/evidences/pending` | Admin, Lecturer | Hàng đợi minh chứng chờ duyệt |
| GET | `/api/evidences` | Admin | Tất cả minh chứng |
| GET | `/api/evidences/:id` | Student, Lecturer, Admin | Chi tiết minh chứng |
| PATCH | `/api/evidences/:id/verify` | Admin, Lecturer | Xác nhận minh chứng |
| PATCH | `/api/evidences/:id/reject` | Admin, Lecturer | Từ chối minh chứng |

## 13.6. Analysis, Recommendation Và Roadmap API

| Method | Endpoint | Vai trò | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/competency/analyze/me` | Student | Phân tích hồ sơ cá nhân |
| GET | `/api/competency/analysis-history/me` | Student | Lịch sử phân tích cá nhân |
| GET | `/api/competency/analysis-results/:id` | Student, Lecturer, Admin | Chi tiết kết quả phân tích |
| POST | `/api/competency/students/:studentId/analyze` | Lecturer, Admin | Phân tích sinh viên |
| GET | `/api/recommendation-templates` | Admin | Danh sách mẫu gợi ý, có filter theo chuyên ngành/career goal/skill |
| POST | `/api/recommendation-templates` | Admin | Tạo mẫu gợi ý |
| GET | `/api/recommendation-templates/:id` | Admin | Chi tiết mẫu gợi ý |
| PATCH | `/api/recommendation-templates/:id` | Admin | Cập nhật mẫu gợi ý |
| DELETE | `/api/recommendation-templates/:id` | Admin | Xóa mẫu gợi ý |
| GET | `/api/recommendations/me` | Student | Danh sách gợi ý cá nhân |
| PATCH | `/api/recommendations/:id/status` | Student | Cập nhật trạng thái gợi ý |
| POST | `/api/roadmaps/generate/me` | Student | Sinh roadmap cá nhân |
| GET | `/api/roadmaps/me` | Student | Danh sách roadmap cá nhân |
| GET | `/api/roadmaps/:id` | Student, Lecturer, Admin | Chi tiết roadmap |
| PATCH | `/api/roadmaps/items/:id/status` | Student | Cập nhật trạng thái item |
| POST | `/api/roadmaps/students/:studentId/generate` | Lecturer, Admin | Sinh roadmap cho sinh viên |

## 13.7. Dashboard Và Notification API

| Method | Endpoint | Vai trò | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/dashboard/student` | Student | Dashboard sinh viên |
| GET | `/api/dashboard/lecturer` | Lecturer | Dashboard giảng viên/cố vấn |
| GET | `/api/dashboard/admin` | Admin | Dashboard admin |
| GET | `/api/notifications/me` | Authenticated | Thông báo cá nhân |
| GET | `/api/notifications/me/unread-count` | Authenticated | Số thông báo chưa đọc |
| PATCH | `/api/notifications/:id/read` | Authenticated | Đánh dấu một thông báo đã đọc |
| PATCH | `/api/notifications/read-all` | Authenticated | Đánh dấu tất cả đã đọc |

---

# 14. Thiết Kế Giao Diện

## 14.1. Nguyên Tắc UI

- Giao diện chia theo vai trò, mỗi vai trò có layout và menu riêng.
- Sidebar dùng để điều hướng các module chính.
- Dashboard là màn hình đầu tiên sau đăng nhập.
- Các trang danh sách dùng table, search, filter, pagination.
- Các form CRUD có validation rõ ràng và thông báo lỗi cụ thể.
- Các chỉ số như completion, match, risk, roadmap progress được hiển thị bằng metric/progress.
- Trang sinh viên ưu tiên thao tác nhanh: cập nhật hồ sơ, upload minh chứng, chạy phân tích, cập nhật roadmap.

## 14.2. Sitemap

```mermaid
flowchart TD
    Login["/login"] --> Role{"Vai trò"}
    Role --> Admin["/admin/dashboard"]
    Role --> Lecturer["/lecturer/dashboard"]
    Role --> Student["/student/dashboard"]

    Admin --> A1["Users"]
    Admin --> A2["Students"]
    Admin --> A3["Lecturers"]
    Admin --> A4["Skill Categories"]
    Admin --> A5["Skills"]
    Admin --> A6["Specializations"]
    Admin --> A7["Career Goals"]
    Admin --> A8["Recommendation Templates"]
    Admin --> A9["Advisor Assignments"]
    Admin --> A10["Reports"]

    Lecturer --> L1["Students"]
    Lecturer --> L2["Evidences"]
    Lecturer --> L3["Reviews"]
    Lecturer --> L4["Reports"]

    Student --> S1["Profile"]
    Student --> S2["Skills"]
    Student --> S3["Projects"]
    Student --> S4["Certificates"]
    Student --> S5["Activities"]
    Student --> S6["Experiences"]
    Student --> S7["Evidences"]
    Student --> S8["Analysis"]
    Student --> S9["Recommendations"]
    Student --> S10["Roadmap"]
    Student --> S11["Portfolio"]
    Student --> S12["Notifications"]
```

## 14.3. Màn Hình Chính Theo Vai Trò

| Vai trò | Màn hình | Nội dung chính |
| --- | --- | --- |
| Admin | Dashboard | Tổng số người dùng, sinh viên, giảng viên, career goals, hồ sơ rủi ro |
| Admin | Skill Categories/Skills | Bảng danh mục, form thêm/sửa, trạng thái active/inactive |
| Admin | Specializations | CRUD chuyên ngành/domain và trạng thái active/inactive |
| Admin | Career Goals | CRUD career goal, required skills và mapping chuyên ngành |
| Admin | Recommendation Templates | Cấu hình mẫu gợi ý theo chuyên ngành, career goal, nhóm kỹ năng và kỹ năng |
| Admin | Advisor Assignments | Phân công cố vấn cho sinh viên |
| Lecturer | Dashboard | Sinh viên phụ trách, pending evidences, cảnh báo hồ sơ yếu |
| Lecturer | Students | Danh sách sinh viên được phụ trách, liên kết xem profile |
| Lecturer | Evidences | Hàng đợi duyệt, thao tác verify/reject |
| Student | Dashboard | Completion, match, risk, roadmap progress, thông báo mới |
| Student | Profile | Thông tin cá nhân, chuyên ngành, career goal, link GitHub/LinkedIn/portfolio |
| Student | Skills/Projects/Certificates/Activities/Experiences | CRUD dữ liệu năng lực |
| Student | Analysis | Kết quả phân tích, missing skills, match level |
| Student | Recommendations | Gợi ý và trạng thái thực hiện |
| Student | Roadmap | Danh sách item theo thứ tự, cập nhật tiến độ |
| Student | Portfolio | Tổng hợp thông tin để xuất PDF |

---

# 15. Thiết Kế Bảo Mật

## 15.1. Xác Thực

- Đăng nhập bằng email và mật khẩu.
- Mật khẩu so sánh bằng bcrypt.
- Access token dùng cho request cần xác thực.
- Refresh token dùng để xin access token mới.
- Refresh token hash được lưu trong database để có thể thu hồi khi logout.

## 15.2. Phân Quyền

- Backend phân quyền bằng role guard.
- Frontend bảo vệ route bằng `ProtectedRoute`.
- Backend là lớp quyết định cuối cùng, frontend chỉ hỗ trợ trải nghiệm người dùng.

## 15.3. Bảo Vệ Payload Và Upload

- DTO validate dữ liệu đầu vào.
- `whitelist` loại bỏ field không được khai báo.
- `forbidNonWhitelisted` chặn payload có field lạ.
- Upload sử dụng `FileInterceptor` và upload options riêng cho profile/evidence.
- Môi trường production cần giới hạn file size, MIME type và thư mục lưu trữ.

## 15.4. Bảo Vệ Dữ Liệu Cá Nhân

- Không trả về `passwordHash` và `refreshTokenHash` qua API.
- Chỉ người có quyền mới xem dữ liệu sinh viên.
- Nên log thao tác quan trọng vào `activity_logs`.
- Cần có chính sách backup và restore database.

---

# 16. Kiểm Thử

## 16.1. Chiến Lược Kiểm Thử

| Loại kiểm thử | Mục tiêu |
| --- | --- |
| Unit test | Kiểm thử engine phân tích, tính điểm, risk score, roadmap builder |
| Service test | Kiểm thử logic CRUD, ownership, role access, transaction |
| API integration test | Kiểm thử endpoint auth, profile, evidence, analysis, roadmap |
| UI test | Kiểm thử điều hướng theo vai trò và workflow chính |
| Security test | Kiểm thử truy cập sai vai trò, token hết hạn, payload sai |
| UAT | Kiểm thử theo kịch bản người dùng thực tế |

## 16.2. Test Case Mẫu

| Mã | Kịch bản | Kết quả mong đợi |
| --- | --- | --- |
| TC-AUTH-01 | Đăng nhập đúng tài khoản active | Trả về token và user |
| TC-AUTH-02 | Đăng nhập sai mật khẩu | Trả về 401 |
| TC-AUTH-03 | Tài khoản locked đăng nhập | Trả về 403 |
| TC-PROFILE-01 | Sinh viên cập nhật career goal | Profile lưu career goal mới |
| TC-SKILL-01 | Sinh viên thêm kỹ năng hợp lệ | Tạo student skill |
| TC-SKILL-02 | Sinh viên thêm trùng kỹ năng | Bị chặn theo unique/business rule |
| TC-EVID-01 | Upload minh chứng cho project | Evidence có status `PENDING` |
| TC-EVID-02 | Giảng viên verify minh chứng | Evidence thành `VERIFIED`, sinh viên nhận thông báo |
| TC-EVID-03 | Giảng viên reject minh chứng | Evidence thành `REJECTED`, lưu reviewer note |
| TC-ANALYSIS-01 | Phân tích với đầy đủ required skills | Tạo result và details đúng công thức |
| TC-ANALYSIS-02 | Chưa chọn career goal | Trả lỗi nghiệp vụ phù hợp |
| TC-ROAD-01 | Sinh roadmap từ missing skills | Items sắp xếp theo learning order và priority |
| TC-ROAD-02 | Cập nhật item `DONE` | Roadmap progress được tính lại |
| TC-NOTI-01 | Đánh dấu thông báo đã đọc | `isRead` thành true |

## 16.3. Tiêu Chí Nghiệm Thu

Hệ thống đạt nghiệm thu khi:

- Người dùng đăng nhập và được điều hướng đúng vai trò.
- Admin quản lý được danh mục kỹ năng và career goal.
- Sinh viên cập nhật được profile và dữ liệu năng lực.
- Sinh viên upload được minh chứng.
- Giảng viên/cố vấn duyệt và từ chối được minh chứng.
- Hệ thống phân tích đúng công thức và lưu lịch sử.
- Sinh viên xem được missing skills, recommendations và roadmap.
- Dashboard mỗi vai trò hiển thị số liệu đúng.
- Endpoint cần bảo mật không truy cập được khi thiếu token hoặc sai role.

---

# 17. Triển Khai Và Vận Hành

## 17.1. Môi Trường

| Thành phần | Giá trị đề xuất |
| --- | --- |
| Node.js | Phiên bản tương thích Next.js 15 và NestJS 11 |
| Database | PostgreSQL |
| Backend port | `4000` |
| Frontend port | `3000` |
| API base URL | `http://localhost:4000/api` |

## 17.2. Biến Môi Trường

Backend:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/student_system"
JWT_ACCESS_SECRET="change-me"
JWT_REFRESH_SECRET="change-me"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
```

Frontend:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api"
```

## 17.3. Lệnh Chạy Phát Triển

Backend:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:validate
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## 17.4. Migration Và Backup

- Migration database được quản lý qua Prisma.
- Trước khi deploy, cần validate schema và chạy migration trên staging.
- Backup PostgreSQL nên chạy định kỳ hằng ngày.
- Cần có quy trình restore thử nghiệm để đảm bảo backup dùng được.

## 17.5. Monitoring Và Logging

- Backend log request qua middleware.
- Lỗi server được log trong exception filter.
- Nên bổ sung request id/correlation id khi đưa lên production.
- Nên theo dõi tỷ lệ lỗi 4xx/5xx, thời gian phản hồi API, dung lượng upload và số job scheduler thất bại.

---

# 18. Rủi Ro Và Phương Án Xử Lý

| Rủi ro | Ảnh hưởng | Phương án |
| --- | --- | --- |
| Sinh viên khai báo kỹ năng không trung thực | Kết quả phân tích sai | Dùng minh chứng và trạng thái xác thực |
| Career goal cấu hình trọng số không hợp lý | Match percent thiếu ý nghĩa | Admin cần chuẩn hóa bộ required skills và weight |
| Recommendation quá chung chung | Sinh viên nhận gợi ý chưa sát chuyên ngành | Dùng specialization-aware template và fallback theo career goal, skill category, skill |
| Dữ liệu upload quá lớn | Tốn dung lượng và chậm hệ thống | Giới hạn file size, MIME type, dùng object storage khi production |
| Phân quyền giảng viên chưa chặt | Lộ dữ liệu sinh viên | Kiểm tra advisor assignment trong service |
| Thiếu dữ liệu mẫu | Dashboard và phân tích khó đánh giá | Seed dữ liệu mẫu cho skills, career goals, templates |
| Scheduler tạo thông báo trùng lặp | Gây nhiều thông báo | Dùng cơ chế `createOnce` và dedup window |
| Báo cáo PDF/Excel chưa hoàn thiện | Thiếu tính năng xuất file | Ưu tiên module exports trong giai đoạn sau |

---

# 19. Đánh Giá Hiện Trạng Codebase

## 19.1. Phần Đã Có

- Backend NestJS đã cấu hình global prefix `/api`, Swagger, validation pipe, CORS, exception filter, response interceptor.
- Đã có auth với login, refresh, logout, profile, change password.
- Đã có guard JWT và role guard.
- Đã có Prisma schema đầy đủ cho identity, skills, career goals, profile, evidence, analysis, recommendation, roadmap, notification, audit/export.
- Đã có module CRUD cho skill categories, skills, career goals, required skills, advisor assignments.
- Đã có profile API cho sinh viên và API xem profile theo studentId cho admin/lecturer.
- Đã có evidence API upload, pending queue, verify, reject.
- Đã có competency analysis engine dùng rule-based.
- Đã có recommendation và roadmap API.
- Tài liệu thiết kế đã bổ sung hướng specialization-aware recommendation template và fallback nhiều tầng.
- Đã có notification scheduler cho profile reminder, missing career goal, rejected evidence, overdue roadmap item, weak profile.
- Đã có frontend route và menu theo vai trò với Ant Design.

## 19.2. Phần Cần Hoàn Thiện Tiếp

- CRUD đầy đủ cho module `students` và `lecturers`.
- Import Excel danh sách sinh viên/giảng viên.
- Module `exports` cho portfolio PDF và báo cáo Excel.
- Ghi `activity_logs` cho các thao tác quan trọng.
- UI chi tiết cho nhận xét cố vấn nếu cần tách thành module riêng.
- Bộ seed dữ liệu mẫu cho specializations, career goals, required skills và recommendation templates.
- Triển khai code cho module `specializations`, `recommendation-templates` và logic chọn template theo fallback nhiều tầng.
- Test tự động cho engine, service và API.
- Kiểm tra chặt hơn quyền lecturer chỉ xem sinh viên được phân công.

---

# 20. Hướng Phát Triển

- Bổ sung module export PDF/Excel hoàn chỉnh.
- Bổ sung import dữ liệu từ Excel.
- Hoàn thiện recommendation template thành bộ mẫu theo chuyên ngành, bắt đầu từ nhóm chuyên ngành trọng tâm rồi mở rộng dần theo dữ liệu thực tế.
- Bổ sung lịch sử thay đổi profile và lịch sử duyệt minh chứng.
- Thêm dashboard so sánh theo lớp, khoa, ngành, năm học.
- Thêm rubric đánh giá minh chứng.
- Thêm tích hợp email notification.
- Khi dữ liệu lớn hơn, có thể bổ sung PostgreSQL trigram/full-text search.
- Khi cần cá nhân hóa sâu hơn, có thể bổ sung ML recommendation nhưng vẫn giữ rule-based để giải thích kết quả.

---

# 21. Kết Luận

Hệ thống **Student Digital Competency Profile & Personal Development Roadmap** giải quyết bài toán quản lý năng lực sinh viên theo hướng tập trung, có minh chứng, có tiêu chí đánh giá và có lộ trình phát triển cá nhân. Kiến trúc modular monolith với Next.js, NestJS, Prisma và PostgreSQL phù hợp với quy mô đồ án, dễ triển khai, dễ bảo trì và có khả năng mở rộng.

Điểm mạnh của hệ thống là kết hợp giữa hồ sơ năng lực số, xác thực minh chứng, phân tích rule-based và roadmap cá nhân hóa. Thiết kế này giúp sinh viên hiểu rõ khoảng cách năng lực của mình, giảng viên/cố vấn có công cụ theo dõi, còn khoa/trường có cơ sở dữ liệu để đánh giá năng lực đầu ra.
