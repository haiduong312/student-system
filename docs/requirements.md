# PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## Tên đề tài

**Xây dựng hệ thống hồ sơ năng lực số và gợi ý lộ trình phát triển cá nhân cho sinh viên**

---

# 1. Tổng quan đề tài

## 1.1. Lý do chọn đề tài

Trong quá trình học tập tại trường đại học, sinh viên thường được quản lý chủ yếu thông qua điểm số, học phần, lịch học hoặc kết quả học tập. Tuy nhiên, các thông tin này chưa phản ánh đầy đủ năng lực thực tế của sinh viên, đặc biệt là các kỹ năng chuyên môn, kỹ năng mềm, dự án đã thực hiện, chứng chỉ đã đạt được, kinh nghiệm thực tập, hoạt động ngoại khóa và định hướng nghề nghiệp.

Nhiều sinh viên không biết bản thân đang mạnh ở điểm nào, còn thiếu kỹ năng gì, cần học gì tiếp theo để đạt được mục tiêu nghề nghiệp. Giảng viên/cố vấn học tập cũng khó theo dõi năng lực thực tế của từng sinh viên nếu dữ liệu bị phân tán ở nhiều nơi như CV cá nhân, GitHub, chứng chỉ, file báo cáo hoặc các hoạt động riêng lẻ.

Vì vậy, đề tài **“Xây dựng hệ thống hồ sơ năng lực số và gợi ý lộ trình phát triển cá nhân cho sinh viên”** được đề xuất nhằm hỗ trợ sinh viên xây dựng hồ sơ năng lực tập trung, giúp giảng viên/cố vấn theo dõi quá trình phát triển của sinh viên và giúp hệ thống tự động gợi ý lộ trình phát triển phù hợp dựa trên mục tiêu nghề nghiệp của từng sinh viên.

---

## 1.2. Mục tiêu hệ thống

Hệ thống được xây dựng nhằm đạt các mục tiêu sau:

- Quản lý hồ sơ năng lực số của sinh viên.
- Cho phép sinh viên cập nhật kỹ năng, dự án, chứng chỉ, hoạt động, kinh nghiệm và minh chứng.
- Cho phép sinh viên lựa chọn mục tiêu nghề nghiệp mong muốn.
- Cho phép giảng viên/cố vấn học tập theo dõi, nhận xét và xác nhận minh chứng trong hồ sơ sinh viên.
- Cho phép admin quản lý danh mục kỹ năng, nhóm kỹ năng, mục tiêu nghề nghiệp và bộ tiêu chí đánh giá.
- Tự động tính mức độ hoàn thiện hồ sơ của sinh viên.
- Tự động tính mức độ phù hợp giữa năng lực hiện tại của sinh viên và mục tiêu nghề nghiệp.
- Tự động xác định kỹ năng còn thiếu.
- Tự động gợi ý kỹ năng cần cải thiện, dự án nên làm và lộ trình phát triển cá nhân.
- Tự động cảnh báo sinh viên có hồ sơ yếu hoặc lâu chưa cập nhật hồ sơ.
- Cung cấp dashboard thống kê cho admin, giảng viên/cố vấn và sinh viên.
- Cho phép sinh viên xuất portfolio cá nhân dạng PDF.
- Cho phép admin hoặc giảng viên xuất báo cáo Excel phục vụ công tác quản lý.

---

## 1.3. Phạm vi hệ thống

Hệ thống tập trung vào việc quản lý và phân tích hồ sơ năng lực của sinh viên trong phạm vi khoa/trường.

Các chức năng chính gồm:

- Quản lý người dùng.
- Quản lý sinh viên.
- Quản lý giảng viên/cố vấn học tập.
- Quản lý danh mục kỹ năng.
- Quản lý nhóm kỹ năng.
- Quản lý mục tiêu nghề nghiệp.
- Quản lý bộ kỹ năng yêu cầu cho từng mục tiêu nghề nghiệp.
- Quản lý hồ sơ năng lực sinh viên.
- Quản lý dự án, chứng chỉ, hoạt động và kinh nghiệm của sinh viên.
- Quản lý minh chứng.
- Phân tích năng lực sinh viên.
- Gợi ý lộ trình phát triển cá nhân.
- Theo dõi tiến độ thực hiện lộ trình.
- Nhận xét và xác nhận minh chứng bởi giảng viên/cố vấn.
- Gửi thông báo tự động.
- Dashboard thống kê.
- Xuất portfolio PDF.
- Xuất báo cáo Excel.

Hệ thống không tập trung vào:

- Quản lý điểm số học phần.
- Quản lý đăng ký học phần.
- Quản lý học phí.
- Quản lý thời khóa biểu toàn trường.
- Tuyển dụng trực tiếp giữa doanh nghiệp và sinh viên.
- Sử dụng Machine Learning phức tạp.

Trong phạm vi đồ án, hệ thống gợi ý được xây dựng theo phương pháp **Rule-based Recommendation System**, tức là gợi ý dựa trên các luật, tiêu chí và trọng số được cấu hình sẵn.

---

# 2. Đối tượng sử dụng hệ thống

Hệ thống gồm 3 nhóm người dùng chính:

- Admin/Cán bộ khoa.
- Giảng viên/Cố vấn học tập.
- Sinh viên.

---

## 2.1. Admin / Cán bộ khoa

Admin là người quản lý dữ liệu nền tảng và cấu hình các tiêu chí đánh giá năng lực trong hệ thống.

### Chức năng của Admin

- Đăng nhập hệ thống.
- Quản lý tài khoản sinh viên.
- Quản lý tài khoản giảng viên/cố vấn.
- Quản lý danh mục ngành/lớp nếu cần.
- Quản lý danh mục chuyên ngành/hướng chuyên sâu.
- Quản lý danh mục nhóm kỹ năng.
- Quản lý danh mục kỹ năng.
- Quản lý mục tiêu nghề nghiệp.
- Liên kết mục tiêu nghề nghiệp với chuyên ngành phù hợp.
- Cấu hình kỹ năng yêu cầu cho từng mục tiêu nghề nghiệp.
- Cấu hình trọng số của từng kỹ năng.
- Cấu hình mức độ yêu cầu của từng kỹ năng.
- Cấu hình mẫu gợi ý học tập/dự án/chứng chỉ theo kỹ năng, nhóm kỹ năng, mục tiêu nghề nghiệp hoặc chuyên ngành.
- Quản lý danh sách sinh viên theo lớp/ngành.
- Phân công cố vấn học tập cho sinh viên.
- Theo dõi thống kê hồ sơ năng lực toàn khoa.
- Xem danh sách sinh viên có hồ sơ chưa hoàn thiện.
- Xem danh sách sinh viên có nguy cơ không đạt chuẩn năng lực.
- Xuất báo cáo Excel.
- Theo dõi lịch sử thao tác hệ thống.

---

## 2.2. Giảng viên / Cố vấn học tập

Giảng viên/cố vấn là người theo dõi, nhận xét và hỗ trợ sinh viên trong quá trình phát triển năng lực cá nhân.

### Chức năng của Giảng viên/Cố vấn

- Đăng nhập hệ thống.
- Xem danh sách sinh viên được phân công phụ trách.
- Xem hồ sơ năng lực của từng sinh viên.
- Xem kỹ năng sinh viên đã khai báo.
- Xem dự án, chứng chỉ, hoạt động và kinh nghiệm của sinh viên.
- Xem minh chứng sinh viên đã tải lên.
- Xác nhận hoặc từ chối minh chứng.
- Nhận xét hồ sơ năng lực của sinh viên.
- Gợi ý sinh viên bổ sung kỹ năng hoặc dự án.
- Xem kết quả phân tích năng lực của sinh viên.
- Xem mức độ phù hợp nghề nghiệp của sinh viên.
- Xem lộ trình phát triển được hệ thống gợi ý.
- Theo dõi tiến độ thực hiện lộ trình của sinh viên.
- Xem danh sách sinh viên có hồ sơ yếu.
- Xem dashboard thống kê nhóm sinh viên phụ trách.
- Xuất báo cáo sinh viên phụ trách.

---

## 2.3. Sinh viên

Sinh viên là người xây dựng hồ sơ năng lực cá nhân và sử dụng các gợi ý của hệ thống để phát triển bản thân.

### Chức năng của Sinh viên

- Đăng nhập hệ thống.
- Cập nhật thông tin hồ sơ cá nhân.
- Chọn mục tiêu nghề nghiệp.
- Cập nhật kỹ năng chuyên môn.
- Cập nhật kỹ năng mềm.
- Thêm dự án cá nhân hoặc dự án nhóm.
- Thêm chứng chỉ đã đạt được.
- Thêm hoạt động ngoại khóa.
- Thêm kinh nghiệm thực tập/làm việc.
- Upload minh chứng cho kỹ năng, dự án, chứng chỉ hoặc hoạt động.
- Xem mức độ hoàn thiện hồ sơ.
- Xem mức độ phù hợp với mục tiêu nghề nghiệp.
- Xem kỹ năng còn thiếu.
- Xem gợi ý học tập.
- Xem gợi ý dự án nên làm.
- Xem lộ trình phát triển cá nhân.
- Cập nhật tiến độ thực hiện lộ trình.
- Xem nhận xét từ giảng viên/cố vấn.
- Nhận thông báo nhắc cập nhật hồ sơ.
- Nhận thông báo khi minh chứng được xác nhận hoặc bị từ chối.
- Xuất portfolio cá nhân dạng PDF.

---

# 3. Yêu cầu chức năng

## 3.1. Nhóm chức năng xác thực và phân quyền

### Mục đích

Đảm bảo người dùng đăng nhập đúng tài khoản và chỉ được truy cập các chức năng phù hợp với vai trò của mình.

### Chức năng

- Đăng nhập.
- Đăng xuất.
- Đổi mật khẩu.
- Quản lý phiên đăng nhập.
- Phân quyền theo vai trò:
    - Admin.
    - Giảng viên/Cố vấn.
    - Sinh viên.

### Quy tắc

- Người dùng chưa đăng nhập không được truy cập hệ thống.
- Sinh viên chỉ được chỉnh sửa hồ sơ của chính mình.
- Giảng viên/cố vấn chỉ được xem sinh viên mình phụ trách.
- Admin có quyền quản lý toàn bộ dữ liệu hệ thống.
- Mật khẩu phải được mã hóa trước khi lưu vào cơ sở dữ liệu.

---

## 3.2. Nhóm chức năng quản lý người dùng

### Admin có thể:

- Thêm tài khoản sinh viên.
- Thêm tài khoản giảng viên/cố vấn.
- Cập nhật thông tin người dùng.
- Khóa/mở khóa tài khoản.
- Import danh sách sinh viên từ Excel.
- Import danh sách giảng viên từ Excel.
- Tìm kiếm và lọc người dùng theo vai trò, lớp, ngành, trạng thái.

---

## 3.3. Nhóm chức năng quản lý danh mục kỹ năng

### Admin có thể:

- Thêm nhóm kỹ năng.
- Cập nhật nhóm kỹ năng.
- Xóa nhóm kỹ năng nếu chưa được sử dụng.
- Thêm kỹ năng.
- Cập nhật kỹ năng.
- Phân loại kỹ năng theo nhóm.

### Ví dụ nhóm kỹ năng

- Frontend.
- Backend.
- Database.
- DevOps.
- Data Analysis.
- UI/UX.
- Soft Skills.
- Tools.

### Ví dụ kỹ năng

- HTML/CSS.
- JavaScript.
- TypeScript.
- React.
- Next.js.
- Node.js.
- NestJS.
- SQL.
- Git.
- Docker.
- Communication.
- Teamwork.

---

## 3.4. Nhóm chức năng quản lý mục tiêu nghề nghiệp

### Admin có thể:

- Thêm mục tiêu nghề nghiệp.
- Cập nhật mục tiêu nghề nghiệp.
- Xóa mục tiêu nghề nghiệp nếu chưa sử dụng.
- Cấu hình kỹ năng yêu cầu cho từng mục tiêu nghề nghiệp.
- Cấu hình mức độ yêu cầu cho từng kỹ năng.
- Cấu hình trọng số của kỹ năng.
- Cấu hình thứ tự học tập.

### Ví dụ mục tiêu nghề nghiệp

- Front-end Developer.
- Back-end Developer.
- Full-stack Developer.
- Mobile Developer.
- Data Analyst.
- UI/UX Designer.
- QA Tester.
- DevOps Engineer.

---

## 3.5. Nhóm chức năng hồ sơ năng lực sinh viên

Sinh viên có thể quản lý hồ sơ năng lực cá nhân gồm:

- Thông tin cá nhân.
- Mục tiêu nghề nghiệp.
- Kỹ năng.
- Dự án.
- Chứng chỉ.
- Hoạt động ngoại khóa.
- Kinh nghiệm thực tập/làm việc.
- Minh chứng.
- Link GitHub.
- Link demo.
- Link portfolio cá nhân nếu có.

---

## 3.6. Nhóm chức năng quản lý kỹ năng sinh viên

Sinh viên có thể:

- Thêm kỹ năng vào hồ sơ.
- Chọn mức độ hiện tại của kỹ năng.
- Upload minh chứng nếu có.
- Cập nhật mức độ kỹ năng.
- Xóa kỹ năng khỏi hồ sơ nếu nhập sai.

### Mức độ kỹ năng

| Mức độ    | Giá trị |
| --------- | ------- |
| Chưa biết | 0       |
| Cơ bản    | 1       |
| Khá       | 2       |
| Tốt       | 3       |

---

## 3.7. Nhóm chức năng quản lý dự án

Sinh viên có thể thêm các dự án đã thực hiện.

### Thông tin dự án gồm:

- Tên dự án.
- Mô tả dự án.
- Vai trò trong dự án.
- Công nghệ sử dụng.
- Link GitHub.
- Link demo.
- Thời gian thực hiện.
- File minh chứng nếu có.
- Trạng thái xác nhận.

### Trạng thái xác nhận

- Chưa có minh chứng.
- Chờ xác nhận.
- Đã xác nhận.
- Bị từ chối.

---

## 3.8. Nhóm chức năng quản lý chứng chỉ

Sinh viên có thể thêm chứng chỉ đã đạt được.

### Thông tin chứng chỉ gồm:

- Tên chứng chỉ.
- Đơn vị cấp.
- Ngày cấp.
- Ngày hết hạn nếu có.
- Mã chứng chỉ nếu có.
- File chứng chỉ.
- Link xác thực chứng chỉ nếu có.
- Trạng thái xác nhận.

---

## 3.9. Nhóm chức năng quản lý hoạt động và kinh nghiệm

Sinh viên có thể cập nhật:

- Hoạt động ngoại khóa.
- Câu lạc bộ.
- Cuộc thi.
- Workshop.
- Kinh nghiệm thực tập.
- Kinh nghiệm làm việc part-time/freelance.
- Vai trò đảm nhiệm.
- Thời gian tham gia.
- Minh chứng nếu có.

---

## 3.10. Nhóm chức năng xác nhận minh chứng

Giảng viên/cố vấn có thể kiểm tra minh chứng sinh viên đã tải lên.

### Chức năng

- Xem danh sách minh chứng chờ xác nhận.
- Xem file minh chứng.
- Xác nhận minh chứng hợp lệ.
- Từ chối minh chứng không hợp lệ.
- Ghi chú lý do từ chối.
- Gửi phản hồi cho sinh viên.

### Quy tắc

- Minh chứng đã xác nhận giúp tăng độ tin cậy của hồ sơ.
- Minh chứng bị từ chối không được tính vào độ tin cậy hồ sơ.
- Sinh viên có thể cập nhật lại minh chứng sau khi bị từ chối.

---

# 4. Chức năng tự động của hệ thống

## 4.1. Tự động tính mức độ hoàn thiện hồ sơ

### Mục đích

Đánh giá hồ sơ sinh viên đã đầy đủ đến mức nào.

### Tiêu chí tính

| Thành phần hồ sơ      | Trọng số |
| --------------------- | -------- |
| Thông tin cá nhân     | 10%      |
| Mục tiêu nghề nghiệp  | 15%      |
| Kỹ năng chuyên môn    | 20%      |
| Dự án                 | 20%      |
| Chứng chỉ             | 10%      |
| Hoạt động/Kinh nghiệm | 10%      |
| Minh chứng            | 15%      |

### Công thức

Mức độ hoàn thiện hồ sơ được tính bằng tổng trọng số của các thành phần đã hoàn thành.

Ví dụ:

Sinh viên có thông tin cá nhân, mục tiêu nghề nghiệp, kỹ năng, dự án và minh chứng nhưng chưa có chứng chỉ, hoạt động/kinh nghiệm.

Kết quả:

10% + 15% + 20% + 20% + 15% = 80%

### Phân loại

| Tỷ lệ hoàn thiện | Trạng thái                 |
| ---------------- | -------------------------- |
| Dưới 50%         | Hồ sơ chưa đầy đủ          |
| 50% - dưới 80%   | Hồ sơ cần bổ sung          |
| Từ 80% trở lên   | Hồ sơ tương đối hoàn thiện |

---

## 4.2. Tự động tính mức độ phù hợp với mục tiêu nghề nghiệp

### Mục đích

Đánh giá năng lực hiện tại của sinh viên phù hợp bao nhiêu phần trăm với mục tiêu nghề nghiệp đã chọn.

### Dữ liệu đầu vào

- Mục tiêu nghề nghiệp của sinh viên.
- Bộ kỹ năng yêu cầu của mục tiêu nghề nghiệp.
- Mức độ yêu cầu của từng kỹ năng.
- Trọng số của từng kỹ năng.
- Mức độ kỹ năng hiện tại của sinh viên.

### Công thức

Điểm đạt được của từng kỹ năng:

```
Điểm kỹ năng = min(Mức hiện tại / Mức yêu cầu, 1) × Trọng số
```

Mức độ phù hợp nghề nghiệp:

```
Mức độ phù hợp = Tổng điểm kỹ năng đạt được / Tổng trọng số × 100%
```

### Phân loại

| Mức độ phù hợp | Trạng thái      |
| -------------- | --------------- |
| Dưới 40%       | Chưa phù hợp    |
| 40% - dưới 70% | Đang phát triển |
| 70% - dưới 85% | Khá phù hợp     |
| Từ 85% trở lên | Phù hợp tốt     |

---

## 4.3. Tự động xác định kỹ năng còn thiếu

### Điều kiện xác định

Một kỹ năng được xem là còn thiếu nếu:

```
Mức hiện tại < Mức yêu cầu
```

### Công thức tính khoảng cách thiếu hụt

```
Khoảng cách thiếu hụt = Mức yêu cầu - Mức hiện tại
```

### Công thức tính điểm ưu tiên

```
Điểm ưu tiên = Khoảng cách thiếu hụt × Trọng số kỹ năng
```

Kỹ năng có điểm ưu tiên càng cao thì càng cần được cải thiện trước.

---

## 4.4. Tự động gợi ý học tập, dự án và chứng chỉ

Hệ thống dựa trên danh sách kỹ năng còn thiếu để gợi ý:

- Khóa học nên học.
- Tài liệu nên xem.
- Dự án nên làm.
- Chứng chỉ nên bổ sung.
- Kỹ năng nên luyện tập.

### Ngữ cảnh gợi ý

Để tránh việc gợi ý quá chung chung cho toàn bộ ngành Công nghệ thông tin, hệ thống cần hỗ trợ gợi ý theo nhiều tầng ngữ cảnh:

- Kỹ năng nền tảng dùng chung cho nhiều hướng nghề nghiệp.
- Mục tiêu nghề nghiệp sinh viên đã chọn.
- Chuyên ngành hoặc hướng chuyên sâu của sinh viên nếu có.
- Nhóm kỹ năng nếu chưa có mẫu gợi ý cụ thể cho từng kỹ năng.

Admin không bắt buộc phải nhập đầy đủ mẫu gợi ý cho tất cả domain trong ngành Công nghệ thông tin. Hệ thống phải có cơ chế fallback để vẫn sinh được gợi ý khi dữ liệu template chưa đầy đủ.

### Quy tắc gợi ý

Ví dụ:

- Nếu thiếu TypeScript → gợi ý học TypeScript cơ bản.
- Nếu thiếu React → gợi ý làm project React gọi API.
- Nếu thiếu Next.js → gợi ý học Next.js App Router.
- Nếu thiếu Testing → gợi ý viết unit test cho component.
- Nếu thiếu Git → gợi ý học Git/GitHub workflow.

### Thứ tự tìm mẫu gợi ý

Khi sinh gợi ý cho một kỹ năng còn thiếu, hệ thống tìm mẫu theo thứ tự ưu tiên:

1. Mẫu khớp chuyên ngành + mục tiêu nghề nghiệp + kỹ năng.
2. Mẫu khớp chuyên ngành + kỹ năng.
3. Mẫu khớp mục tiêu nghề nghiệp + kỹ năng.
4. Mẫu khớp nhóm kỹ năng + kỹ năng.
5. Mẫu khớp kỹ năng chung.
6. Nếu không có mẫu phù hợp, hệ thống tự sinh gợi ý mặc định từ tên kỹ năng và khoảng cách thiếu hụt.

Ví dụ cùng là kỹ năng Python:

- Data Analyst → gợi ý học Python với Pandas, trực quan hóa dữ liệu và notebook phân tích.
- Backend Developer → gợi ý xây REST API với FastAPI hoặc Django.
- QA Automation → gợi ý viết automation script với Selenium hoặc Playwright.

---

## 4.5. Tự động sinh lộ trình phát triển cá nhân

Hệ thống sắp xếp các gợi ý thành một lộ trình có thứ tự.

### Căn cứ sắp xếp

- Thứ tự học tập của kỹ năng.
- Mức độ quan trọng của kỹ năng.
- Khoảng cách thiếu hụt.
- Kỹ năng nền tảng phải học trước kỹ năng nâng cao.

### Ví dụ thứ tự

Đối với mục tiêu Front-end Developer:

1. HTML/CSS.
2. JavaScript.
3. TypeScript.
4. React.
5. Next.js.
6. REST API.
7. Testing.
8. Deployment.
9. Portfolio.

---

## 4.6. Tự động tính tiến độ lộ trình

### Công thức

```
Tiến độ lộ trình = Tổng trọng số nhiệm vụ đã hoàn thành / Tổng trọng số toàn bộ nhiệm vụ × 100%
```

### Trạng thái

| Tiến độ         | Trạng thái     |
| --------------- | -------------- |
| Dưới 30%        | Tiến độ thấp   |
| 30% - dưới 70%  | Đang thực hiện |
| 70% - dưới 100% | Tiến độ tốt    |
| 100%            | Hoàn thành     |

---

## 4.7. Tự động cảnh báo hồ sơ yếu

Hệ thống cảnh báo sinh viên có hồ sơ yếu nếu thỏa một trong các điều kiện:

- Mức độ hoàn thiện hồ sơ dưới 50%.
- Mức độ phù hợp nghề nghiệp dưới 40%.
- Sinh viên chưa chọn mục tiêu nghề nghiệp.
- Sinh viên chưa có dự án nào.
- Sinh viên lâu chưa cập nhật hồ sơ.
- Sinh viên có nhiều kỹ năng thiếu minh chứng.

### Cách tính điểm rủi ro

| Tiêu chí                           | Điểm rủi ro |
| ---------------------------------- | ----------- |
| Hồ sơ hoàn thiện dưới 50%          | +25         |
| Phù hợp nghề nghiệp dưới 40%       | +25         |
| Chưa có dự án                      | +20         |
| Chưa có mục tiêu nghề nghiệp       | +15         |
| Không cập nhật hồ sơ trong 60 ngày | +15         |

### Phân loại

| Điểm rủi ro | Mức cảnh báo  |
| ----------- | ------------- |
| 0 - 29      | Bình thường   |
| 30 - 59     | Cần cải thiện |
| 60 - 79     | Cần chú ý     |
| 80 - 100    | Nguy cơ cao   |

---

## 4.8. Tự động nhắc sinh viên cập nhật hồ sơ

Hệ thống gửi thông báo nếu:

- Sinh viên chưa cập nhật hồ sơ trong 30 ngày.
- Sinh viên chưa chọn mục tiêu nghề nghiệp.
- Sinh viên có kỹ năng chưa có minh chứng.
- Sinh viên có dự án/chứng chỉ bị từ chối minh chứng.
- Sinh viên chưa cập nhật tiến độ lộ trình.

---

# 5. Quy trình nghiệp vụ chính

## 5.1. Luồng 1: Admin cấu hình dữ liệu nền tảng

1. Admin đăng nhập hệ thống.
2. Admin tạo danh mục nhóm kỹ năng.
3. Admin tạo danh mục kỹ năng.
4. Admin tạo danh mục mục tiêu nghề nghiệp.
5. Admin cấu hình kỹ năng yêu cầu cho từng mục tiêu nghề nghiệp.
6. Admin thiết lập mức độ yêu cầu, trọng số và thứ tự học tập.
7. Admin cấu hình mẫu gợi ý học tập/dự án/chứng chỉ.
8. Hệ thống lưu dữ liệu cấu hình.

---

## 5.2. Luồng 2: Sinh viên xây dựng hồ sơ năng lực

1. Sinh viên đăng nhập hệ thống.
2. Sinh viên cập nhật thông tin cá nhân.
3. Sinh viên chọn mục tiêu nghề nghiệp.
4. Sinh viên thêm kỹ năng hiện có.
5. Sinh viên cập nhật mức độ từng kỹ năng.
6. Sinh viên thêm dự án đã thực hiện.
7. Sinh viên thêm chứng chỉ nếu có.
8. Sinh viên thêm hoạt động/kinh nghiệm nếu có.
9. Sinh viên upload minh chứng.
10. Hệ thống tính mức độ hoàn thiện hồ sơ.

---

## 5.3. Luồng 3: Hệ thống phân tích năng lực và gợi ý lộ trình

1. Sinh viên chọn chức năng phân tích hồ sơ.
2. Hệ thống lấy mục tiêu nghề nghiệp của sinh viên.
3. Hệ thống lấy bộ kỹ năng yêu cầu của mục tiêu nghề nghiệp.
4. Hệ thống lấy kỹ năng hiện tại của sinh viên.
5. Hệ thống tính mức độ phù hợp nghề nghiệp.
6. Hệ thống xác định kỹ năng còn thiếu.
7. Hệ thống tính điểm ưu tiên cho kỹ năng còn thiếu.
8. Hệ thống lấy các gợi ý phù hợp.
9. Hệ thống sinh lộ trình phát triển cá nhân.
10. Hệ thống lưu kết quả phân tích.
11. Sinh viên xem kết quả phân tích và lộ trình.

---

## 5.4. Luồng 4: Giảng viên/cố vấn xác nhận minh chứng

1. Giảng viên/cố vấn đăng nhập hệ thống.
2. Giảng viên/cố vấn xem danh sách sinh viên phụ trách.
3. Giảng viên/cố vấn chọn sinh viên cần xem hồ sơ.
4. Giảng viên/cố vấn xem danh sách minh chứng chờ xác nhận.
5. Giảng viên/cố vấn kiểm tra nội dung minh chứng.
6. Nếu hợp lệ, giảng viên/cố vấn xác nhận minh chứng.
7. Nếu không hợp lệ, giảng viên/cố vấn từ chối và nhập lý do.
8. Hệ thống gửi thông báo kết quả xác nhận đến sinh viên.
9. Hệ thống cập nhật độ tin cậy hồ sơ.

---

## 5.5. Luồng 5: Sinh viên thực hiện lộ trình

1. Sinh viên xem lộ trình phát triển cá nhân.
2. Sinh viên chọn nhiệm vụ cần thực hiện.
3. Sinh viên cập nhật trạng thái nhiệm vụ.
4. Sinh viên upload minh chứng hoàn thành nếu có.
5. Hệ thống cập nhật tiến độ lộ trình.
6. Giảng viên/cố vấn có thể theo dõi tiến độ.
7. Hệ thống gửi nhắc nhở nếu sinh viên lâu không cập nhật.

---

## 5.6. Luồng 6: Xuất portfolio cá nhân

1. Sinh viên chọn chức năng xuất portfolio.
2. Sinh viên chọn các phần muốn đưa vào portfolio.
3. Hệ thống lấy dữ liệu hồ sơ năng lực.
4. Hệ thống sinh file PDF.
5. Sinh viên tải file portfolio về máy.

---

# 6. Quy tắc nghiệp vụ

Các quy tắc nghiệp vụ chính của hệ thống gồm:

- Mỗi sinh viên chỉ có một hồ sơ năng lực chính.
- Mỗi sinh viên có thể chọn một mục tiêu nghề nghiệp chính tại một thời điểm.
- Một mục tiêu nghề nghiệp có nhiều kỹ năng yêu cầu.
- Mỗi kỹ năng yêu cầu có mức độ yêu cầu và trọng số riêng.
- Tổng trọng số kỹ năng của một mục tiêu nghề nghiệp nên bằng 100 hoặc được chuẩn hóa về 100.
- Sinh viên có thể tự khai báo kỹ năng, nhưng độ tin cậy cao hơn nếu có minh chứng được xác nhận.
- Minh chứng chỉ được xác nhận bởi giảng viên/cố vấn hoặc admin.
- Kỹ năng có mức hiện tại thấp hơn mức yêu cầu được xem là kỹ năng còn thiếu.
- Hệ thống gợi ý dựa trên kỹ năng còn thiếu và điểm ưu tiên.
- Lộ trình phát triển được sinh ra dựa trên mục tiêu nghề nghiệp và thứ tự học tập của kỹ năng.
- Sinh viên có thể cập nhật tiến độ lộ trình.
- Hệ thống lưu lại lịch sử phân tích để theo dõi sự tiến bộ của sinh viên.
- Admin có quyền xem thống kê toàn hệ thống.
- Giảng viên/cố vấn chỉ xem được sinh viên được phân công.
- Sinh viên chỉ xem và chỉnh sửa hồ sơ của chính mình.

---

# 7. Use Case hệ thống

## 7.1. Danh sách tác nhân

### Admin

Quản lý dữ liệu nền tảng, người dùng, danh mục kỹ năng, mục tiêu nghề nghiệp và báo cáo thống kê.

### Giảng viên/Cố vấn

Theo dõi sinh viên, xác nhận minh chứng, nhận xét hồ sơ và hỗ trợ sinh viên phát triển năng lực.

### Sinh viên

Xây dựng hồ sơ năng lực, chọn mục tiêu nghề nghiệp, xem phân tích năng lực, thực hiện lộ trình và xuất portfolio.

---

## 7.2. Use Case của Admin

- Đăng nhập.
- Quản lý sinh viên.
- Quản lý giảng viên/cố vấn.
- Quản lý nhóm kỹ năng.
- Quản lý kỹ năng.
- Quản lý mục tiêu nghề nghiệp.
- Cấu hình kỹ năng yêu cầu cho nghề nghiệp.
- Cấu hình gợi ý học tập/dự án.
- Phân công cố vấn cho sinh viên.
- Xem dashboard thống kê.
- Xuất báo cáo Excel.
- Xem lịch sử thao tác.

---

## 7.3. Use Case của Giảng viên/Cố vấn

- Đăng nhập.
- Xem danh sách sinh viên phụ trách.
- Xem hồ sơ năng lực sinh viên.
- Xem kết quả phân tích năng lực.
- Xem lộ trình phát triển của sinh viên.
- Nhận xét hồ sơ.
- Xác nhận minh chứng.
- Từ chối minh chứng.
- Xem cảnh báo sinh viên có hồ sơ yếu.
- Xuất báo cáo nhóm sinh viên phụ trách.

---

## 7.4. Use Case của Sinh viên

- Đăng nhập.
- Cập nhật hồ sơ cá nhân.
- Chọn mục tiêu nghề nghiệp.
- Thêm kỹ năng.
- Cập nhật mức độ kỹ năng.
- Thêm dự án.
- Thêm chứng chỉ.
- Thêm hoạt động.
- Thêm kinh nghiệm.
- Upload minh chứng.
- Xem mức độ hoàn thiện hồ sơ.
- Phân tích năng lực.
- Xem kỹ năng còn thiếu.
- Xem gợi ý học tập/dự án.
- Xem lộ trình phát triển.
- Cập nhật tiến độ lộ trình.
- Xem nhận xét từ cố vấn.
- Xuất portfolio PDF.

---

# 8. Đặc tả một số Use Case quan trọng

## 8.1. Use Case: Sinh viên cập nhật kỹ năng

### Tác nhân

Sinh viên.

### Mục tiêu

Sinh viên thêm hoặc cập nhật kỹ năng hiện tại của bản thân.

### Tiền điều kiện

Sinh viên đã đăng nhập hệ thống.

### Luồng chính

1. Sinh viên vào trang hồ sơ năng lực.
2. Sinh viên chọn tab kỹ năng.
3. Sinh viên chọn kỹ năng từ danh mục.
4. Sinh viên chọn mức độ hiện tại.
5. Sinh viên nhập mô tả nếu cần.
6. Sinh viên upload minh chứng nếu có.
7. Sinh viên bấm lưu.
8. Hệ thống lưu kỹ năng vào hồ sơ.
9. Hệ thống cập nhật mức độ hoàn thiện hồ sơ.

### Luồng ngoại lệ

- Nếu sinh viên chưa chọn kỹ năng, hệ thống báo lỗi.
- Nếu kỹ năng đã tồn tại, hệ thống cập nhật thay vì tạo mới.
- Nếu file minh chứng không hợp lệ, hệ thống từ chối upload.

---

## 8.2. Use Case: Phân tích năng lực sinh viên

### Tác nhân

Sinh viên.

### Mục tiêu

Hệ thống phân tích năng lực hiện tại của sinh viên so với mục tiêu nghề nghiệp.

### Tiền điều kiện

- Sinh viên đã đăng nhập.
- Sinh viên đã chọn mục tiêu nghề nghiệp.
- Admin đã cấu hình bộ kỹ năng yêu cầu cho mục tiêu nghề nghiệp đó.

### Luồng chính

1. Sinh viên bấm nút “Phân tích năng lực”.
2. Hệ thống lấy mục tiêu nghề nghiệp của sinh viên.
3. Hệ thống lấy danh sách kỹ năng yêu cầu.
4. Hệ thống lấy kỹ năng hiện tại của sinh viên.
5. Hệ thống tính mức độ phù hợp.
6. Hệ thống xác định kỹ năng còn thiếu.
7. Hệ thống tính điểm ưu tiên.
8. Hệ thống lấy gợi ý phù hợp.
9. Hệ thống sinh lộ trình phát triển.
10. Hệ thống lưu kết quả phân tích.
11. Hệ thống hiển thị kết quả cho sinh viên.

### Luồng ngoại lệ

- Nếu sinh viên chưa chọn mục tiêu nghề nghiệp, hệ thống yêu cầu chọn mục tiêu.
- Nếu mục tiêu nghề nghiệp chưa được cấu hình kỹ năng, hệ thống thông báo chưa đủ dữ liệu phân tích.
- Nếu sinh viên chưa có kỹ năng nào, hệ thống vẫn phân tích và xem tất cả kỹ năng yêu cầu là kỹ năng còn thiếu.

---

## 8.3. Use Case: Giảng viên xác nhận minh chứng

### Tác nhân

Giảng viên/Cố vấn.

### Mục tiêu

Xác nhận tính hợp lệ của minh chứng do sinh viên tải lên.

### Tiền điều kiện

Giảng viên đã đăng nhập và được phân công phụ trách sinh viên.

### Luồng chính

1. Giảng viên vào danh sách sinh viên phụ trách.
2. Giảng viên chọn một sinh viên.
3. Giảng viên xem danh sách minh chứng chờ xác nhận.
4. Giảng viên mở minh chứng.
5. Giảng viên chọn xác nhận hoặc từ chối.
6. Nếu từ chối, giảng viên nhập lý do.
7. Hệ thống cập nhật trạng thái minh chứng.
8. Hệ thống gửi thông báo cho sinh viên.
9. Hệ thống cập nhật độ tin cậy hồ sơ.

---

# 9. Thiết kế dữ liệu

## 9.1. Danh sách bảng chính

Các bảng chính của hệ thống gồm:

- users
- students
- lecturers
- advisor_assignments
- skill_categories
- skills
- career_goals
- specializations
- career_goal_specializations
- career_required_skills
- student_profiles
- student_skills
- student_projects
- student_certificates
- student_activities
- student_experiences
- evidences
- competency_analysis_results
- competency_analysis_details
- recommendation_templates
- student_recommendations
- development_roadmaps
- roadmap_items
- student_roadmap_progress
- advisor_reviews
- notifications
- notification_logs
- activity_logs
- export_logs

---

## 9.2. Bảng users

Lưu tài khoản đăng nhập chung.

### Thuộc tính

- id.
- full_name.
- email.
- password_hash.
- role.
- status.
- last_login_at.
- created_at.
- updated_at.

### Role

- ADMIN.
- LECTURER.
- STUDENT.

---

## 9.3. Bảng students

Lưu thông tin sinh viên.

### Thuộc tính

- id.
- user_id.
- student_code.
- class_name.
- major.
- specialization_id.
- academic_year.
- phone.
- date_of_birth.
- avatar_url.
- created_at.
- updated_at.

---

## 9.4. Bảng lecturers

Lưu thông tin giảng viên/cố vấn.

### Thuộc tính

- id.
- user_id.
- lecturer_code.
- department.
- phone.
- academic_title.
- created_at.
- updated_at.

---

## 9.5. Bảng advisor_assignments

Lưu quan hệ phân công cố vấn học tập cho sinh viên.

### Thuộc tính

- id.
- lecturer_id.
- student_id.
- assigned_by.
- assigned_at.
- status.

### Quan hệ

- Một giảng viên có thể phụ trách nhiều sinh viên.
- Một sinh viên có thể có một cố vấn chính.

---

## 9.6. Bảng skill_categories

Lưu nhóm kỹ năng.

### Thuộc tính

- id.
- name.
- description.
- status.
- created_at.
- updated_at.

---

## 9.7. Bảng skills

Lưu danh mục kỹ năng.

### Thuộc tính

- id.
- category_id.
- name.
- description.
- status.
- created_at.
- updated_at.

---

## 9.8. Bảng career_goals

Lưu danh mục mục tiêu nghề nghiệp.

### Thuộc tính

- id.
- name.
- description.
- status.
- created_at.
- updated_at.

### Ví dụ dữ liệu

- Front-end Developer.
- Back-end Developer.
- Full-stack Developer.
- Data Analyst.
- UI/UX Designer.
- QA Tester.

---

## 9.9. Bảng career_required_skills

Lưu các kỹ năng yêu cầu cho từng mục tiêu nghề nghiệp.

### Thuộc tính

- id.
- career_goal_id.
- skill_id.
- required_level.
- weight.
- learning_order.
- is_required.
- created_at.
- updated_at.

### Ý nghĩa

- required_level: mức kỹ năng yêu cầu.
- weight: độ quan trọng của kỹ năng.
- learning_order: thứ tự nên học kỹ năng.

### Ví dụ

| Nghề nghiệp         | Kỹ năng    | Mức yêu cầu | Trọng số | Thứ tự |
| ------------------- | ---------- | ----------- | -------- | ------ |
| Front-end Developer | JavaScript | 3           | 20       | 1      |
| Front-end Developer | TypeScript | 2           | 15       | 2      |
| Front-end Developer | React      | 3           | 20       | 3      |
| Front-end Developer | Next.js    | 2           | 10       | 4      |

---

## 9.9A. Bảng specializations

Lưu danh mục chuyên ngành hoặc hướng chuyên sâu trong lĩnh vực Công nghệ thông tin.

### Thuộc tính

- id.
- name.
- description.
- status.
- created_at.
- updated_at.

### Ví dụ dữ liệu

- Software Engineering.
- Data Science.
- Information Systems.
- Artificial Intelligence.
- Cybersecurity.
- UI/UX.
- DevOps.

---

## 9.9B. Bảng career_goal_specializations

Lưu quan hệ giữa mục tiêu nghề nghiệp và chuyên ngành phù hợp.

### Thuộc tính

- id.
- career_goal_id.
- specialization_id.
- created_at.

### Ý nghĩa

Một mục tiêu nghề nghiệp có thể phù hợp với nhiều chuyên ngành, và một chuyên ngành có thể có nhiều mục tiêu nghề nghiệp.

Ví dụ:

| Chuyên ngành          | Mục tiêu nghề nghiệp |
| --------------------- | -------------------- |
| Software Engineering  | Backend Developer    |
| Software Engineering  | Frontend Developer   |
| Data Science          | Data Analyst         |
| Artificial Intelligence | AI/ML Engineer     |

---

## 9.10. Bảng student_profiles

Lưu hồ sơ năng lực chính của sinh viên.

### Thuộc tính

- id.
- student_id.
- career_goal_id.
- summary.
- github_url.
- linkedin_url.
- portfolio_url.
- completion_percent.
- match_percent.
- risk_score.
- last_analyzed_at.
- last_updated_at.
- created_at.
- updated_at.

---

## 9.11. Bảng student_skills

Lưu kỹ năng hiện tại của sinh viên.

### Thuộc tính

- id.
- student_id.
- skill_id.
- current_level.
- description.
- evidence_status.
- verified_by.
- verified_at.
- created_at.
- updated_at.

### current_level

- 0: Chưa biết.
- 1: Cơ bản.
- 2: Khá.
- 3: Tốt.

---

## 9.12. Bảng student_projects

Lưu dự án của sinh viên.

### Thuộc tính

- id.
- student_id.
- title.
- description.
- role_in_project.
- technologies.
- github_url.
- demo_url.
- start_date.
- end_date.
- status.
- verification_status.
- created_at.
- updated_at.

---

## 9.13. Bảng student_certificates

Lưu chứng chỉ của sinh viên.

### Thuộc tính

- id.
- student_id.
- certificate_name.
- issuer.
- issue_date.
- expiration_date.
- credential_id.
- credential_url.
- verification_status.
- created_at.
- updated_at.

---

## 9.14. Bảng student_activities

Lưu hoạt động ngoại khóa/cuộc thi/workshop.

### Thuộc tính

- id.
- student_id.
- title.
- organization.
- role.
- description.
- start_date.
- end_date.
- verification_status.
- created_at.
- updated_at.

---

## 9.15. Bảng student_experiences

Lưu kinh nghiệm thực tập/làm việc.

### Thuộc tính

- id.
- student_id.
- company_name.
- position.
- description.
- start_date.
- end_date.
- verification_status.
- created_at.
- updated_at.

---

## 9.16. Bảng evidences

Lưu minh chứng cho kỹ năng, dự án, chứng chỉ, hoạt động hoặc kinh nghiệm.

### Thuộc tính

- id.
- student_id.
- related_entity_type.
- related_entity_id.
- file_url.
- evidence_url.
- note.
- status.
- reviewed_by.
- reviewed_at.
- reviewer_note.
- created_at.
- updated_at.

### related_entity_type

- SKILL.
- PROJECT.
- CERTIFICATE.
- ACTIVITY.
- EXPERIENCE.
- ROADMAP_ITEM.

### status

- PENDING.
- VERIFIED.
- REJECTED.

---

## 9.17. Bảng competency_analysis_results

Lưu kết quả phân tích tổng quan mỗi lần sinh viên phân tích năng lực.

### Thuộc tính

- id.
- student_id.
- career_goal_id.
- completion_percent.
- match_percent.
- risk_score.
- match_level.
- analyzed_at.

### match_level

- NOT_MATCHED.
- DEVELOPING.
- GOOD_MATCH.
- STRONG_MATCH.

---

## 9.18. Bảng competency_analysis_details

Lưu chi tiết phân tích từng kỹ năng.

### Thuộc tính

- id.
- analysis_result_id.
- skill_id.
- current_level.
- required_level.
- gap.
- weight.
- achieved_score.
- priority_score.
- status.

### status

- ACHIEVED.
- MISSING.
- NEED_IMPROVEMENT.

---

## 9.19. Bảng recommendation_templates

Lưu mẫu gợi ý học tập/dự án/chứng chỉ theo kỹ năng, mục tiêu nghề nghiệp, chuyên ngành hoặc nhóm kỹ năng.

### Thuộc tính

- id.
- specialization_id.
- career_goal_id.
- skill_category_id.
- skill_id.
- recommendation_type.
- title.
- description.
- difficulty_level.
- estimated_duration.
- resource_url.
- priority.
- status.

### recommendation_type

- COURSE.
- PROJECT.
- CERTIFICATE.
- PRACTICE.
- DOCUMENT.

### Quy tắc sử dụng

- Nếu `specialization_id` có giá trị, template chỉ áp dụng cho chuyên ngành đó.
- Nếu `career_goal_id` có giá trị, template ưu tiên áp dụng cho mục tiêu nghề nghiệp đó.
- Nếu `skill_category_id` có giá trị, template có thể áp dụng ở cấp nhóm kỹ năng.
- Nếu chỉ có `skill_id`, template là mẫu chung cho kỹ năng đó.
- `priority` dùng để chọn template phù hợp hơn khi có nhiều template cùng khớp điều kiện.

---

## 9.20. Bảng student_recommendations

Lưu gợi ý được sinh ra cho sinh viên.

### Thuộc tính

- id.
- student_id.
- analysis_result_id.
- skill_id.
- recommendation_template_id.
- title.
- description.
- reason.
- priority_score.
- status.
- created_at.

### status

- NEW.
- SAVED.
- IN_PROGRESS.
- DONE.
- DISMISSED.

---

## 9.21. Bảng development_roadmaps

Lưu lộ trình phát triển cá nhân của sinh viên.

### Thuộc tính

- id.
- student_id.
- career_goal_id.
- title.
- description.
- progress_percent.
- status.
- created_at.
- updated_at.

### status

- ACTIVE.
- COMPLETED.
- CANCELLED.

---

## 9.22. Bảng roadmap_items

Lưu các nhiệm vụ trong lộ trình.

### Thuộc tính

- id.
- roadmap_id.
- skill_id.
- title.
- description.
- item_type.
- order_index.
- weight.
- deadline.
- status.
- created_at.
- updated_at.

### item_type

- LEARN.
- PRACTICE.
- PROJECT.
- CERTIFICATE.
- PORTFOLIO.

### status

- TODO.
- IN_PROGRESS.
- DONE.
- CANCELLED.

---

## 9.23. Bảng advisor_reviews

Lưu nhận xét của giảng viên/cố vấn về hồ sơ sinh viên.

### Thuộc tính

- id.
- student_id.
- lecturer_id.
- review_content.
- suggestion.
- rating.
- created_at.
- updated_at.

---

## 9.24. Bảng notifications

Lưu thông báo trong hệ thống.

### Thuộc tính

- id.
- user_id.
- title.
- content.
- notification_type.
- related_entity_type.
- related_entity_id.
- is_read.
- created_at.

### notification_type

- PROFILE_REMINDER.
- EVIDENCE_VERIFIED.
- EVIDENCE_REJECTED.
- ROADMAP_REMINDER.
- ADVISOR_REVIEW.
- WEAK_PROFILE_ALERT.
- SYSTEM.

---

## 9.25. Bảng notification_logs

Lưu lịch sử gửi thông báo.

### Thuộc tính

- id.
- notification_id.
- user_id.
- channel.
- status.
- sent_at.

---

## 9.26. Bảng activity_logs

Lưu lịch sử thao tác quan trọng.

### Thuộc tính

- id.
- user_id.
- action.
- entity_type.
- entity_id.
- description.
- created_at.

---

## 9.27. Bảng export_logs

Lưu lịch sử xuất file.

### Thuộc tính

- id.
- user_id.
- export_type.
- file_url.
- created_at.

---

# 10. Quan hệ giữa các bảng

Các quan hệ chính:

- Một user có thể là một student hoặc lecturer.
- Một lecturer có thể phụ trách nhiều student thông qua advisor_assignments.
- Một student có một student_profile.
- Một career_goal có nhiều career_required_skills.
- Một specialization có nhiều student.
- Một specialization có nhiều recommendation_templates.
- Một career_goal có thể liên kết nhiều specialization thông qua career_goal_specializations.
- Một specialization có thể liên kết nhiều career_goal thông qua career_goal_specializations.
- Một skill có thể thuộc một skill_category.
- Một student có nhiều student_skills.
- Một student có nhiều student_projects.
- Một student có nhiều student_certificates.
- Một student có nhiều student_activities.
- Một student có nhiều student_experiences.
- Một student có nhiều evidences.
- Một evidence liên kết với một kỹ năng, dự án, chứng chỉ, hoạt động hoặc kinh nghiệm.
- Một student có nhiều competency_analysis_results.
- Một competency_analysis_result có nhiều competency_analysis_details.
- Một skill có nhiều recommendation_templates.
- Một skill_category có thể có nhiều recommendation_templates.
- Một career_goal có thể có nhiều recommendation_templates.
- Một student có nhiều student_recommendations.
- Một student có nhiều development_roadmaps.
- Một development_roadmap có nhiều roadmap_items.
- Một lecturer có thể viết nhiều advisor_reviews.
- Một user có nhiều notifications.
- Một user có nhiều activity_logs.
- Một user có nhiều export_logs.

---

# 11. Thiết kế thuật toán Rule-based Recommendation System

## 11.1. Dữ liệu đầu vào

Hệ thống cần các dữ liệu sau:

- Mục tiêu nghề nghiệp của sinh viên.
- Chuyên ngành hoặc hướng chuyên sâu của sinh viên nếu có.
- Danh sách kỹ năng yêu cầu của mục tiêu nghề nghiệp.
- Mức độ yêu cầu của từng kỹ năng.
- Trọng số của từng kỹ năng.
- Thứ tự học tập của từng kỹ năng.
- Danh sách kỹ năng hiện tại của sinh viên.
- Mẫu gợi ý học tập/dự án/chứng chỉ theo chuyên ngành, mục tiêu nghề nghiệp, nhóm kỹ năng hoặc kỹ năng.

---

## 11.2. Quy trình xử lý

1. Lấy mục tiêu nghề nghiệp của sinh viên.
2. Lấy bộ kỹ năng yêu cầu của mục tiêu nghề nghiệp.
3. Lấy kỹ năng hiện tại của sinh viên.
4. So sánh mức hiện tại với mức yêu cầu.
5. Tính điểm đạt được theo từng kỹ năng.
6. Tính mức độ phù hợp nghề nghiệp.
7. Xác định kỹ năng còn thiếu.
8. Tính điểm ưu tiên của từng kỹ năng thiếu.
9. Sắp xếp kỹ năng thiếu theo mức độ ưu tiên.
10. Lấy gợi ý tương ứng với kỹ năng còn thiếu theo cơ chế fallback template.
11. Sắp xếp gợi ý theo thứ tự học tập.
12. Tạo lộ trình phát triển cá nhân.
13. Lưu kết quả phân tích vào cơ sở dữ liệu.

## 11.2A. Cơ chế fallback template

Recommendation Engine không yêu cầu admin nhập đầy đủ template cho tất cả domain trong ngành Công nghệ thông tin. Khi thiếu kỹ năng, hệ thống tìm template từ cụ thể đến tổng quát:

1. `specialization_id + career_goal_id + skill_id`.
2. `specialization_id + skill_id`.
3. `career_goal_id + skill_id`.
4. `skill_category_id + skill_id`.
5. `skill_id`.
6. Template mặc định do hệ thống tự sinh.

Cơ chế này giúp hệ thống có thể bắt đầu với bộ dữ liệu nhỏ nhưng vẫn mở rộng dần theo chuyên ngành, career track hoặc domain cụ thể.

---

## 11.3. Công thức tính điểm

### Điểm kỹ năng

```
skill_score = min(current_level / required_level, 1) × weight
```

### Mức độ phù hợp nghề nghiệp

```
match_percent = total_skill_score / total_weight × 100
```

### Khoảng cách thiếu hụt

```
gap = required_level - current_level
```

### Điểm ưu tiên

```
priority_score = gap × weight
```

---

## 11.4. Ví dụ phân tích

Mục tiêu nghề nghiệp: Front-end Developer.

| Kỹ năng    | Yêu cầu | Hiện tại | Trọng số |
| ---------- | ------- | -------- | -------- |
| JavaScript | 3       | 2        | 20       |
| TypeScript | 2       | 1        | 15       |
| React      | 3       | 2        | 20       |
| Next.js    | 2       | 0        | 10       |
| Git        | 2       | 2        | 10       |

Kết quả:

- JavaScript thiếu 1 mức.
- TypeScript thiếu 1 mức.
- React thiếu 1 mức.
- Next.js thiếu 2 mức.
- Git đã đạt yêu cầu.

Điểm ưu tiên:

- JavaScript: 1 × 20 = 20.
- TypeScript: 1 × 15 = 15.
- React: 1 × 20 = 20.
- Next.js: 2 × 10 = 20.

Hệ thống sẽ gợi ý sinh viên cải thiện JavaScript, React, Next.js và TypeScript.

---

# 12. Thiết kế API dự kiến

## 12.1. API xác thực

### Đăng nhập

```
POST /api/auth/login
```

### Đăng xuất

```
POST /api/auth/logout
```

### Lấy thông tin người dùng hiện tại

```
GET /api/auth/me
```

---

## 12.2. API quản lý kỹ năng

### Lấy danh sách kỹ năng

```
GET /api/skills
```

### Thêm kỹ năng

```
POST /api/skills
```

### Cập nhật kỹ năng

```
PATCH /api/skills/:id
```

### Xóa kỹ năng

```
DELETE /api/skills/:id
```

---

## 12.3. API quản lý mục tiêu nghề nghiệp

### Lấy danh sách mục tiêu nghề nghiệp

```
GET /api/career-goals
```

### Thêm mục tiêu nghề nghiệp

```
POST /api/career-goals
```

### Cập nhật mục tiêu nghề nghiệp

```
PATCH /api/career-goals/:id
```

### Cấu hình kỹ năng yêu cầu

```
POST /api/career-goals/:id/required-skills
```

---

## 12.4. API hồ sơ sinh viên

### Lấy hồ sơ cá nhân

```
GET /api/student-profile/me
```

### Cập nhật hồ sơ cá nhân

```
PATCH /api/student-profile/me
```

### Chọn mục tiêu nghề nghiệp

```
PATCH /api/student-profile/me/career-goal
```

---

## 12.5. API kỹ năng sinh viên

### Lấy kỹ năng của sinh viên

```
GET /api/student-skills/me
```

### Thêm kỹ năng

```
POST /api/student-skills
```

### Cập nhật kỹ năng

```
PATCH /api/student-skills/:id
```

### Xóa kỹ năng

```
DELETE /api/student-skills/:id
```

---

## 12.6. API phân tích năng lực

### Phân tích năng lực

```
POST /api/competency/analyze/me
```

### Lấy lịch sử phân tích

```
GET /api/competency/analysis-history/me
```

### Lấy chi tiết kết quả phân tích

```
GET /api/competency/analysis-results/:id
```

---

## 12.7. API gợi ý

### Lấy danh sách gợi ý

```
GET /api/recommendations/me
```

### Cập nhật trạng thái gợi ý

```
PATCH /api/recommendations/:id/status
```

---

## 12.8. API lộ trình

### Lấy lộ trình cá nhân

```
GET /api/roadmaps/me
```

### Cập nhật trạng thái nhiệm vụ

```
PATCH /api/roadmap-items/:id/status
```

---

## 12.9. API minh chứng

### Upload minh chứng

```
POST /api/evidences
```

### Lấy danh sách minh chứng

```
GET /api/evidences/me
```

### Giảng viên xác nhận minh chứng

```
PATCH /api/evidences/:id/verify
```

### Giảng viên từ chối minh chứng

```
PATCH /api/evidences/:id/reject
```

---

## 12.10. API báo cáo

### Xuất portfolio PDF

```
GET /api/exports/portfolio/me
```

### Xuất báo cáo sinh viên

```
GET /api/exports/students
```

### Xuất báo cáo năng lực

```
GET /api/exports/competency
```

---

# 13. Thiết kế giao diện

## 13.1. Giao diện đăng nhập

Thành phần chính:

- Email.
- Mật khẩu.
- Nút đăng nhập.
- Thông báo lỗi nếu đăng nhập thất bại.

---

## 13.2. Dashboard Sinh viên

Hiển thị:

- Mức độ hoàn thiện hồ sơ.
- Mục tiêu nghề nghiệp hiện tại.
- Mức độ phù hợp nghề nghiệp.
- Số kỹ năng đã có.
- Số kỹ năng còn thiếu.
- Tiến độ lộ trình.
- Thông báo mới.
- Gợi ý quan trọng nhất.

---

## 13.3. Trang hồ sơ năng lực Sinh viên

Các tab chính:

- Thông tin cá nhân.
- Kỹ năng.
- Dự án.
- Chứng chỉ.
- Hoạt động.
- Kinh nghiệm.
- Minh chứng.
- Nhận xét của cố vấn.

---

## 13.4. Trang phân tích năng lực

Hiển thị:

- Nghề nghiệp mục tiêu.
- Tỷ lệ phù hợp.
- Biểu đồ kỹ năng đạt/chưa đạt.
- Danh sách kỹ năng còn thiếu.
- Điểm ưu tiên từng kỹ năng.
- Gợi ý học tập.
- Gợi ý dự án.
- Nút tạo lộ trình.

---

## 13.5. Trang lộ trình cá nhân

Hiển thị:

- Danh sách nhiệm vụ theo thứ tự.
- Trạng thái từng nhiệm vụ.
- Tiến độ tổng thể.
- Deadline nếu có.
- Nút cập nhật trạng thái.
- Upload minh chứng hoàn thành.

---

## 13.6. Dashboard Giảng viên/Cố vấn

Hiển thị:

- Tổng số sinh viên phụ trách.
- Số sinh viên có hồ sơ hoàn thiện trên 80%.
- Số sinh viên có hồ sơ yếu.
- Số minh chứng chờ xác nhận.
- Danh sách sinh viên cần chú ý.
- Thống kê mục tiêu nghề nghiệp phổ biến.

---

## 13.7. Dashboard Admin

Hiển thị:

- Tổng số sinh viên.
- Tổng số giảng viên/cố vấn.
- Tổng số kỹ năng.
- Tổng số mục tiêu nghề nghiệp.
- Tỷ lệ sinh viên đã chọn mục tiêu nghề nghiệp.
- Tỷ lệ sinh viên có hồ sơ hoàn thiện.
- Top kỹ năng còn thiếu nhiều nhất.
- Top mục tiêu nghề nghiệp được chọn nhiều nhất.
- Số lượng sinh viên có nguy cơ cao.

---

# 14. Kiến trúc hệ thống đề xuất

Hệ thống có thể triển khai theo mô hình 3 lớp.

## 14.1. Lớp giao diện

Công nghệ đề xuất:

- Next.js.
- Ant Design
- Axios hoặc Fetch API.

Chức năng:

- Hiển thị giao diện người dùng.
- Gửi request đến backend.
- Hiển thị dashboard.
- Hiển thị kết quả phân tích năng lực.
- Upload file minh chứng.
- Tải portfolio PDF.

---

## 14.2. Lớp xử lý nghiệp vụ

Công nghệ đề xuất:

- NestJS
- RESTful API.
- JWT Authentication.
- Role-based Authorization.

Chức năng:

- Xử lý đăng nhập và phân quyền.
- Quản lý hồ sơ năng lực.
- Xử lý upload minh chứng.
- Phân tích năng lực.
- Sinh gợi ý rule-based.
- Sinh lộ trình cá nhân.
- Gửi thông báo tự động.
- Xuất PDF/Excel.
- Ghi log thao tác.

---

## 14.3. Lớp dữ liệu

Công nghệ đề xuất:

- PostgreSQL
- Prisma ORM

Chức năng:

- Lưu người dùng.
- Lưu hồ sơ sinh viên.
- Lưu kỹ năng.
- Lưu mục tiêu nghề nghiệp.
- Lưu kết quả phân tích.
- Lưu gợi ý.
- Lưu lộ trình.
- Lưu thông báo.
- Lưu lịch sử thao tác.

---

# 15. Yêu cầu phi chức năng

## 15.1. Bảo mật

- Mật khẩu phải được mã hóa.
- API cần xác thực bằng JWT hoặc session.
- Phân quyền rõ ràng theo vai trò.
- Sinh viên không được truy cập hồ sơ của sinh viên khác.
- Giảng viên chỉ được xem sinh viên được phân công.
- File minh chứng cần kiểm tra định dạng và dung lượng.
- Không cho phép upload file nguy hiểm.

---

## 15.2. Hiệu năng

- Hệ thống phản hồi nhanh với các thao tác thông thường.
- Dashboard nên được tối ưu bằng truy vấn tổng hợp.
- Kết quả phân tích nên được lưu lại để tránh tính lại liên tục.
- Danh sách sinh viên, kỹ năng, dự án cần có phân trang.

---

## 15.3. Tính dễ sử dụng

- Giao diện đơn giản, dễ thao tác.
- Dashboard trực quan.
- Kết quả phân tích dễ hiểu.
- Gợi ý phải có lý do rõ ràng.
- Sinh viên dễ cập nhật hồ sơ và theo dõi tiến độ.

---

## 15.4. Tính mở rộng

- Có thể thêm mục tiêu nghề nghiệp mới.
- Có thể thêm kỹ năng mới.
- Có thể thay đổi trọng số kỹ năng.
- Có thể thêm loại gợi ý mới.
- Có thể thêm chuyên ngành hoặc career track mới mà không cần nhập lại toàn bộ dữ liệu gợi ý.
- Có thể bắt đầu với template gợi ý chung và mở rộng dần sang template cụ thể theo chuyên ngành.
- Có thể nâng cấp từ rule-based sang AI recommendation trong tương lai.

---

# 16. Báo cáo và thống kê

## 16.1. Báo cáo cho Admin

Admin có thể xuất:

- Danh sách sinh viên.
- Danh sách sinh viên đã có hồ sơ năng lực.
- Danh sách sinh viên chưa hoàn thiện hồ sơ.
- Danh sách sinh viên theo mục tiêu nghề nghiệp.
- Danh sách sinh viên có nguy cơ cao.
- Thống kê kỹ năng còn thiếu nhiều nhất.
- Thống kê tỷ lệ phù hợp nghề nghiệp.
- Thống kê sinh viên theo cố vấn học tập.

---

## 16.2. Báo cáo cho Giảng viên/Cố vấn

Giảng viên/cố vấn có thể xuất:

- Danh sách sinh viên phụ trách.
- Hồ sơ năng lực từng sinh viên.
- Danh sách sinh viên cần hỗ trợ.
- Danh sách minh chứng chờ xác nhận.
- Tiến độ lộ trình của sinh viên.

---

## 16.3. Portfolio PDF cho Sinh viên

Sinh viên có thể xuất portfolio gồm:

- Thông tin cá nhân.
- Mục tiêu nghề nghiệp.
- Tóm tắt năng lực.
- Kỹ năng.
- Dự án.
- Chứng chỉ.
- Hoạt động.
- Kinh nghiệm.
- Link GitHub.
- Link demo.
- Link portfolio.
- Minh chứng tiêu biểu.

---

# 17. Công nghệ đề xuất

## 17.1. Frontend

- Next.js
- TypeScript.
- Ant Design.
- React Hook Form.
- Axios.
- Chart.js hoặc Recharts để vẽ dashboard.

---

## 17.2. Backend

- NestJS.
- TypeScript.
- JWT Authentication.
- Role Guard.
- Prisma ORM.
- Multer để upload file.
- ExcelJS để xuất Excel.
- PDFKit hoặc Puppeteer để xuất PDF.
- Cron Job để gửi nhắc nhở tự động.

---

## 17.3. Database

- PostgreSQL.

---

# 18. Module chức năng đề xuất

Có thể chia backend thành các module:

- auth.
- users.
- students.
- lecturers.
- advisor-assignments.
- skill-categories.
- skills.
- career-goals.
- student-profiles.
- student-skills.
- student-projects.
- student-certificates.
- student-activities.
- student-experiences.
- evidences.
- competency-analysis.
- recommendations.
- roadmaps.
- notifications.
- dashboard.
- exports.
- activity-logs.

---

# 19. Kết quả dự kiến

Sau khi hoàn thành, hệ thống dự kiến đạt được:

- Website quản lý hồ sơ năng lực số của sinh viên.
- Chức năng đăng nhập và phân quyền theo 3 vai trò.
- Admin quản lý kỹ năng, mục tiêu nghề nghiệp và bộ tiêu chí đánh giá.
- Sinh viên xây dựng hồ sơ năng lực cá nhân.
- Sinh viên cập nhật kỹ năng, dự án, chứng chỉ, hoạt động, kinh nghiệm và minh chứng.
- Giảng viên/cố vấn xem và nhận xét hồ sơ sinh viên.
- Giảng viên/cố vấn xác nhận minh chứng.
- Hệ thống tự động tính mức độ hoàn thiện hồ sơ.
- Hệ thống tự động tính mức độ phù hợp với mục tiêu nghề nghiệp.
- Hệ thống tự động xác định kỹ năng còn thiếu.
- Hệ thống tự động gợi ý học tập, dự án và chứng chỉ.
- Hệ thống tự động sinh lộ trình phát triển cá nhân.
- Hệ thống tự động cảnh báo sinh viên có hồ sơ yếu.
- Dashboard thống kê cho admin, giảng viên/cố vấn và sinh viên.
- Sinh viên xuất portfolio cá nhân dạng PDF.
- Admin và giảng viên xuất báo cáo Excel.

---

# 20. Điểm nổi bật của hệ thống

Hệ thống có các điểm nổi bật sau:

- Không chỉ quản lý thông tin sinh viên mà còn quản lý năng lực thực tế.
- Có hồ sơ năng lực số tập trung cho từng sinh viên.
- Có gợi ý lộ trình phát triển cá nhân hóa.
- Có thuật toán gợi ý rule-based rõ ràng, dễ giải thích.
- Có dashboard thống kê năng lực theo từng vai trò.
- Có xác nhận minh chứng để tăng độ tin cậy hồ sơ.
- Có cảnh báo sinh viên có hồ sơ yếu hoặc thiếu định hướng.
- Có thể xuất portfolio phục vụ thực tập/tuyển dụng.
- Có khả năng mở rộng sang AI recommendation trong tương lai.

---

# 21. Kết luận

Hệ thống hồ sơ năng lực số và gợi ý lộ trình phát triển cá nhân cho sinh viên là một hệ thống có tính thực tiễn cao, giúp sinh viên hiểu rõ năng lực hiện tại, xác định kỹ năng còn thiếu và có định hướng phát triển phù hợp với mục tiêu nghề nghiệp. Đối với giảng viên/cố vấn, hệ thống giúp theo dõi quá trình phát triển của sinh viên một cách trực quan và có dữ liệu minh chứng rõ ràng. Đối với khoa/trường, hệ thống hỗ trợ thống kê mặt bằng năng lực sinh viên, phát hiện những kỹ năng còn thiếu phổ biến và hỗ trợ công tác định hướng nghề nghiệp hiệu quả hơn.

Với phạm vi đã phân tích, hệ thống phù hợp để triển khai trong đồ án tốt nghiệp vì có đầy đủ các thành phần quan trọng như phân quyền, quản lý dữ liệu, xử lý nghiệp vụ, thuật toán gợi ý rule-based, dashboard, thông báo tự động, xuất báo cáo và thiết kế cơ sở dữ liệu rõ ràng.
