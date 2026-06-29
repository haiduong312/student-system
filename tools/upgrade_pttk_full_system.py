from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DOC = ROOT / "PTTK_Student_Digital_Competency_Profile_Ban_Tien_Trien_Khai.docx"
OUTPUT_DOC = ROOT / "PTTK_Student_Digital_Competency_Profile_Ban_Chuyen_Nghiep_Toan_He_Thong.docx"
ASSET_DIR = ROOT / ".pttk_full_system_assets"
SCHEMA_PATH = ROOT / "backend/prisma/schema.prisma"
CONTROLLER_DIR = ROOT / "backend/src"

INK = "253043"
NAVY = "17365D"
BLUE = "2E74B5"
LIGHT_BLUE = "EAF2F8"
LIGHT_GRAY = "F2F4F7"
MID_GRAY = "D2DAE5"
GREEN = "DFF1E8"
GOLD = "FFF2CC"
RED = "FCE8E6"
TABLE_WIDTH = 9360
TABLE_INDENT = 120


def set_run_font(run, name="Calibri", size=9.0, bold=False, color=INK, italic=False):
    run.font.name = name
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)


def shade_cell(cell, fill: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=80, start=120, bottom=80, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    node = tr_pr.find(qn("w:tblHeader"))
    if node is None:
        node = OxmlElement("w:tblHeader")
        tr_pr.append(node)
    node.set(qn("w:val"), "true")


def set_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn("w:cantSplit")) is None:
        tr_pr.append(OxmlElement("w:cantSplit"))


def set_table_borders(table, color=MID_GRAY, size="4"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), size)
        tag.set(qn("w:color"), color)


def set_table_geometry(table, widths: list[int]):
    assert sum(widths) == TABLE_WIDTH, (widths, sum(widths))
    table.autofit = False
    tbl_pr = table._tbl.tblPr
    layout = tbl_pr.find(qn("w:tblLayout"))
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tbl_pr.append(layout)
    layout.set(qn("w:type"), "fixed")
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(TABLE_WIDTH))
    tbl_w.set(qn("w:type"), "dxa")
    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), str(TABLE_INDENT))
    tbl_ind.set(qn("w:type"), "dxa")
    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)
    for row in table.rows:
        for cell, width in zip(row.cells, widths):
            cell.width = Inches(width / 1440)
            tc_w = cell._tc.get_or_add_tcPr().find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                cell._tc.get_or_add_tcPr().append(tc_w)
            tc_w.set(qn("w:w"), str(width))
            tc_w.set(qn("w:type"), "dxa")


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def humanize(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", " ", name).replace("_", " ").strip().lower()


class Writer:
    def __init__(self, doc: Document):
        self.doc = doc
        self.table_no = self._max_caption("Bảng")
        self.figure_no = self._max_caption("Hình")

    def _max_caption(self, label: str) -> int:
        values = []
        pattern = re.compile(rf"^{label}\s+(\d+)\.")
        for p in self.doc.paragraphs:
            match = pattern.match(p.text.strip())
            if match:
                values.append(int(match.group(1)))
        return max(values, default=0)

    def heading(self, text: str, level=1, new_page=False):
        if new_page:
            self.doc.add_page_break()
        p = self.doc.add_paragraph(text, style=f"Heading {level}")
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.keep_together = True
        return p

    def paragraph(self, text: str, style="Normal", bold_lead: str | None = None):
        p = self.doc.add_paragraph(style=style)
        if bold_lead and text.startswith(bold_lead):
            r = p.add_run(bold_lead)
            r.bold = True
            p.add_run(text[len(bold_lead):])
        else:
            p.add_run(text)
        return p

    def bullets(self, items: Iterable[str]):
        for item in items:
            p = self.doc.add_paragraph(item, style="List Bullet")
            p.paragraph_format.keep_together = True

    def numbered(self, items: Iterable[str]):
        for item in items:
            p = self.doc.add_paragraph(item, style="List Number")
            p.paragraph_format.keep_together = True

    def callout(self, title: str, text: str, fill=LIGHT_BLUE):
        table = self.doc.add_table(rows=1, cols=1)
        set_table_geometry(table, [TABLE_WIDTH])
        set_table_borders(table, BLUE, "7")
        cell = table.cell(0, 0)
        shade_cell(cell, fill)
        set_cell_margins(cell, 140, 160, 140, 160)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(title)
        set_run_font(r, size=10.5, bold=True, color=NAVY)
        p2 = cell.add_paragraph(text)
        p2.paragraph_format.space_after = Pt(0)
        for run in p2.runs:
            set_run_font(run, size=9.7, color=INK)
        set_cant_split(table.rows[0])
        self.doc.add_paragraph().paragraph_format.space_after = Pt(0)

    def table(self, headers: list[str], rows: list[list[str]], widths: list[int], caption: str,
              font_size=8.2, header_fill=LIGHT_GRAY):
        self.table_no += 1
        cap = self.doc.add_paragraph(f"Bảng {self.table_no}. {caption}", style="Caption")
        cap.paragraph_format.keep_with_next = True
        table = self.doc.add_table(rows=1, cols=len(headers))
        table.style = "Table Grid"
        table.alignment = 0
        for i, header in enumerate(headers):
            cell = table.rows[0].cells[i]
            cell.text = header
            shade_cell(cell, header_fill)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            for p in cell.paragraphs:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_after = Pt(0)
                for run in p.runs:
                    set_run_font(run, size=max(font_size, 8.0), bold=True, color=NAVY)
        set_repeat_header(table.rows[0])
        set_cant_split(table.rows[0])
        for row_values in rows:
            row = table.add_row()
            for i, value in enumerate(row_values):
                cell = row.cells[i]
                cell.text = str(value)
                cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                set_cell_margins(cell)
                for p in cell.paragraphs:
                    p.paragraph_format.space_after = Pt(0)
                    p.paragraph_format.line_spacing = 1.0
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if len(str(value)) <= 18 and i == 0 else WD_ALIGN_PARAGRAPH.LEFT
                    for run in p.runs:
                        set_run_font(run, size=font_size, color=INK)
            set_cant_split(row)
        set_table_geometry(table, widths)
        set_table_borders(table)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(0)
        return table

    def key_value(self, caption: str, items: list[tuple[str, str]]):
        rows = [[k, v] for k, v in items]
        return self.table(["Thuộc tính", "Đặc tả"], rows, [1900, 7460], caption, font_size=8.5)

    def figure(self, path: Path, caption: str, width=6.25):
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        picture = p.add_run().add_picture(str(path), width=Inches(width))
        picture._inline.docPr.set("descr", caption)
        picture._inline.docPr.set("title", caption)
        p.paragraph_format.keep_with_next = True
        self.figure_no += 1
        cap = self.doc.add_paragraph(f"Hình {self.figure_no}. {caption}", style="Caption")
        cap.paragraph_format.keep_with_next = True


@dataclass
class PrismaModel:
    name: str
    fields: list[tuple[str, str, str]]
    constraints: list[str]


def parse_prisma_models(path: Path) -> dict[str, PrismaModel]:
    models: dict[str, PrismaModel] = {}
    current: PrismaModel | None = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("//"):
            continue
        m = re.match(r"model\s+(\w+)\s*\{", line)
        if m:
            current = PrismaModel(m.group(1), [], [])
            models[current.name] = current
            continue
        if current is None:
            continue
        if line == "}":
            current = None
            continue
        if line.startswith("@@"):
            current.constraints.append(line)
            continue
        fm = re.match(r"(\w+)\s+([^\s]+)\s*(.*)", line)
        if fm:
            current.fields.append((fm.group(1), fm.group(2), fm.group(3).strip()))
    return models


FIELD_MEANINGS = {
    "id": "Định danh duy nhất của bản ghi.",
    "email": "Email đăng nhập, không được trùng.",
    "passwordHash": "Mật khẩu đã băm; không trả về giao diện.",
    "refreshTokenHash": "Dấu băm của refresh token đang hiệu lực.",
    "fullName": "Họ tên hiển thị của người dùng.",
    "status": "Trạng thái vòng đời của bản ghi.",
    "createdAt": "Thời điểm tạo bản ghi.",
    "updatedAt": "Thời điểm cập nhật gần nhất.",
    "studentId": "Khóa ngoại tới sinh viên sở hữu dữ liệu.",
    "userId": "Khóa ngoại tới tài khoản người dùng.",
    "skillId": "Khóa ngoại tới kỹ năng liên quan.",
    "careerGoalId": "Khóa ngoại tới mục tiêu nghề nghiệp.",
    "specializationId": "Khóa ngoại tùy chọn tới chuyên sâu.",
    "currentLevel": "Mức kỹ năng hiện tại dùng cho phân tích.",
    "requiredLevel": "Mức kỹ năng tối thiểu cần đạt.",
    "weight": "Trọng số nghiệp vụ trong tính toán hoặc tiến độ.",
    "learningOrder": "Thứ tự học ưu tiên trong phạm vi mục tiêu.",
    "progressPercent": "Phần trăm tiến độ đã chuẩn hóa từ 0 đến 100.",
    "matchPercent": "Điểm phù hợp năng lực từ 0 đến 100.",
    "completionPercent": "Mức hoàn thiện hồ sơ từ 0 đến 100.",
    "riskScore": "Điểm cảnh báo rủi ro từ 0 đến 100.",
    "questionText": "Nội dung câu hỏi hiển thị cho sinh viên.",
    "questionType": "Loại câu hỏi quyết định quy tắc đáp án.",
    "isCorrect": "Đánh dấu đáp án đúng; không lộ khi bắt đầu bài.",
    "calculatedLevel": "Mức kỹ năng tính được từ lần đánh giá.",
    "levelBreakdown": "Thống kê đúng/sai theo từng mức dưới dạng JSON.",
    "inputFingerprint": "Dấu vân tay đầu vào để chống chạy trùng và tái lập.",
    "policyVersion": "Phiên bản quy tắc dùng để tạo kết quả.",
    "reviewerNote": "Nhận xét xác minh hoặc lý do từ chối.",
    "isRead": "Cho biết thông báo đã được đọc hay chưa.",
}


def field_meaning(name: str, typ: str) -> str:
    if name in FIELD_MEANINGS:
        return FIELD_MEANINGS[name]
    if name.endswith("Id"):
        return f"Khóa ngoại hoặc định danh tham chiếu cho {humanize(name[:-2])}."
    if typ.endswith("[]"):
        return f"Quan hệ nhiều bản ghi {humanize(name)}."
    if typ.rstrip("?") in {"DateTime"}:
        return f"Thời điểm {humanize(name)}."
    if typ.rstrip("?") == "Boolean":
        return f"Cờ điều khiển {humanize(name)}."
    return f"Thuộc tính {humanize(name)} của thực thể."


def font(size: int, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "",
        "/Library/Fonts/Arial.ttf",
    ]
    if bold:
        candidates = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
        ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def box(draw, xy, text, fill, outline="#2E74B5", title=False):
    draw.rounded_rectangle(xy, radius=16, fill=fill, outline=outline, width=3)
    f = font(32 if title else 25, bold=title)
    x1, y1, x2, y2 = xy
    lines = wrap(draw, text, f, x2 - x1 - 28)
    heights = [draw.textbbox((0, 0), line, font=f)[3] for line in lines]
    total = sum(heights) + max(0, len(lines) - 1) * 8
    y = y1 + (y2 - y1 - total) / 2
    for line, h in zip(lines, heights):
        w = draw.textbbox((0, 0), line, font=f)[2]
        draw.text((x1 + (x2 - x1 - w) / 2, y), line, font=f, fill="#17365D")
        y += h + 8


def wrap(draw, text, f, max_width):
    words = text.split()
    lines, cur = [], []
    for word in words:
        test = " ".join(cur + [word])
        if draw.textbbox((0, 0), test, font=f)[2] <= max_width or not cur:
            cur.append(word)
        else:
            lines.append(" ".join(cur))
            cur = [word]
    if cur:
        lines.append(" ".join(cur))
    return lines


def arrow(draw, p1, p2, color="#66788A", width=4):
    draw.line([p1, p2], fill=color, width=width)
    x2, y2 = p2
    x1, y1 = p1
    import math
    a = math.atan2(y2-y1, x2-x1)
    for delta in (2.55, -2.55):
        draw.line([(x2, y2), (x2 + 18*math.cos(a+delta), y2 + 18*math.sin(a+delta))], fill=color, width=width)


def make_use_case_diagram(path: Path):
    img = Image.new("RGB", (2200, 1500), "white")
    d = ImageDraw.Draw(img)
    title = font(38, bold=True)
    d.text((650, 35), "MÔ HÌNH USE CASE TOÀN HỆ THỐNG", font=title, fill="#17365D")
    d.rounded_rectangle((420, 110, 1800, 1410), radius=24, outline="#2E74B5", width=5, fill="#FAFCFE")
    d.text((450, 125), "Student Digital Competency Profile", font=font(27, True), fill="#2E74B5")
    actors = [(50, 320, "SINH VIÊN"), (45, 800, "CỐ VẤN"), (1840, 500, "QUẢN TRỊ")]
    for x, y, name in actors:
        d.ellipse((x+55, y, x+105, y+50), outline="#17365D", width=4)
        d.line((x+80, y+50, x+80, y+145), fill="#17365D", width=4)
        d.line((x+25, y+85, x+135, y+85), fill="#17365D", width=4)
        d.line((x+80, y+145, x+30, y+205), fill="#17365D", width=4)
        d.line((x+80, y+145, x+130, y+205), fill="#17365D", width=4)
        d.text((x, y+220), name, font=font(25, True), fill="#17365D")
    items = [
        (500, 210, "Đăng nhập và quản lý phiên", LIGHT_BLUE),
        (950, 210, "Quản lý hồ sơ và tài nguyên", GREEN),
        (1400, 210, "Quản lý danh mục", LIGHT_GRAY),
        (500, 430, "Làm bài đánh giá", GOLD),
        (950, 430, "Phân tích năng lực", GOLD),
        (1400, 430, "Quản lý câu hỏi", LIGHT_GRAY),
        (500, 650, "Nộp và theo dõi minh chứng", GREEN),
        (950, 650, "Xem gợi ý và tài nguyên", GREEN),
        (1400, 650, "Xác minh minh chứng", LIGHT_BLUE),
        (500, 870, "Theo dõi lộ trình", LIGHT_BLUE),
        (950, 870, "Dashboard và thông báo", LIGHT_BLUE),
        (1400, 870, "Quản lý user và phân công", LIGHT_GRAY),
        (500, 1090, "Xuất portfolio", RED),
        (950, 1090, "Nhận xét cố vấn", LIGHT_BLUE),
        (1400, 1090, "Báo cáo và audit", RED),
    ]
    for x, y, text, fill in items:
        box(d, (x, y, x+330, y+135), text, "#"+fill)
    for y in (280, 500, 720, 940, 1160):
        d.line((190, 500, 500, y), fill="#9AA8B5", width=3)
    for y in (720, 940, 1160):
        d.line((190, 980, 950, y), fill="#9AA8B5", width=3)
    for y in (280, 500, 720, 940, 1160):
        d.line((1840, 690, 1730, y), fill="#9AA8B5", width=3)
    arrow(d, (830, 500), (950, 500), "#B7791F", 5)
    d.text((840, 455), "<<include>>", font=font(21), fill="#7A5A00")
    arrow(d, (1280, 500), (1400, 500), "#B7791F", 5)
    d.text((1290, 455), "<<include>>", font=font(21), fill="#7A5A00")
    img.save(path)


def make_full_data_map(path: Path):
    img = Image.new("RGB", (2200, 1450), "white")
    d = ImageDraw.Draw(img)
    d.text((600, 35), "BẢN ĐỒ DỮ LIỆU TOÀN HỆ THỐNG", font=font(38, True), fill="#17365D")
    groups = [
        ((80, 150, 650, 440), "Identity & Access", "User · Student · Lecturer\nAdvisorAssignment", LIGHT_BLUE),
        ((815, 150, 1385, 440), "Catalog & Career", "SkillCategory · Skill\nCareerGoal · Specialization\nCareerRequiredSkill", LIGHT_GRAY),
        ((1550, 150, 2120, 440), "Assessment", "Question · Option · Assessment\nQuestionItem · Answer · SkillResult", GOLD),
        ((80, 590, 650, 910), "Profile & Verification", "StudentProfile · StudentSkill\nProject · Certificate · Activity\nExperience · Evidence · AdvisorReview", GREEN),
        ((815, 590, 1385, 910), "Analysis & Guidance", "AnalysisResult · AnalysisDetail\nRecommendationTemplate\nStudentRecommendation · Resources", GOLD),
        ((1550, 590, 2120, 910), "Roadmap & Progress", "DevelopmentRoadmap · RoadmapItem\nResourceProgress · RoadmapProgress", LIGHT_BLUE),
        ((450, 1060, 1020, 1330), "Engagement", "Notification · NotificationLog\nDashboard projections", LIGHT_BLUE),
        ((1180, 1060, 1750, 1330), "Operations", "ActivityLog · ExportLog\nPrivate upload storage", RED),
    ]
    for xy, title, body, fill in groups:
        d.rounded_rectangle(xy, radius=22, fill="#"+fill, outline="#2E74B5", width=4)
        x1,y1,x2,y2=xy
        d.text((x1+25,y1+25), title, font=font(31,True), fill="#17365D")
        yy=y1+95
        for line in body.split("\n"):
            d.text((x1+25,yy), line, font=font(24), fill="#253043")
            yy+=42
    arrow(d,(650,290),(815,290))
    arrow(d,(1385,290),(1550,290))
    arrow(d,(365,440),(365,590))
    arrow(d,(1100,440),(1100,590))
    arrow(d,(1835,440),(1835,590))
    arrow(d,(650,750),(815,750))
    arrow(d,(1385,750),(1550,750))
    arrow(d,(930,910),(800,1060))
    arrow(d,(1660,910),(1470,1060))
    d.text((720, 1370), "Các mũi tên biểu thị luồng phụ thuộc dữ liệu chính, không thay thế ERD vật lý.", font=font(23), fill="#66788A")
    img.save(path)


FUNCTION_TREE = [
    ("F1", "Quản lý danh tính và phân quyền", "F1.1", "Xác thực", "F1.1.1 Đăng nhập; F1.1.2 Làm mới phiên; F1.1.3 Đăng xuất"),
    ("F1", "Quản lý danh tính và phân quyền", "F1.2", "Tự phục vụ tài khoản", "F1.2.1 Đổi mật khẩu; F1.2.2 Quên mật khẩu; F1.2.3 Xem tài khoản hiện tại"),
    ("F1", "Quản lý danh tính và phân quyền", "F1.3", "Quản trị người dùng", "F1.3.1 Tìm kiếm; F1.3.2 Cập nhật; F1.3.3 Khóa/mở; F1.3.4 Đặt lại mật khẩu"),
    ("F1", "Quản lý danh tính và phân quyền", "F1.4", "Phân công cố vấn", "F1.4.1 Tạo; F1.4.2 Đổi trạng thái; F1.4.3 Hủy phân công"),
    ("F2", "Quản lý danh mục năng lực", "F2.1", "Nhóm và kỹ năng", "F2.1.1 CRUD nhóm; F2.1.2 CRUD kỹ năng; F2.1.3 Kích hoạt/ngừng"),
    ("F2", "Quản lý danh mục năng lực", "F2.2", "Mục tiêu nghề nghiệp", "F2.2.1 CRUD mục tiêu; F2.2.2 CRUD chuyên sâu; F2.2.3 Quản lý kỹ năng yêu cầu"),
    ("F2", "Quản lý danh mục năng lực", "F2.3", "Kiểm soát cấu hình", "F2.3.1 Kiểm tra trùng; F2.3.2 Phiên bản hóa; F2.3.3 Vô hiệu hóa dữ liệu dẫn xuất"),
    ("F3", "Quản lý hồ sơ năng lực", "F3.1", "Hồ sơ chính", "F3.1.1 Cập nhật mục tiêu; F3.1.2 Cập nhật liên kết; F3.1.3 Tải ảnh đại diện"),
    ("F3", "Quản lý hồ sơ năng lực", "F3.2", "Tài nguyên hồ sơ", "F3.2.1 Kỹ năng; F3.2.2 Dự án; F3.2.3 Chứng chỉ; F3.2.4 Hoạt động; F3.2.5 Kinh nghiệm"),
    ("F3", "Quản lý hồ sơ năng lực", "F3.3", "Minh chứng", "F3.3.1 Nộp; F3.3.2 Sửa/nộp lại; F3.3.3 Xác minh; F3.3.4 Từ chối; F3.3.5 Tính trạng thái nguồn"),
    ("F4", "Quản lý đánh giá năng lực", "F4.1", "Ngân hàng câu hỏi", "F4.1.1 Tạo câu hỏi; F4.1.2 Quản lý đáp án; F4.1.3 Kiểm tra độ phủ; F4.1.4 Kích hoạt/ngừng"),
    ("F4", "Quản lý đánh giá năng lực", "F4.2", "Vận hành bài đánh giá", "F4.2.1 Tạo bài; F4.2.2 Chọn ngẫu nhiên; F4.2.3 Làm bài; F4.2.4 Xử lý quá hạn"),
    ("F4", "Quản lý đánh giá năng lực", "F4.3", "Chấm và lịch sử", "F4.3.1 Nộp bài; F4.3.2 Chấm đáp án; F4.3.3 Tính mức; F4.3.4 Xem lịch sử"),
    ("F5", "Phân tích năng lực", "F5.1", "Chuẩn hóa đầu vào", "F5.1.1 Hợp nhất yêu cầu; F5.1.2 Chọn mức hiện tại; F5.1.3 Kiểm tra độ phủ"),
    ("F5", "Phân tích năng lực", "F5.2", "Tính toán", "F5.2.1 Tính khoảng cách; F5.2.2 Điểm phù hợp; F5.2.3 Ưu tiên; F5.2.4 Rủi ro"),
    ("F5", "Phân tích năng lực", "F5.3", "Quản trị kết quả", "F5.3.1 Giải thích; F5.3.2 Lịch sử; F5.3.3 Tính lại; F5.3.4 Phiên bản chính sách"),
    ("F6", "Gợi ý và tài nguyên học tập", "F6.1", "Mẫu gợi ý", "F6.1.1 CRUD mẫu; F6.1.2 Gắn tài nguyên; F6.1.3 Cấu hình phạm vi"),
    ("F6", "Gợi ý và tài nguyên học tập", "F6.2", "Gợi ý cá nhân", "F6.2.1 Sinh gợi ý; F6.2.2 Lưu; F6.2.3 Bắt đầu; F6.2.4 Hoàn thành; F6.2.5 Bỏ qua"),
    ("F6", "Gợi ý và tài nguyên học tập", "F6.3", "Tiến độ tài nguyên", "F6.3.1 Bắt đầu học; F6.3.2 Hoàn thành; F6.3.3 Bỏ qua; F6.3.4 Phản hồi"),
    ("F7", "Lộ trình phát triển", "F7.1", "Sinh lộ trình", "F7.1.1 Chọn gợi ý; F7.1.2 Xếp giai đoạn; F7.1.3 Áp dụng phụ thuộc; F7.1.4 Chốt phiên bản"),
    ("F7", "Lộ trình phát triển", "F7.2", "Theo dõi", "F7.2.1 Bắt đầu mục; F7.2.2 Hoàn thành; F7.2.3 Hủy/bỏ qua; F7.2.4 Tính tiến độ"),
    ("F7", "Lộ trình phát triển", "F7.3", "Quản trị vòng đời", "F7.3.1 Lưu lịch sử; F7.3.2 Archive; F7.3.3 Hoàn thành; F7.3.4 Sinh lại"),
    ("F8", "Cố vấn và nhận xét", "F8.1", "Theo dõi sinh viên", "F8.1.1 Danh sách được phân công; F8.1.2 Xem hồ sơ; F8.1.3 Xem phân tích/lộ trình"),
    ("F8", "Cố vấn và nhận xét", "F8.2", "Nhận xét", "F8.2.1 Tạo nhận xét; F8.2.2 Chấm mức; F8.2.3 Xem lịch sử"),
    ("F9", "Bảng điều khiển", "F9.1", "Dashboard sinh viên", "F9.1.1 Tổng quan hồ sơ; F9.1.2 Khoảng cách; F9.1.3 Việc quá hạn"),
    ("F9", "Bảng điều khiển", "F9.2", "Dashboard cố vấn", "F9.2.1 Sinh viên yếu; F9.2.2 Chờ xác minh; F9.2.3 Chậm đánh giá"),
    ("F9", "Bảng điều khiển", "F9.3", "Dashboard quản trị", "F9.3.1 Người dùng; F9.3.2 Độ phủ câu hỏi; F9.3.3 Kỹ năng thiếu; F9.3.4 Mục tiêu phổ biến"),
    ("F10", "Thông báo", "F10.1", "Hộp thư", "F10.1.1 Danh sách; F10.1.2 Đếm chưa đọc; F10.1.3 Đánh dấu đã đọc"),
    ("F10", "Thông báo", "F10.2", "Kích hoạt", "F10.2.1 Hồ sơ cũ; F10.2.2 Quá hạn; F10.2.3 Minh chứng; F10.2.4 Nhận xét"),
    ("F11", "Báo cáo và xuất dữ liệu", "F11.1", "Portfolio PDF", "F11.1.1 Chọn phạm vi; F11.1.2 Sinh file; F11.1.3 Tải có thời hạn"),
    ("F11", "Báo cáo và xuất dữ liệu", "F11.2", "Báo cáo Excel", "F11.2.1 Chọn bộ lọc; F11.2.2 Sinh nền; F11.2.3 Ghi log"),
    ("F12", "Vận hành và kiểm toán", "F12.1", "Nhật ký", "F12.1.1 Ghi hành động; F12.1.2 Tìm kiếm; F12.1.3 Xuất nhật ký"),
    ("F12", "Vận hành và kiểm toán", "F12.2", "Giám sát", "F12.2.1 Health check; F12.2.2 Theo dõi job; F12.2.3 Cảnh báo lỗi"),
]


USE_CASES = [
    ("UC-ACC-01", "Đăng nhập", "Người dùng", "F1.1", "Hiện có"),
    ("UC-ACC-02", "Quên và đặt lại mật khẩu", "Người dùng", "F1.2", "Cần bổ sung"),
    ("UC-ACC-03", "Khóa hoặc mở tài khoản", "Quản trị viên", "F1.3", "Hiện có"),
    ("UC-ACC-04", "Quản lý phân công cố vấn", "Quản trị viên", "F1.4", "API có, UI còn thiếu"),
    ("UC-CAT-01", "Quản lý nhóm và kỹ năng", "Quản trị viên", "F2.1", "Hiện có"),
    ("UC-CAT-02", "Quản lý mục tiêu, chuyên sâu và kỹ năng yêu cầu", "Quản trị viên", "F2.2", "Hiện có một phần UI"),
    ("UC-PRO-01", "Cập nhật hồ sơ chính", "Sinh viên", "F3.1", "Hiện có"),
    ("UC-PRO-02", "Quản lý kỹ năng, dự án, chứng chỉ, hoạt động, kinh nghiệm", "Sinh viên", "F3.2", "Hiện có"),
    ("UC-EVD-01", "Nộp hoặc nộp lại minh chứng", "Sinh viên", "F3.3", "Nộp có; sửa/nộp lại cần chuẩn hóa"),
    ("UC-EVD-02", "Xác minh hoặc từ chối minh chứng", "Cố vấn/Quản trị viên", "F3.3", "Hiện có"),
    ("UC-ASM-01", "Quản lý ngân hàng câu hỏi", "Quản trị viên", "F4.1", "Hiện có"),
    ("UC-ASM-02", "Bắt đầu bài đánh giá", "Sinh viên", "F4.2", "Hiện có"),
    ("UC-ASM-03", "Nộp và chấm bài", "Sinh viên/Hệ thống", "F4.3", "Hiện có"),
    ("UC-ASM-04", "Xem lịch sử bài đánh giá", "Sinh viên/Cố vấn", "F4.3", "Cần bổ sung API/UI"),
    ("UC-ENG-01", "Phân tích năng lực", "Sinh viên/Hệ thống", "F5", "Hiện có"),
    ("UC-REC-01", "Xem và cập nhật gợi ý", "Sinh viên", "F6.2", "Hiện có"),
    ("UC-REC-02", "Cập nhật tiến độ tài nguyên", "Sinh viên", "F6.3", "Hiện có"),
    ("UC-ROA-01", "Sinh lộ trình", "Sinh viên/Quản trị viên", "F7.1", "Hiện có"),
    ("UC-ROA-02", "Cập nhật trạng thái mục lộ trình", "Sinh viên", "F7.2", "Hiện có"),
    ("UC-ADV-01", "Xem sinh viên được phân công và ghi nhận xét", "Cố vấn", "F8", "API có, UI còn thiếu"),
    ("UC-DSH-01", "Xem dashboard theo vai trò", "Mọi vai trò", "F9", "Hiện có"),
    ("UC-NOT-01", "Xem và đánh dấu thông báo", "Người dùng", "F10", "Hiện có"),
    ("UC-EXP-01", "Xuất portfolio PDF", "Sinh viên", "F11.1", "Cần bổ sung"),
    ("UC-EXP-02", "Xuất báo cáo Excel", "Cố vấn/Quản trị viên", "F11.2", "Cần bổ sung"),
    ("UC-AUD-01", "Tra cứu nhật ký hoạt động", "Quản trị viên", "F12.1", "Cần bổ sung controller/UI"),
]


UC_DETAILS = {
    "UC-ACC-01": ("Người dùng", "Có tài khoản ACTIVE.", "Tạo access token và refresh cookie.", "Nhập email, mật khẩu; kiểm tra trạng thái; xác thực mật khẩu; phát hành phiên; điều hướng theo vai trò.", "Sai thông tin trả 401; tài khoản INACTIVE trả 403; ghi nhận thời điểm đăng nhập.", "User", "POST /api/auth/login", "TC-AUTH-01..04"),
    "UC-ACC-02": ("Người dùng", "Email tồn tại hoặc không; không tiết lộ sự tồn tại tài khoản.", "Tạo token đặt lại có hạn và vô hiệu sau sử dụng.", "Nhập email; tạo yêu cầu; gửi liên kết; nhập mật khẩu mới; thu hồi phiên cũ.", "Luôn trả thông điệp trung tính; giới hạn tần suất; token hết hạn trả 400.", "User, PasswordResetToken (đề xuất)", "POST /api/auth/forgot-password; POST /api/auth/reset-password", "TC-AUTH-05..08"),
    "UC-ACC-03": ("Quản trị viên", "Đã đăng nhập với quyền ADMIN.", "User chuyển ACTIVE/INACTIVE; phiên bị thu hồi khi khóa.", "Tìm user; xem chi tiết; khóa hoặc mở; nhập lý do; ghi activity log.", "Không tự khóa tài khoản cuối cùng có quyền quản trị; thao tác lặp phải idempotent.", "User, ActivityLog", "PATCH /api/users/:id/deactivate|reactivate", "TC-USR-01..04"),
    "UC-ACC-04": ("Quản trị viên", "Student và Lecturer hợp lệ.", "Phân công duy nhất được tạo/cập nhật.", "Chọn cố vấn; chọn sinh viên; đặt trạng thái; kiểm tra trùng; lưu; thông báo các bên.", "Cặp trùng trả 409; đối tượng inactive trả 400.", "AdvisorAssignment, Student, Lecturer", "/api/advisor-assignments", "TC-ADV-01..04"),
    "UC-CAT-01": ("Quản trị viên", "Có quyền quản trị catalog.", "Catalog hợp lệ; dữ liệu dẫn xuất được đánh dấu cũ khi cần.", "Tạo/sửa nhóm hoặc kỹ năng; kiểm tra trùng; lưu; chạy invalidation theo phạm vi.", "Không xóa cứng bản ghi đang được dùng; chuyển INACTIVE và ghi log.", "SkillCategory, Skill", "/api/skill-categories; /api/skills", "TC-CAT-01..06"),
    "UC-CAT-02": ("Quản trị viên", "Skill active đã tồn tại.", "Goal/spec/required skill nhất quán.", "Tạo goal; tạo specialization; cấu hình level, weight, learningOrder, phase; mô phỏng ảnh hưởng; kích hoạt.", "Specialization phải thuộc goal; skill không trùng trong cùng scope; tổng trọng số > 0.", "CareerGoal, Specialization, CareerRequiredSkill", "/api/career-goals; /api/admin/specializations", "TC-CAR-01..08"),
    "UC-PRO-01": ("Sinh viên", "Có user và student profile.", "Thông tin hồ sơ và context nghề nghiệp được cập nhật.", "Mở hồ sơ; sửa trường; chọn goal/spec; validate URL; lưu; đánh dấu analysis cũ nếu context đổi.", "Không nhận studentId từ body; specialization phải thuộc goal.", "StudentProfile", "PATCH /api/profiles/me", "TC-PRO-01..05"),
    "UC-PRO-02": ("Sinh viên", "Đã đăng nhập.", "Tài nguyên hồ sơ được CRUD theo chủ sở hữu.", "Chọn loại tài nguyên; nhập dữ liệu; validate; tạo/sửa/xóa; cập nhật completion.", "Không sửa dữ liệu người khác; không xóa cứng nếu cần giữ lịch sử.", "StudentSkill/Project/Certificate/Activity/Experience", "/api/profiles/me/*", "TC-PRO-06..14"),
    "UC-EVD-01": ("Sinh viên", "Tài nguyên liên quan thuộc chính sinh viên.", "Evidence PENDING được tạo; nguồn chuyển PENDING.", "Chọn nguồn; tải file hoặc URL; nhập ghi chú; quét loại/kích thước; lưu; gửi xác minh.", "Không có file lẫn URL trả 400; URL/file nguy hiểm bị từ chối; bản REJECTED có thể nộp lại bằng phiên bản mới.", "Evidence và tài nguyên liên quan", "POST /api/evidences hoặc nested profile endpoint", "TC-EVD-01..06"),
    "UC-EVD-02": ("Cố vấn/Quản trị viên", "Evidence PENDING; cố vấn có assignment ACTIVE.", "Evidence VERIFIED hoặc REJECTED; nguồn được tính lại.", "Mở hàng đợi; xem file an toàn; xác minh hoặc từ chối; nhập nhận xét; cập nhật mức nếu là skill; thông báo sinh viên.", "Không tự xác minh dữ liệu ngoài phạm vi; thao tác sau trạng thái cuối trả 409.", "Evidence, StudentSkill, Notification, ActivityLog", "PATCH /api/evidences/:id/verify|reject", "TC-EVD-07..12"),
    "UC-ASM-01": ("Quản trị viên", "Skill active tồn tại.", "Câu hỏi hợp lệ và có trạng thái rõ ràng.", "Nhập nội dung, type, level, options, giải thích; kiểm tra đúng một đáp án; lưu; theo dõi coverage.", "TRUE_FALSE đúng hai lựa chọn; SINGLE_CHOICE ít nhất hai; deactivate làm hủy bài đang dùng.", "AssessmentQuestion, AssessmentOption", "/api/assessment-questions", "TC-ASM-01..08"),
    "UC-ASM-02": ("Sinh viên", "Profile có goal; đủ coverage; không vi phạm attempt/cooldown.", "Assessment IN_PROGRESS với snapshot câu hỏi.", "Đọc context từ profile; hợp nhất required skill; kiểm tra coverage; chọn ngẫu nhiên; tạo item; trả expiresAt.", "Tối đa 3 lần; cooldown 30 phút; 60 phút; thiếu level bất kỳ thì chặn.", "Assessment, AssessmentQuestionItem", "POST /api/assessments/start", "TC-ASM-09..16"),
    "UC-ASM-03": ("Sinh viên/Hệ thống", "Assessment còn hạn và thuộc sinh viên.", "Bài GRADED, answer và skill result được lưu nguyên tử.", "Kiểm tra đủ câu; chấm đáp án; tổng hợp theo level; áp dụng ngưỡng liên tiếp 60%; cập nhật StudentSkill nếu cao hơn.", "Thiếu/trùng answer, option sai câu, quá hạn hoặc đã nộp đều bị từ chối.", "AssessmentAnswer, AssessmentSkillResult, StudentSkill", "POST /api/assessments/:id/submit", "TC-ASM-17..28"),
    "UC-ASM-04": ("Sinh viên/Cố vấn", "Có quyền trên sinh viên.", "Hiển thị lịch sử theo phạm vi và không lộ đáp án đúng khi chưa được phép.", "Lọc theo status, goal, thời gian; mở chi tiết; xem breakdown; so sánh tiến bộ.", "Cố vấn chỉ xem sinh viên được phân công; bài IN_PROGRESS không lộ isCorrect.", "Assessment và các bảng con", "GET /api/assessments/history (đề xuất)", "TC-ASM-29..33"),
    "UC-ENG-01": ("Sinh viên/Hệ thống", "Context và required skills hợp lệ.", "Analysis CURRENT, details và recommendations được lưu.", "Chuẩn hóa đầu vào; tính gap/match/priority/risk; giải thích; lưu snapshot; đánh dấu kết quả cũ; sinh gợi ý.", "Theo đặc tả chi tiết Chương 7; lỗi ENG-001..008.", "CompetencyAnalysisResult/Detail", "POST /api/competency-analysis/analyze/me", "ENG-AC-01..12"),
    "UC-REC-01": ("Sinh viên", "Có gợi ý trong context hiện tại.", "Trạng thái gợi ý chuyển hợp lệ.", "Lọc gợi ý; xem lý do và snapshot tài nguyên; lưu/bắt đầu/hoàn thành/bỏ qua; ghi feedback.", "Tuân thủ state machine; gợi ý OBSOLETE chỉ đọc; feedback là dữ liệu riêng.", "StudentRecommendation, RecommendationFeedback (đề xuất)", "GET /api/recommendations/me; PATCH /:id/status", "TC-REC-01..09"),
    "UC-REC-02": ("Sinh viên", "Resource active hoặc đã nằm trong snapshot.", "Progress cập nhật và đồng bộ gợi ý/lộ trình.", "Bắt đầu; ghi lần truy cập; hoàn thành hoặc bỏ qua; nếu mọi resource hoàn thành thì đóng gợi ý và item tương ứng.", "COMPLETED là trạng thái cuối; SKIPPED có thể quay lại IN_PROGRESS.", "StudentResourceProgress", "PATCH /api/learning-resources/:id/progress", "TC-REC-10..16"),
    "UC-ROA-01": ("Sinh viên/Quản trị viên", "Có analysis CURRENT và gợi ý actionable.", "Roadmap ACTIVE mới có version; bản cũ archive.", "Chọn best recommendation; xếp phase/order/priority; áp dụng dependency; tạo snapshot; tính tổng weight.", "Không có analysis hoặc gap trả 400; không archive khi đã có active trả 409.", "DevelopmentRoadmap, RoadmapItem", "POST /api/roadmaps/generate/me", "TC-ROA-01..09"),
    "UC-ROA-02": ("Sinh viên", "Item thuộc roadmap của mình.", "Status/progress và history đồng bộ.", "Chuyển TODO→IN_PROGRESS→DONE; ghi note; tính lại progress; đồng bộ recommendation/resource.", "Mở lại DONE bắt buộc note; CANCELLED là cuối; dependency chưa đạt thì chặn bắt đầu.", "RoadmapItem, StudentRoadmapProgress", "PATCH /api/roadmap-items/:id/status", "TC-ROA-10..18"),
    "UC-ADV-01": ("Cố vấn", "Assignment ACTIVE.", "Nhận xét được lưu và sinh thông báo.", "Mở danh sách; chọn sinh viên; xem hồ sơ/analysis/roadmap; nhập review/rating; gửi.", "Không xem ngoài assignment; rating 1-5; nội dung bắt buộc.", "AdvisorReview, Notification", "/api/advisor-reviews", "TC-ADV-05..10"),
    "UC-DSH-01": ("Mọi vai trò", "Đăng nhập hợp lệ.", "Trả đúng tập chỉ số theo vai trò và context hiện tại.", "Xác định vai trò; tổng hợp chỉ số; lọc CURRENT; trả cards, lists và links hành động.", "Không trộn goal/spec cũ; dashboard cố vấn áp dụng assignment; cache ngắn có scope.", "Projection từ nhiều bảng", "GET /api/dashboard/{student|lecturer|admin}", "TC-DSH-01..09"),
    "UC-NOT-01": ("Người dùng", "Đăng nhập hợp lệ.", "Thông báo của chính user được đọc/cập nhật.", "Lọc; xem unread; mở chi tiết; mark one/all; điều hướng tới entity liên quan.", "Không sửa thông báo người khác; createOnce chống trùng theo cửa sổ thời gian.", "Notification, NotificationLog", "/api/notifications/me", "TC-NOT-01..07"),
    "UC-EXP-01": ("Sinh viên", "Có profile; quyền xuất chính mình.", "ExportJob hoàn thành và file có thời hạn.", "Chọn nội dung; tạo job; snapshot dữ liệu; sinh PDF; lưu checksum và URL; thông báo hoàn tất.", "Ẩn dữ liệu nhạy cảm; giới hạn tần suất; file hết hạn; ghi ExportLog.", "ExportJob (đề xuất), ExportLog", "POST /api/exports/portfolio", "TC-EXP-01..06"),
    "UC-EXP-02": ("Cố vấn/Quản trị viên", "Có quyền và bộ lọc hợp lệ.", "Excel đúng scope, cột và định dạng.", "Chọn báo cáo, filter, cột; tạo job nền; kiểm tra scope; sinh file; ghi log.", "Cố vấn chỉ xuất assigned students; giới hạn số dòng; mã hóa file nếu chứa PII.", "ExportJob (đề xuất), ExportLog", "POST /api/exports/reports", "TC-EXP-07..12"),
    "UC-AUD-01": ("Quản trị viên", "Có quyền AUDIT_READ.", "Nhật ký chỉ đọc được trả theo filter.", "Lọc actor/action/entity/time; phân trang; mở detail; xuất nếu được phép.", "ActivityLog bất biến; ẩn secret/token; truy cập cũng phải ghi audit.", "ActivityLog", "GET /api/activity-logs (đề xuất)", "TC-AUD-01..05"),
}


ASSESSMENT_POLICY = [
    ["Loại câu hỏi v1", "SINGLE_CHOICE, TRUE_FALSE", "Đã có trong schema và service."],
    ["Loại mở rộng", "MULTIPLE_CHOICE, ORDERING", "Chỉ bổ sung sau khi chốt công thức chấm và UI."],
    ["Phạm vi câu hỏi", "skillId, level 1..requiredLevel, trạng thái ACTIVE", "Câu hỏi của skill inactive không được chọn."],
    ["Độ phủ tối thiểu", "Mỗi required skill có ít nhất 1 câu ACTIVE ở từng level 1..requiredLevel", "Thiếu bất kỳ level nào thì không cho bắt đầu."],
    ["Số câu mục tiêu", "min(6, max(requiredLevel × 2, requiredLevel)) cho mỗi skill", "Tối đa 6 câu/skill."],
    ["Chọn câu", "Bảo đảm mỗi level có ít nhất 1 câu, phần còn lại chọn ngẫu nhiên", "Lưu snapshot qua AssessmentQuestionItem."],
    ["Ngưỡng qua level", "Ít nhất 60% câu đúng của level", "Tính liên tiếp từ level 1; đứt chuỗi thì dừng."],
    ["Số lần làm", "Tối đa 3 lần hoàn thành trong cùng goal/spec", "Cần màn hình hiển thị số lần còn lại."],
    ["Cooldown", "30 phút", "Tính từ submittedAt hoặc startedAt của lần gần nhất."],
    ["Thời hạn", "60 phút", "Bài hết hạn chuyển CANCELLED khi bắt đầu lần mới; submit quá hạn bị chặn."],
    ["Cập nhật kỹ năng", "Chỉ tăng StudentSkill.currentLevel khi level mới cao hơn", "Không làm giảm mức đang có."],
    ["Lịch sử", "Lưu toàn bộ attempt, câu snapshot, answer, breakdown", "Cần bổ sung API/UI lịch sử."],
]

RECOMMENDATION_DESIGN = [
    ["RecommendationTemplate", "skill/category/goal/spec/level, type, title, description, difficulty, duration, priority, phase", "ACTIVE/INACTIVE; admin quản lý."],
    ["LearningResource", "type, URL, provider, duration, difficulty, language, isFree", "Gắn skill/targetLevel/phase/relevance."],
    ["Sinh gợi ý", "Ưu tiên template theo spec+goal+skill → goal+skill → category+skill → skill → mặc định", "Chỉ từ gap của analysis CURRENT."],
    ["Snapshot", "Copy metadata tài nguyên vào StudentRecommendationResource", "Giữ lịch sử khi resource/template thay đổi."],
    ["Trạng thái", "NEW → SAVED/DISMISSED; SAVED → IN_PROGRESS/DISMISSED; IN_PROGRESS → SAVED/DONE", "DONE/DISMISSED/OBSOLETE là trạng thái cuối."],
    ["Đồng bộ resource", "Mọi resource COMPLETED → recommendation DONE", "Đồng bộ roadmap item active tương ứng."],
    ["Phản hồi", "Phù hợp/không phù hợp + lý do + ghi chú", "Đề xuất thêm RecommendationFeedback."],
]

ROADMAP_DESIGN = [
    ["Nguồn", "Analysis CURRENT + recommendation actionable cùng analysis", "Không dùng gợi ý của context cũ."],
    ["Giai đoạn", "CORE_FOUNDATION, CAREER_TRACK, SPECIALIZATION, PRACTICE_PROJECT, PORTFOLIO_PREPARATION", "Sắp theo phase trước learningOrder."],
    ["Thứ tự", "phase → learningOrder → priorityScore giảm → template priority giảm → tên skill", "Quy tắc xác định và kiểm thử được."],
    ["Phụ thuộc", "predecessorItemId hoặc bảng RoadmapItemDependency", "Đề xuất bổ sung để chặn task học sai thứ tự."],
    ["Tiến độ", "Tổng weight item DONE / tổng weight item không CANCELLED × 100", "100% chuyển roadmap COMPLETED."],
    ["Lịch sử", "Mọi thay đổi trạng thái ghi StudentRoadmapProgress", "Mở lại DONE phải có note."],
    ["Phiên bản", "Mỗi student tăng version; roadmap cũ ARCHIVED khi sinh mới", "Kết quả lịch sử không bị viết lại."],
]

NOTIFICATION_EVENTS = [
    ["Hồ sơ không cập nhật", "Sinh viên", "lastUpdatedAt quá 30 ngày", "08:00 hằng ngày", "PROFILE_REMINDER", "24 giờ"],
    ["Chưa chọn mục tiêu", "Sinh viên", "careerGoalId rỗng", "08:30 hằng ngày", "PROFILE_REMINDER", "24 giờ"],
    ["Minh chứng được xác minh", "Sinh viên", "Evidence → VERIFIED", "Theo sự kiện", "EVIDENCE_VERIFIED", "Theo evidence"],
    ["Minh chứng bị từ chối", "Sinh viên", "Evidence = REJECTED", "Mỗi giờ", "EVIDENCE_REJECTED", "30 ngày"],
    ["Mục lộ trình quá hạn", "Sinh viên", "deadline < hiện tại và chưa xong", "09:00 hằng ngày", "ROADMAP_REMINDER", "24 giờ"],
    ["Hồ sơ yếu", "Sinh viên", "completion<50 hoặc match<40 hoặc risk>=60", "09:30 hằng ngày", "WEAK_PROFILE_ALERT", "24 giờ"],
    ["Nhận xét cố vấn", "Sinh viên", "AdvisorReview được tạo", "Theo sự kiện", "ADVISOR_REVIEW", "Theo review"],
]

DASHBOARD_METRICS = [
    ["Sinh viên", "completionPercent; matchPercent; career goal; top gap; roadmap progress; overdue item; unread notification", "Context goal/spec hiện tại và analysis CURRENT", "Hành động: hoàn thiện hồ sơ, đánh giá, xem gợi ý, tiếp tục lộ trình"],
    ["Cố vấn", "số sinh viên được phân công; weak students; pending evidence; chưa đánh giá; task quá hạn", "Chỉ assignment ACTIVE", "Hành động: mở sinh viên, xác minh, viết nhận xét"],
    ["Quản trị", "tổng student/lecturer; top missing skills; top career goals; question coverage; job lỗi", "Toàn hệ thống, có bộ lọc thời gian", "Hành động: sửa catalog, bổ sung câu hỏi, quản trị user"],
]

EXPORT_DESIGN = [
    ["Portfolio PDF", "Thông tin cá nhân đã cho phép; mục tiêu; kỹ năng; dự án; chứng chỉ; hoạt động; kết quả phân tích; lộ trình", "Sinh viên của chính mình", "PDF/A hoặc PDF chuẩn, tên file có thời gian, URL ký có hạn"],
    ["Danh sách sinh viên Excel", "Mã, họ tên, lớp, ngành, goal, completion, match, risk, last analyzed", "Admin; cố vấn chỉ assigned", "XLSX có header, filter, freeze pane, kiểu dữ liệu đúng"],
    ["Khoảng cách năng lực Excel", "Student, goal/spec, skill, current, required, gap, priority, status", "Admin/cố vấn theo scope", "Một dòng mỗi skill detail; ghi policyVersion"],
    ["Nhật ký export", "userId, exportType, filter snapshot, status, fileUrl, checksum, expiresAt", "Hệ thống", "Đề xuất thêm ExportJob thay vì chỉ ExportLog"],
]

SCREEN_SPECS = [
    ["Chung", "Đăng nhập", "Xác thực và điều hướng", "email, password", "Đăng nhập", "Email hợp lệ; mật khẩu bắt buộc", "POST /auth/login", "loading, 401, locked"],
    ["Chung", "Quên mật khẩu", "Khôi phục tài khoản", "email; token; password mới", "Gửi liên kết; đặt lại", "Thông điệp trung tính; token còn hạn", "POST /auth/forgot-password; /reset-password", "success, expired, rate-limit"],
    ["Sinh viên", "Dashboard", "Tóm tắt trạng thái và việc tiếp theo", "completion, match, gaps, roadmap, notifications", "Mở assessment/analysis/roadmap", "Chỉ context hiện tại", "GET /dashboard/student", "loading, chưa goal, chưa analysis"],
    ["Sinh viên", "Hồ sơ", "Quản lý hồ sơ chính", "goal, spec, summary, URLs, avatar", "Sửa; lưu; tải ảnh", "Spec thuộc goal; URL hợp lệ", "GET/PATCH /profiles/me", "empty, validation, upload error"],
    ["Sinh viên", "Kỹ năng", "Quản lý mức tự khai và trạng thái xác minh", "skill, currentLevel, verification", "Thêm; sửa; xóa; nộp minh chứng", "Không trùng skill; level đúng miền", "/profiles/me/skills", "empty, conflict, pending"],
    ["Sinh viên", "Dự án/Chứng chỉ/Hoạt động/Kinh nghiệm", "Quản lý tài nguyên hồ sơ", "Danh sách, trạng thái, thời gian, URL", "CRUD; nộp minh chứng", "Ngày và URL hợp lệ", "/profiles/me/{resource}", "empty, loading, permission"],
    ["Sinh viên", "Minh chứng", "Theo dõi hàng đợi xác minh", "type, resource, file/URL, status, reviewerNote", "Nộp; xem; nộp lại", "File/URL bắt buộc", "/evidences/me", "upload progress, rejected, verified"],
    ["Sinh viên", "Bài đánh giá", "Làm bài có thời hạn", "attempt, expiresAt, questions, answers", "Bắt đầu; chọn đáp án; nộp", "Đủ mọi câu; cảnh báo hết giờ", "POST /assessments/start; /:id/submit", "coverage error, cooldown, timeout"],
    ["Sinh viên", "Lịch sử đánh giá", "So sánh các lần làm", "attempt, goal/spec, skill breakdown", "Lọc; xem chi tiết", "Không lộ đáp án đúng ngoài chính sách", "GET /assessments/history (đề xuất)", "empty, forbidden"],
    ["Sinh viên", "Phân tích năng lực", "Giải thích mức phù hợp và khoảng cách", "match, coverage, risk, details, explanations", "Phân tích lại; mở gợi ý", "Chặn khi dữ liệu thiếu", "/competency-analysis/*", "processing, stale, ENG error"],
    ["Sinh viên", "Gợi ý", "Chọn hành động phát triển", "skill, reason, priority, resources, status", "Lưu; bắt đầu; hoàn thành; bỏ qua; feedback", "State transition hợp lệ", "/recommendations/me", "empty, obsolete, conflict"],
    ["Sinh viên", "Lộ trình", "Thực hiện nhiệm vụ theo giai đoạn", "phase, items, dependency, deadline, progress", "Sinh; bắt đầu; hoàn thành; mở lại", "Dependency và note", "/roadmaps/*", "no-analysis, active-conflict, overdue"],
    ["Sinh viên", "Thông báo", "Theo dõi sự kiện cần hành động", "title, content, type, isRead", "Mở; đánh dấu; đọc tất cả", "Chỉ thông báo của mình", "/notifications/me", "empty, pagination"],
    ["Sinh viên", "Portfolio", "Xem trước và xuất PDF", "các mục được chọn; quyền riêng tư", "Preview; export; tải", "Ẩn trường nhạy cảm", "/exports/portfolio (đề xuất)", "queued, generating, failed, expired"],
    ["Cố vấn", "Dashboard", "Ưu tiên sinh viên cần hỗ trợ", "assigned count, weak count, pending evidence", "Mở hàng đợi", "Scope assignment", "GET /dashboard/lecturer", "empty, permission"],
    ["Cố vấn", "Sinh viên được phân công", "Tra cứu danh sách và chi tiết", "profile, analysis, roadmap, review", "Lọc; mở; nhận xét", "Assignment ACTIVE", "/students; /profiles/:studentId", "empty, 403"],
    ["Cố vấn", "Xác minh minh chứng", "Duyệt nguồn năng lực", "preview, student, resource, note", "Verify; reject", "Nhận xét bắt buộc khi reject", "/evidences/pending", "file error, conflict"],
    ["Cố vấn", "Nhận xét", "Ghi đánh giá định kỳ", "reviewContent, suggestion, rating", "Tạo; xem lịch sử", "rating 1-5", "/advisor-reviews", "validation, forbidden"],
    ["Quản trị", "Dashboard", "Giám sát toàn hệ thống", "user counts, missing skills, goals, coverage", "Đi tới catalog/report", "Dữ liệu toàn hệ thống", "GET /dashboard/admin", "loading, degraded"],
    ["Quản trị", "Người dùng/Sinh viên/Giảng viên", "Quản trị vòng đời tài khoản", "search, role, status, profile fields", "Tạo; sửa; khóa; mở; reset", "Email/mã duy nhất", "/users; /students; /lecturers", "conflict, inactive"],
    ["Quản trị", "Danh mục", "Quản lý skill, goal, spec, required skill", "catalog fields, weight, phase", "CRUD; activate; simulate", "Không trùng; scope hợp lệ", "/skills; /career-goals; /admin/specializations", "in-use, invalidation warning"],
    ["Quản trị", "Ngân hàng câu hỏi", "Bảo đảm độ phủ assessment", "skill, level, type, options, coverage", "CRUD; activate; filter gap", "Đúng một đáp án; đủ level", "/assessment-questions", "coverage warning, conflict"],
    ["Quản trị", "Tài nguyên và mẫu gợi ý", "Cấu hình nội dung phát triển", "resource/template/scope/link", "CRUD; link; preview", "Scope và URL hợp lệ", "/learning-resources; /recommendation-templates", "duplicate, inactive"],
    ["Quản trị", "Chính sách Engine", "Phiên bản hóa quy tắc", "thresholds, weights, stale window", "Draft; simulate; activate", "Không sửa bản active", "/analysis-policies (đề xuất)", "validation, concurrent activation"],
    ["Quản trị", "Báo cáo và audit", "Xuất và điều tra vận hành", "filters, columns, logs, job status", "Export; tải; mở audit", "Quyền theo loại báo cáo", "/exports; /activity-logs (đề xuất)", "queued, failed, expired"],
]

RBAC_ROWS = [
    ["GET /profiles/:studentId", "Chỉ hồ sơ của mình qua /me", "Sinh viên được phân công", "Tất cả", "Kiểm tra scope tại service"],
    ["PATCH /profiles/me", "Có", "Không", "Không dùng endpoint này", "StudentId lấy từ JWT"],
    ["POST /evidences", "Có, resource của mình", "Không", "Không", "Upload riêng tư"],
    ["GET /evidences/:id", "Của mình", "Được phân công", "Tất cả", "Ẩn đường dẫn vật lý"],
    ["PATCH /evidences/:id/verify|reject", "Không", "Được phân công", "Có", "Ghi reviewer và audit"],
    ["POST /assessments/start", "Có", "Không", "Không", "Không nhận studentId tùy ý"],
    ["POST /assessments/:id/submit", "Bài của mình", "Không", "Không", "Kiểm tra owner + context"],
    ["POST /competency-analysis/analyze/me", "Có", "Không", "Không", "Subject lấy từ phiên"],
    ["POST /competency-analysis/students/:id/analyze", "Không", "Được phân công", "Có", "Ghi requestedBy"],
    ["GET /competency-analysis/analysis-results/:id", "Của mình", "Được phân công", "Tất cả", "Không lộ chéo student"],
    ["GET /recommendations/me", "Có", "Không", "Không", "Chỉ context hiện tại"],
    ["PATCH /learning-resources/:id/progress", "Có", "Không", "Không", "Progress theo student từ JWT"],
    ["POST /roadmaps/generate/me", "Có", "Không", "Không", "Chỉ analysis CURRENT"],
    ["GET /roadmaps/:id", "Của mình", "Được phân công", "Tất cả", "Scope tại service"],
    ["PATCH /roadmap-items/:id/status", "Item của mình", "Không", "Hỗ trợ có audit", "Kiểm tra roadmap owner"],
    ["POST /advisor-reviews/students/:id", "Không", "Được phân công", "Có", "Rating 1-5"],
    ["GET /dashboard/student", "Có", "Không", "Không", "Role guard"],
    ["GET /dashboard/lecturer", "Không", "Có", "Không", "Role guard + assignment"],
    ["GET /dashboard/admin", "Không", "Không", "Có", "Role guard"],
    ["POST /analysis-policies/:id/activate", "Không", "Không", "Có", "Quyền cấu hình riêng + audit"],
    ["POST /exports/portfolio", "Chính mình", "Không", "Hỗ trợ có lý do", "File URL có hạn"],
    ["POST /exports/reports", "Không", "Assigned scope", "Có", "Snapshot filter và audit"],
    ["GET /activity-logs", "Không", "Không", "Có", "Quyền AUDIT_READ"],
]


TEST_CASES = [
    ["TC-AUTH-01", "Auth", "Email/mật khẩu đúng; user ACTIVE", "Login thành công, trả access token và refresh cookie"],
    ["TC-AUTH-02", "Auth", "Mật khẩu sai", "401; không tiết lộ trường nào sai"],
    ["TC-AUTH-03", "Auth", "User INACTIVE", "403; không phát hành phiên"],
    ["TC-AUTH-04", "Auth", "Refresh token cũ sau logout", "401; token không dùng lại"],
    ["TC-AUTH-05", "Auth", "Quên mật khẩu với email không tồn tại", "Thông điệp giống email tồn tại"],
    ["TC-USR-01", "User admin", "Tạo student trùng email/mã", "409; không tạo bản ghi dở dang"],
    ["TC-USR-02", "User admin", "Khóa user đang có phiên", "Phiên tiếp theo bị từ chối"],
    ["TC-USR-03", "User admin", "Reset mật khẩu thiếu số", "400 validation"],
    ["TC-ADV-01", "Assignment", "Tạo cặp lecturer/student đã tồn tại", "409"],
    ["TC-ADV-02", "Assignment", "Lecturer xem student không được phân công", "403 hoặc 404 an toàn"],
    ["TC-CAT-01", "Catalog", "Tạo tên category trùng", "409"],
    ["TC-CAT-02", "Catalog", "Deactivate skill đang được dùng", "Dữ liệu dẫn xuất trong scope chuyển obsolete/archive/cancel"],
    ["TC-CAT-03", "Career", "Specialization không thuộc goal", "400"],
    ["TC-CAT-04", "Career", "requiredLevel ngoài miền hoặc weight <= 0", "400"],
    ["TC-PRO-01", "Profile", "Student sửa profile của người khác", "Bị chặn ở route/service"],
    ["TC-PRO-02", "Profile", "Đổi goal", "Analysis CURRENT cũ obsolete; roadmap active archive"],
    ["TC-PRO-03", "Profile", "Thêm skill trùng", "409 unique"],
    ["TC-EVD-01", "Evidence", "Không file và không URL", "400"],
    ["TC-EVD-02", "Evidence", "Upload file sai MIME/kích thước", "400; không lưu file công khai"],
    ["TC-EVD-03", "Evidence", "Cố vấn verify ngoài assignment", "403/404"],
    ["TC-EVD-04", "Evidence", "Reject không reviewerNote", "400"],
    ["TC-EVD-05", "Evidence", "Verify skill kèm currentLevel hợp lệ", "StudentSkill cập nhật verifier và mức"],
    ["TC-EVD-06", "Evidence", "Nộp lại bản rejected", "Tạo revision PENDING, giữ lịch sử cũ"],
    ["TC-ASM-01", "Question bank", "SINGLE_CHOICE có hai đáp án đúng", "400"],
    ["TC-ASM-02", "Question bank", "TRUE_FALSE có ba options", "400"],
    ["TC-ASM-03", "Question bank", "Deactivate câu đang nằm trong bài", "Bài IN_PROGRESS liên quan bị CANCELLED"],
    ["TC-ASM-04", "Assessment", "Thiếu câu hỏi level 2 cho skill requiredLevel=3", "Không bắt đầu; lỗi nêu skill và missing level"],
    ["TC-ASM-05", "Assessment", "Đã có bài còn hạn", "Không tạo bài thứ hai"],
    ["TC-ASM-06", "Assessment", "Vượt 3 lần", "Bị chặn"],
    ["TC-ASM-07", "Assessment", "Trong cooldown 30 phút", "Bị chặn, trả thời điểm thử lại"],
    ["TC-ASM-08", "Assessment", "Submit thiếu answer", "400; không lưu một phần"],
    ["TC-ASM-09", "Assessment", "Submit answer trùng questionId", "400"],
    ["TC-ASM-10", "Assessment", "Submit sau 60 phút", "400; không chấm"],
    ["TC-ASM-11", "Assessment", "Level1=60%, level2=100%", "calculatedLevel=2"],
    ["TC-ASM-12", "Assessment", "Level1=40%, level2=100%", "calculatedLevel=0"],
    ["TC-ASM-13", "Assessment", "Kết quả thấp hơn currentLevel", "Không làm giảm StudentSkill"],
    ["TC-ENG-01", "Engine", "Cùng fingerprint và policy", "Kết quả xác định giống nhau"],
    ["TC-ENG-02", "Engine", "Đảo thứ tự skill", "Điểm và xếp hạng không đổi"],
    ["TC-REC-01", "Recommendation", "NEW → IN_PROGRESS trực tiếp", "400 transition"],
    ["TC-REC-02", "Recommendation", "DISMISSED → SAVED", "400 trạng thái cuối"],
    ["TC-REC-03", "Resource", "Tất cả resource completed", "Recommendation và roadmap item DONE"],
    ["TC-REC-04", "Recommendation", "Catalog thay đổi", "Actionable recommendations OBSOLETE"],
    ["TC-ROA-01", "Roadmap", "Không có analysis CURRENT", "400"],
    ["TC-ROA-02", "Roadmap", "Có active roadmap và không cho archive", "409"],
    ["TC-ROA-03", "Roadmap", "Bắt đầu item khi dependency chưa DONE", "400"],
    ["TC-ROA-04", "Roadmap", "Mở lại DONE không note", "400"],
    ["TC-ROA-05", "Roadmap", "Mọi item không cancelled DONE", "Roadmap COMPLETED, progress=100"],
    ["TC-DSH-01", "Dashboard", "Student đổi goal", "Dashboard không trộn analysis goal cũ"],
    ["TC-DSH-02", "Dashboard", "Lecturer có 2 assignment active, 1 inactive", "Chỉ tổng hợp 2 active"],
    ["TC-NOT-01", "Notification", "Scheduler chạy lặp trong dedup window", "Không tạo bản sao"],
    ["TC-NOT-02", "Notification", "Mark notification của user khác", "404"],
    ["TC-EXP-01", "Export", "Student export portfolio người khác", "403/404"],
    ["TC-EXP-02", "Export", "Cố vấn export ngoài assigned scope", "Không có dữ liệu ngoài phạm vi"],
    ["TC-EXP-03", "Export", "Job vượt giới hạn dòng", "Chuyển async/chia file hoặc báo lỗi rõ"],
    ["TC-SEC-01", "Security", "Thay studentId trong URL/body", "Không vượt qua ownership/scope"],
    ["TC-SEC-02", "Security", "Upload tên file chứa path traversal", "Tên được chuẩn hóa; lưu private"],
    ["TC-SEC-03", "Security", "Input search có ký tự đặc biệt", "Prisma parameterized; không injection"],
]


TRACEABILITY = [
    ["FR-ACC-01", "UC-ACC-01", "POST /auth/login", "User", "TC-AUTH-01..04", "Đã có"],
    ["FR-ACC-04", "UC-ACC-02", "POST /auth/forgot-password", "PasswordResetToken", "TC-AUTH-05", "Thiếu"],
    ["FR-ACC-02", "UC-ACC-03", "PATCH /users/:id/deactivate", "User, ActivityLog", "TC-USR-02", "Đã có"],
    ["FR-ACC-03", "UC-ACC-04", "/advisor-assignments", "AdvisorAssignment", "TC-ADV-01..02", "API có"],
    ["FR-CAT-01", "UC-CAT-01", "/skill-categories; /skills", "SkillCategory, Skill", "TC-CAT-01..02", "Đã có"],
    ["FR-CAT-03", "UC-CAT-02", "/career-goals; /admin/specializations", "CareerGoal, Specialization, CareerRequiredSkill", "TC-CAT-03..04", "Đã có"],
    ["FR-PRO-01", "UC-PRO-01", "PATCH /profiles/me", "StudentProfile", "TC-PRO-01..02", "Đã có"],
    ["FR-PRO-02", "UC-PRO-02", "/profiles/me/*", "StudentSkill/Project/Certificate/Activity/Experience", "TC-PRO-03", "Đã có"],
    ["FR-EVD-01", "UC-EVD-01", "POST /evidences", "Evidence", "TC-EVD-01..02,06", "Có; revision cần bổ sung"],
    ["FR-EVD-02", "UC-EVD-02", "PATCH /evidences/:id/verify|reject", "Evidence, Notification", "TC-EVD-03..05", "Đã có"],
    ["FR-ASM-01", "UC-ASM-01", "/assessment-questions", "AssessmentQuestion/Option", "TC-ASM-01..03", "Đã có"],
    ["FR-ASM-02", "UC-ASM-02", "POST /assessments/start", "Assessment/QuestionItem", "TC-ASM-04..07", "Đã có"],
    ["FR-ASM-03", "UC-ASM-03", "POST /assessments/:id/submit", "Answer/SkillResult/StudentSkill", "TC-ASM-08..13", "Đã có"],
    ["FR-ASM-04", "UC-ASM-04", "GET /assessments/history", "Assessment + children", "TC-ASM-HIS", "Thiếu"],
    ["FR-ENG-01..08", "UC-ENG-01", "/competency-analysis/*", "CompetencyAnalysisResult/Detail", "ENG-AC-01..12", "Đã có"],
    ["FR-REC-01", "UC-REC-01", "GET/PATCH /recommendations", "StudentRecommendation", "TC-REC-01..02,04", "Đã có"],
    ["FR-REC-02", "UC-REC-02", "PATCH /learning-resources/:id/progress", "StudentResourceProgress", "TC-REC-03", "Đã có"],
    ["FR-ROA-01", "UC-ROA-01", "POST /roadmaps/generate/me", "DevelopmentRoadmap/RoadmapItem", "TC-ROA-01..02", "Đã có"],
    ["FR-ROA-02", "UC-ROA-02", "PATCH /roadmap-items/:id/status", "RoadmapItem/Progress", "TC-ROA-03..05", "Dependency thiếu"],
    ["FR-ADV-01", "UC-ADV-01", "/advisor-reviews", "AdvisorReview", "TC-ADV-05..10", "API có; UI thiếu"],
    ["FR-DSH-01", "UC-DSH-01", "/dashboard/*", "Projection", "TC-DSH-01..02", "Đã có"],
    ["FR-NOT-01", "UC-NOT-01", "/notifications/me", "Notification/Log", "TC-NOT-01..02", "Đã có"],
    ["FR-EXP-01", "UC-EXP-01", "POST /exports/portfolio", "ExportJob/Log", "TC-EXP-01", "Thiếu"],
    ["FR-EXP-02", "UC-EXP-02", "POST /exports/reports", "ExportJob/Log", "TC-EXP-02..03", "Thiếu"],
    ["FR-AUD-01", "UC-AUD-01", "GET /activity-logs", "ActivityLog", "TC-AUD-01..05", "Service/model có; controller thiếu"],
]


SOURCE_ALIGNMENT = [
    ["Auth", "Login, refresh, logout, me/profile, change password", "Register; forgot/reset password; rate limit", "Bổ sung token đặt lại một lần; thu hồi phiên; UI quên mật khẩu", "P1"],
    ["User/Student/Lecturer", "API list/detail/update/status; tạo student/lecturer; import student", "UI quản trị đang placeholder; không có create user generic", "Hoàn thiện UI và audit lý do khóa/reset", "P1"],
    ["Advisor assignment", "API CRUD và unique pair", "UI placeholder", "Hoàn thiện màn hình phân công và filter tải", "P1"],
    ["Catalog/Career", "API skill/category/goal/spec/required skill", "Chưa có màn hình mô phỏng ảnh hưởng cấu hình", "Thêm preview invalidation và kiểm tra coverage", "P1"],
    ["Profile", "API/UI profile, skill, project, certificate, activity, experience, avatar", "Chưa có cơ chế revision chuẩn hóa", "Bổ sung version/history cho tài nguyên quan trọng", "P2"],
    ["Evidence", "Upload, pending queue, verify/reject, assignment scope", "Chưa có revision/expiry; verify notification cần rà", "Thêm revisionOf, expiresAt, checksum, policy file", "P1"],
    ["Question bank", "CRUD UI/API; SINGLE_CHOICE/TRUE_FALSE", "Chưa có dashboard coverage và import", "Thêm coverage projection, bulk import/validate", "P1"],
    ["Assessment runtime", "Start/submit; 3 attempts; cooldown 30m; limit 60m; 60% liên tiếp", "Thiếu history/detail API/UI; policy hard-code", "Đưa policy vào cấu hình có version; thêm history", "P0"],
    ["Competency Engine", "Engine, API, UI, history/detail, recommendations", "Thiết kế policy trong tài liệu chưa có model/controller tương ứng", "Bổ sung AnalysisPolicy hoặc xác định cấu hình tĩnh là chủ ý", "P0"],
    ["Recommendation", "Template/resource/snapshot/status/progress sync", "Thiếu feedback entity/API", "Thêm feedback và báo cáo hiệu quả resource", "P1"],
    ["Roadmap", "Generate/current/history/detail/update item; phase/order/progress", "Builder miền đơn giản; chưa có dependency rõ", "Thêm dependency và capacity; thống nhất một builder", "P1"],
    ["Advisor review", "API create/list/detail theo scope", "Frontend review placeholder", "Hoàn thiện UI và liên kết notification", "P1"],
    ["Dashboard", "API/UI ba vai trò", "Admin chưa có question coverage/job health; lecturer còn ít chỉ số", "Mở rộng metrics theo đặc tả", "P2"],
    ["Notification", "Inbox, unread, read/all; 5 cron job; dedup", "Email channel có enum/log nhưng chưa thấy sender hoàn chỉnh", "Tách template, preference và retry policy", "P2"],
    ["Export", "ExportLog service và enum", "Không có export controller/job; UI reports/portfolio placeholder", "Xây ExportJob async, PDF/XLSX, URL ký và cleanup", "P1"],
    ["Activity log", "Model/service nội bộ; nhiều thao tác ghi log", "Không có controller/UI tra cứu", "Thêm read-only API, retention và quyền AUDIT_READ", "P2"],
    ["Frontend typing", "Có types/domain dùng chung", "Một số enum legacy có thể lệch Prisma", "Sinh type từ OpenAPI hoặc package schema dùng chung", "P1"],
    ["Kiểm thử", "Có spec cho nhiều service/module", "Thiếu E2E theo role và contract; frontend test chưa rõ", "Bổ sung test pyramid và test data fixture", "P1"],
]


PROPOSED_APIS = [
    ["POST", "/api/auth/forgot-password", "Public", "email", "accepted", "400/429"],
    ["POST", "/api/auth/reset-password", "Public", "token, newPassword", "success", "400/410/429"],
    ["GET", "/api/assessments/history", "Student", "page, status, goalId", "AssessmentPage", "401/403"],
    ["GET", "/api/assessments/:id", "Owner/Advisor/Admin", "-", "AssessmentDetail", "403/404"],
    ["GET", "/api/admin/assessment-coverage", "Admin", "goalId, specId", "CoverageReport", "400/403"],
    ["POST", "/api/recommendations/:id/feedback", "Student", "rating, reason, note", "Feedback", "400/403/409"],
    ["GET/POST", "/api/analysis-policies", "Admin", "policy payload", "PolicyView", "400/403/409"],
    ["POST", "/api/analysis-policies/:id/activate", "Admin", "reason", "ActivatedPolicy", "400/403/409"],
    ["POST", "/api/exports/portfolio", "Student", "sections, locale", "ExportJob", "400/403/429"],
    ["POST", "/api/exports/reports", "Advisor/Admin", "type, filters, columns", "ExportJob", "400/403/413"],
    ["GET", "/api/exports/:id", "Owner/Admin", "-", "ExportJob", "403/404"],
    ["GET", "/api/activity-logs", "Admin", "actor, action, entity, time", "ActivityLogPage", "403"],
]


def parse_controller_endpoints(root: Path) -> list[list[str]]:
    endpoints: list[list[str]] = []
    for path in sorted(root.rglob("*.controller.ts")):
        text = path.read_text(encoding="utf-8")
        controllers = list(re.finditer(r"@Controller\((.*?)\)\s*export class\s+\w+", text, re.S))
        if not controllers:
            continue
        for ci, controller in enumerate(controllers):
            controller_arg = controller.group(1)
            quoted = re.findall(r"['\"]([^'\"]*)['\"]", controller_arg)
            prefix = quoted[0] if quoted else ""
            end = controllers[ci + 1].start() if ci + 1 < len(controllers) else len(text)
            lines = text[controller.end():end].splitlines()
            pending_roles: list[str] = []
            public = False
            for i, line in enumerate(lines):
                role_match = re.search(r"@Roles\((.*?)\)", line)
                if role_match:
                    pending_roles = re.findall(r"UserRole\.(\w+)", role_match.group(1))
                if "@Public()" in line:
                    public = True
                route = re.search(r"@(Get|Post|Patch|Put|Delete)\((.*?)\)", line)
                if not route:
                    continue
                method = route.group(1).upper()
                route_values = re.findall(r"['\"]([^'\"]*)['\"]", route.group(2))
                sub = route_values[0] if route_values else ""
                endpoint = "/api/" + "/".join(x.strip("/") for x in (prefix, sub) if x.strip("/"))
                endpoint = endpoint.rstrip("/") or "/api"
                block = "\n".join(lines[i:i+18])
                body = re.search(r"@Body\(\)\s+\w+\s*:\s*(\w+)", block)
                query = re.search(r"@Query\(\)\s+\w+\s*:\s*(\w+)", block)
                request = body.group(1) if body else (query.group(1) if query else "-")
                roles = "Public" if public else ("/".join(pending_roles) if pending_roles else "Authenticated")
                module = path.parent.name.replace("-", " ")
                response = f"{module} response"
                errors = "401/403" if roles != "Public" else "400/401"
                if any(token in sub for token in (":id", ":studentId", ":careerGoalId")):
                    errors += "/404"
                if method in {"POST", "PATCH", "PUT", "DELETE"}:
                    errors += "/409"
                endpoints.append([method, endpoint, roles, request, response, errors])
                pending_roles = []
                public = False
    endpoints.sort(key=lambda row: (row[1], row[0]))
    return endpoints


def replace_front_matter(doc: Document):
    replacements = {
        "Trọng tâm thiết kế: Competency Analysis Engine": "Trọng tâm thiết kế: Toàn hệ thống, trong đó Competency Analysis Engine là lõi phân tích",
        "Định hướng: Phân tích và thiết kế theo hướng chức năng": "Định hướng: Đặc tả triển khai toàn hệ thống và đối chiếu mã nguồn",
        "Phiên bản tài liệu: 2.0": "Phiên bản tài liệu: 3.0",
        "Tài liệu mô tả hệ thống ở trạng thái dự kiến, không dựa vào chi tiết cài đặt, tên tệp mã nguồn hay trạng thái hoàn thành của giao diện. Mỗi yêu cầu được trình bày theo góc nhìn nghiệp vụ và có tiêu chí nghiệm thu đủ rõ để chuyển sang thiết kế chi tiết và lập trình.":
            "Tài liệu gồm hai lớp: thiết kế đích đủ chi tiết để phát triển và phần đối chiếu với hiện trạng mã nguồn. Engine vẫn là lõi phân tích, nhưng mọi module đầu vào, đầu ra và vận hành đều được đặc tả bằng chức năng, use case, dữ liệu, API, giao diện, quyền và kiểm thử.",
    }
    for p in doc.paragraphs:
        if p.text in replacements:
            p.text = replacements[p.text]
    if doc.tables:
        info = doc.tables[0]
        for row in info.rows:
            key = row.cells[0].text.strip()
            if key == "Mục đích":
                row.cells[1].text = "Làm cơ sở phê duyệt thiết kế, lập kế hoạch phát triển, đối chiếu code và nghiệm thu toàn hệ thống."
            elif key == "Phương pháp":
                row.cells[1].text = "Phân tích chức năng, use case, mô hình dữ liệu, hợp đồng API, đặc tả UI, truy vết và đối chiếu hiện trạng triển khai."
            elif key.lower().startswith("phiên bản"):
                row.cells[1].text = "3.0 - Bản chuyên nghiệp toàn hệ thống"
    for table in doc.tables:
        if "Kết thúc tài liệu" in table.cell(0, 0).text:
            table.cell(0, 0).text = "Kết thúc Phần I\nPhần II tiếp theo bổ sung đặc tả triển khai toàn hệ thống và đối chiếu với codebase hiện tại."


def extend_toc(doc: Document):
    toc = None
    for table in doc.tables:
        if table.rows and len(table.columns) == 2 and table.cell(0, 0).text.strip() == "Nội dung" and table.cell(0, 1).text.strip() == "Trang":
            toc = table
            break
    if toc is None:
        return
    additions = [
        "15. Phân rã chức năng chi tiết",
        "16. Mô hình và đặc tả Use Case toàn hệ thống",
        "17. Thiết kế sâu các module nghiệp vụ",
        "18. Mô hình và từ điển dữ liệu toàn hệ thống",
        "19. Hợp đồng API chi tiết",
        "20. Đặc tả giao diện theo vai trò",
        "21. Phân quyền chi tiết theo hành động và API",
        "22. Thiết kế kiểm thử toàn hệ thống",
        "23. Ma trận truy vết yêu cầu",
        "24. Đối chiếu với hiện trạng mã nguồn",
        "Phụ lục D. Máy trạng thái và enum nghiệp vụ",
        "Phụ lục E. Danh mục API hiện có",
        "Phụ lục F. Câu hỏi cần chốt cho giai đoạn triển khai",
    ]
    existing = {row.cells[0].text.strip() for row in toc.rows}
    for item in additions:
        if item in existing:
            continue
        row = toc.add_row()
        row.cells[0].text = item
        row.cells[1].text = "—"
        set_cant_split(row)
        for i, cell in enumerate(row.cells):
            set_cell_margins(cell)
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(0)
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if i == 1 else WD_ALIGN_PARAGRAPH.LEFT
                for run in p.runs:
                    set_run_font(run, size=8.6, color=INK)
    set_table_geometry(toc, [7800, 1560])


def add_use_cases(w: Writer):
    w.heading("16. Mô hình và đặc tả Use Case toàn hệ thống", 1, new_page=True)
    w.paragraph("Chương này mở rộng danh sách use case thành mô hình toàn hệ thống. Mỗi use case chính được gắn với chức năng, dữ liệu, API và nhóm kiểm thử để tránh dừng ở mô tả ý tưởng.")
    w.heading("16.1. Use Case Diagram UML", 2)
    w.figure(ASSET_DIR / "use_case_system.png", "Actor, use case chính và quan hệ include của toàn hệ thống", 6.35)
    w.callout("Quy ước include/extend", "Làm bài đánh giá <<include>> nộp và chấm bài; phân tích năng lực <<include>> tính khoảng cách kỹ năng; sinh lộ trình <<include>> lựa chọn gợi ý; nộp minh chứng có thể <<extend>> cập nhật tài nguyên hồ sơ.")
    w.heading("16.2. Danh mục use case", 2)
    w.table(["Mã", "Use case", "Actor", "Chức năng", "Hiện trạng"], [list(x) for x in USE_CASES], [1200, 3300, 1600, 1100, 2160], "Danh mục use case toàn hệ thống", 7.5)
    w.heading("16.3. Quan hệ giữa các use case", 2)
    rel = [
        ["UC-ASM-02 Bắt đầu/làm bài", "include", "UC-ASM-03 Nộp và chấm bài", "Kết thúc một lần đánh giá."],
        ["UC-ENG-01 Phân tích", "include", "Tính gap, match, priority, risk", "Các phép tính bắt buộc của Engine."],
        ["UC-ROA-01 Sinh lộ trình", "include", "UC-REC-01 Chọn gợi ý", "Lộ trình chỉ tiêu thụ gợi ý hợp lệ."],
        ["UC-PRO-02 Quản lý tài nguyên", "extend", "UC-EVD-01 Nộp minh chứng", "Minh chứng là bước tùy chọn để xác minh."],
        ["UC-EVD-02 Xác minh", "include", "UC-NOT-01 Thông báo", "Sinh viên nhận kết quả xử lý."],
        ["UC-ADV-01 Nhận xét", "include", "UC-NOT-01 Thông báo", "Sinh viên được báo có review mới."],
        ["UC-EXP-01/02 Xuất dữ liệu", "include", "Ghi ExportLog", "Mọi lần xuất đều truy vết được."],
    ]
    w.table(["Use case nguồn", "Quan hệ", "Use case đích", "Ý nghĩa"], rel, [2500, 1100, 2500, 3260], "Quan hệ include và extend", 8.0)
    w.heading("16.4. Đặc tả chi tiết use case chính", 2)
    names = {row[0]: row[1] for row in USE_CASES}
    for index, (code, spec) in enumerate(UC_DETAILS.items(), 1):
        w.heading(f"16.4.{index}. {code} - {names.get(code, code)}", 3)
        actor, pre, post, main, alternate, data, api, test = spec
        w.key_value(f"Đặc tả {code}", [
            ("Actor", actor), ("Tiền điều kiện", pre), ("Hậu điều kiện", post),
            ("Luồng chính", main), ("Ngoại lệ và quy tắc", alternate),
            ("Dữ liệu", data), ("API dự kiến/hiện có", api), ("Kiểm thử", test),
        ])


def add_module_designs(w: Writer):
    w.heading("17. Thiết kế sâu các module nghiệp vụ", 1, new_page=True)
    w.paragraph("Mục tiêu của chương là làm rõ các module tạo dữ liệu đầu vào và tiêu thụ đầu ra của Engine. Các chính sách dưới đây là hợp đồng nghiệp vụ cần được phê duyệt hoặc cấu hình hóa trước khi mở rộng code.")
    w.heading("17.1. Xác thực, tài khoản và phân công", 2)
    w.bullets([
        "Access token ngắn hạn; refresh token trong cookie httpOnly, Secure và SameSite phù hợp; logout thu hồi refresh token.",
        "Tài khoản INACTIVE bị chặn ở login, refresh và JWT strategy; thao tác khóa/reset phải ghi ActivityLog.",
        "Luồng quên mật khẩu không tiết lộ email tồn tại, token dùng một lần, có hạn và thu hồi toàn bộ phiên sau khi đặt lại.",
        "Mọi truy cập dữ liệu sinh viên qua cố vấn phải đi qua StudentAccessPolicy và assignment ACTIVE.",
    ])
    w.heading("17.2. Hồ sơ năng lực và minh chứng", 2)
    evidence_rows = [
        ["Nguồn", "SKILL, PROJECT, CERTIFICATE, ACTIVITY, EXPERIENCE, ROADMAP_ITEM", "relatedEntityType + relatedEntityId"],
        ["Nội dung", "file riêng tư hoặc evidenceUrl; note; checksum; mimeType; fileSize", "File/URL tối thiểu một loại"],
        ["Vòng đời", "PENDING → VERIFIED hoặc REJECTED; bản rejected tạo revision mới", "Không viết đè lịch sử review"],
        ["Xác minh", "verifiedBy, verifiedAt, reviewerNote; skill có thể cập nhật currentLevel", "Cố vấn theo assignment; admin toàn hệ thống"],
        ["Hết hạn", "expiresAt tùy loại chứng chỉ", "Job chuyển trạng thái nguồn và nhắc sinh viên"],
        ["Bảo mật", "Storage private, URL ký có hạn, kiểm tra MIME/kích thước/tên file", "Không đưa physical path ra response"],
    ]
    w.table(["Khía cạnh", "Đặc tả", "Ràng buộc"], evidence_rows, [1700, 4800, 2860], "Thiết kế module minh chứng", 8.2)
    w.heading("17.3. Assessment - nguồn mức hiện tại chính", 2)
    w.table(["Nội dung", "Chính sách", "Ghi chú triển khai"], ASSESSMENT_POLICY, [1900, 4200, 3260], "Chính sách Assessment", 8.0)
    w.callout("Điểm quyết định", "Các hằng số 6 câu/skill, 60%, 3 lần, 30 phút và 60 phút hiện nằm trong service. Thiết kế đích nên đưa chúng vào AssessmentPolicy có version để lịch sử bài luôn giải thích được.", GOLD)
    w.heading("17.4. Recommendation và tài nguyên học tập", 2)
    w.table(["Thành phần", "Thiết kế", "Quy tắc"], RECOMMENDATION_DESIGN, [2000, 4400, 2960], "Thiết kế gợi ý và tài nguyên", 8.0)
    w.heading("17.5. Roadmap và phụ thuộc nhiệm vụ", 2)
    w.table(["Thành phần", "Thiết kế", "Quy tắc"], ROADMAP_DESIGN, [1900, 4400, 3060], "Thiết kế lộ trình phát triển", 8.0)
    w.heading("17.6. Dashboard theo vai trò", 2)
    w.table(["Vai trò", "Chỉ số", "Phạm vi", "Hành động"], DASHBOARD_METRICS, [1200, 3600, 2100, 2460], "Chỉ số Dashboard", 7.8)
    w.heading("17.7. Thông báo", 2)
    w.table(["Sự kiện", "Người nhận", "Điều kiện", "Tần suất", "Loại", "Chống trùng"], NOTIFICATION_EVENTS, [1700, 1100, 2700, 1200, 1560, 1100], "Ma trận kích hoạt thông báo", 7.3)
    w.heading("17.8. Báo cáo và xuất dữ liệu", 2)
    w.table(["Loại", "Nội dung", "Quyền", "Định dạng/kiểm soát"], EXPORT_DESIGN, [1800, 3600, 1700, 2260], "Thiết kế báo cáo và export", 7.8)


def add_data_dictionary(w: Writer):
    models = parse_prisma_models(SCHEMA_PATH)
    model_names = set(models)
    groups = [
        ("Danh tính và phân quyền", ["User", "Student", "Lecturer", "AdvisorAssignment"]),
        ("Danh mục và nghề nghiệp", ["SkillCategory", "Skill", "CareerGoal", "Specialization", "CareerRequiredSkill"]),
        ("Ngân hàng câu hỏi và Assessment", ["AssessmentQuestion", "AssessmentOption", "Assessment", "AssessmentQuestionItem", "AssessmentAnswer", "AssessmentSkillResult"]),
        ("Hồ sơ và xác minh", ["StudentProfile", "StudentSkill", "StudentProject", "StudentCertificate", "StudentActivity", "StudentExperience", "Evidence", "AdvisorReview"]),
        ("Phân tích", ["CompetencyAnalysisResult", "CompetencyAnalysisDetail"]),
        ("Gợi ý và tài nguyên", ["RecommendationTemplate", "StudentRecommendation", "LearningResource", "LearningResourceSkill", "RecommendationTemplateResource", "StudentRecommendationResource", "StudentResourceProgress"]),
        ("Lộ trình", ["DevelopmentRoadmap", "RoadmapItem", "StudentRoadmapProgress"]),
        ("Thông báo và vận hành", ["Notification", "NotificationLog", "ActivityLog", "ExportLog"]),
    ]
    w.heading("18. Mô hình và từ điển dữ liệu toàn hệ thống", 1, new_page=True)
    w.paragraph("Từ điển dưới đây được đối chiếu với schema Prisma hiện tại. Thiết kế đích giữ ràng buộc hiện có và đánh dấu các bảng đề xuất bổ sung ở mục 18.4.")
    w.heading("18.1. Bản đồ dữ liệu", 2)
    w.figure(ASSET_DIR / "full_data_map.png", "Các cụm dữ liệu và luồng phụ thuộc toàn hệ thống", 6.35)
    section_no = 2
    for group_name, names in groups:
        w.heading(f"18.{section_no}. {group_name}", 2)
        section_no += 1
        for name in names:
            model = models.get(name)
            if not model:
                continue
            w.heading(f"Bảng {name}", 3)
            rows = []
            for fname, typ, attrs in model.fields:
                base = typ.rstrip("?").rstrip("[]")
                if base in model_names:
                    continue
                required = "Không" if "?" in typ else "Có"
                rows.append([fname, typ, required, attrs or "-", field_meaning(fname, typ)])
            for constraint in model.constraints:
                rows.append(["(ràng buộc bảng)", "-", "-", constraint, "Unique, index hoặc ánh xạ tên bảng vật lý."])
            w.table(["Trường", "Kiểu", "Bắt buộc", "Ràng buộc/mặc định", "Ý nghĩa"], rows, [1450, 1100, 800, 2800, 3210], f"Từ điển dữ liệu {name}", 7.2)
    w.heading(f"18.{section_no}. Các bảng đề xuất bổ sung", 2)
    proposed = [
        ["PasswordResetToken", "id, userId, tokenHash, expiresAt, usedAt, createdAt", "Quên/đặt lại mật khẩu dùng một lần"],
        ["AnalysisPolicy", "id, version, status, thresholds, weights, staleDays, activatedBy, activatedAt", "Phiên bản hóa quy tắc Engine"],
        ["AssessmentPolicy", "id, version, questionCount, passThreshold, maxAttempts, cooldown, timeLimit", "Loại bỏ hằng số khỏi service"],
        ["RecommendationFeedback", "id, recommendationId, studentId, rating, reason, note, createdAt", "Đo độ phù hợp của gợi ý"],
        ["RoadmapItemDependency", "roadmapItemId, predecessorItemId, dependencyType", "Biểu diễn quan hệ học trước"],
        ["EvidenceRevision", "id, evidenceId, revisionNo, file/url snapshot, status, reviewer", "Giữ lịch sử nộp lại"],
        ["ExportJob", "id, ownerId, type, filters, status, progress, fileUrl, checksum, expiresAt", "Job xuất nền có thể theo dõi"],
        ["NotificationPreference", "userId, type, channel, enabled, quietHours", "Tùy chọn nhận thông báo"],
    ]
    w.table(["Bảng", "Trường chính", "Mục đích"], proposed, [2100, 4500, 2760], "Bảng dữ liệu đề xuất", 7.8)


def add_api_design(w: Writer):
    endpoints = parse_controller_endpoints(CONTROLLER_DIR)
    w.heading("19. Hợp đồng API chi tiết", 1, new_page=True)
    w.paragraph("Các endpoint hiện có được trích từ controller trong codebase tại thời điểm 28/06/2026. Hợp đồng đích dùng cùng chuẩn response nhưng bổ sung validation, side effect và lỗi nghiệp vụ rõ ràng.")
    w.heading("19.1. Quy ước chung", 2)
    w.bullets([
        "Base path /api; JSON UTF-8; multipart chỉ cho upload; thời gian dùng ISO 8601 UTC.",
        "Response thành công: { success: true, data, meta? }; response lỗi: { success: false, statusCode, message, path, timestamp, code? }.",
        "Danh sách dùng page/limit/search/sortBy/sortOrder; limit tối đa 100; mọi filter đều áp dụng scope trước khi truy vấn.",
        "POST tạo mới trả 201; GET 200; PATCH 200; DELETE idempotent theo chính sách; 409 cho xung đột trạng thái hoặc unique.",
        "Idempotency-Key bắt buộc với analysis, roadmap generation và export job; requestId được ghi xuyên suốt log.",
    ])
    w.heading("19.2. Danh mục endpoint hiện có", 2)
    w.table(["Method", "Endpoint", "Role", "Request", "Response", "Lỗi"], endpoints, [750, 3150, 1350, 1700, 1500, 910], "Endpoint được phát hiện từ controller", 6.8)
    w.heading("19.3. API còn thiếu theo thiết kế đích", 2)
    w.table(["Method", "Endpoint", "Role", "Request", "Response", "Lỗi"], PROPOSED_APIS, [850, 3000, 1250, 1700, 1600, 960], "Endpoint cần bổ sung", 7.2)
    w.heading("19.4. Hợp đồng API trọng yếu", 2)
    contracts = [
        ("POST /api/auth/login", "{ email, password }", "{ accessToken, user } + refresh cookie", "Email chuẩn hóa; password 8-128; user ACTIVE", "Xác thực, lưu refreshTokenHash", "400/401/403/429"),
        ("PATCH /api/profiles/me", "{ careerGoalId?, specializationId?, summary?, githubUrl?, linkedinUrl?, portfolioUrl? }", "StudentProfileView", "Spec thuộc goal; URL hợp lệ", "Đổi context làm obsolete analysis và archive roadmap", "400/401/409"),
        ("POST /api/evidences", "multipart: relatedEntityType, relatedEntityId, file|evidenceUrl, note?", "EvidenceView(PENDING)", "Resource thuộc student; MIME/size/URL", "Lưu private; tính trạng thái nguồn; activity log", "400/403/413/415"),
        ("POST /api/assessments/start", "{}", "AssessmentView + questions + expiresAt + attemptPolicy", "Goal/spec active; đủ coverage; attempts/cooldown", "Tạo assessment và snapshot item", "400/401/409"),
        ("POST /api/assessments/:id/submit", "{ answers:[{questionId,selectedOptionId}] }", "AssessmentResultView", "Đủ câu, không trùng, còn hạn, đúng owner", "Lưu answer/result; tăng StudentSkill; GRADED", "400/403/404/409"),
        ("POST /api/competency-analysis/analyze/me", "{ reason?, deleteOldNewRecommendations? }", "CompetencyAnalysisView", "Context hợp lệ; policy active; idempotency", "Lưu result/detail; obsolete cũ; sinh gợi ý", "ENG-001..008"),
        ("PATCH /api/recommendations/:id/status", "{ status }", "RecommendationView", "Transition hợp lệ; đúng context", "Cập nhật status; có thể đồng bộ item", "400/403/404/409"),
        ("PATCH /api/learning-resources/:id/progress", "{ status, note? }", "ResourceProgressView", "Transition hợp lệ", "Auto-complete recommendation/item khi đủ", "400/403/404/409"),
        ("POST /api/roadmaps/generate/me", "{ archiveCurrentActiveRoadmap?: true }", "RoadmapView", "Có analysis CURRENT và recommendation actionable", "Archive cũ; tạo version/item/progress", "400/403/409"),
        ("PATCH /api/roadmap-items/:id/status", "{ status, note? }", "RoadmapItemView", "Dependency và state transition", "Ghi progress; tính roadmap; sync recommendation", "400/403/404/409"),
        ("POST /api/exports/portfolio", "{ sections, locale }", "ExportJobView", "Owner; rate limit; size", "Snapshot; queue job; ghi log", "400/403/429"),
        ("GET /api/dashboard/lecturer", "-", "LecturerDashboardView", "Lecturer active", "Tổng hợp assignment ACTIVE", "401/403"),
    ]
    for i, contract in enumerate(contracts, 1):
        endpoint, request, response, validation, side_effect, errors = contract
        w.heading(f"19.4.{i}. {endpoint}", 3)
        w.key_value(f"Hợp đồng {endpoint}", [
            ("Request", request), ("Response", response), ("Validation", validation),
            ("Business rules / side effects", side_effect), ("Permission", "Theo endpoint và ma trận Chương 21"),
            ("Error cases", errors),
        ])


def add_ui_design(w: Writer):
    w.heading("20. Đặc tả giao diện theo vai trò", 1, new_page=True)
    w.paragraph("Mỗi màn hình được đặc tả theo mục đích, dữ liệu, hành động, validation, API và trạng thái. Đây là đầu vào trực tiếp cho thiết kế component, query key, form schema và test giao diện.")
    for idx, role in enumerate(("Chung", "Sinh viên", "Cố vấn", "Quản trị"), 1):
        w.heading(f"20.{idx}. Màn hình {role.lower()}", 2)
        rows = [r for r in SCREEN_SPECS if r[0] == role]
        w.table(["Màn hình", "Mục đích", "Dữ liệu", "Hành động", "Validation", "API", "Trạng thái"],
                [r[1:] for r in rows], [1300, 1500, 1900, 1400, 1450, 1150, 660], f"Đặc tả màn hình {role}", 6.7)
    w.heading("20.5. Nguyên tắc trạng thái giao diện", 2)
    w.bullets([
        "Loading dùng skeleton hoặc progress; không hiển thị dữ liệu context cũ trong khi goal/spec mới đang tải.",
        "Empty state phải nêu nguyên nhân và hành động tiếp theo: chọn mục tiêu, làm assessment, bổ sung hồ sơ hoặc chạy phân tích.",
        "Error state tách validation, permission, stale data, conflict và lỗi hệ thống; mã ENG được diễn giải bằng ngôn ngữ người dùng.",
        "Mutation nguy hiểm hiển thị xác nhận và hậu quả: đổi context, deactivate catalog, sinh lại roadmap, reject evidence.",
        "Mọi phần trăm có nhãn, mô tả cách hiểu và không dùng màu làm tín hiệu duy nhất.",
    ])


def add_security_testing_trace(w: Writer):
    w.heading("21. Phân quyền chi tiết theo hành động và API", 1, new_page=True)
    w.paragraph("Quyền được kiểm tra hai lớp: role xác định nhóm hành động, scope xác định bản ghi được phép thao tác. Client chỉ hỗ trợ trải nghiệm; máy chủ là nơi thực thi quyết định quyền.")
    w.table(["Hành động/API", "Sinh viên", "Cố vấn", "Quản trị", "Kiểm soát bắt buộc"], RBAC_ROWS, [2800, 1500, 1600, 1300, 2160], "Ma trận phân quyền chi tiết", 7.2)
    w.heading("21.1. Kiểm soát ngang", 2)
    w.bullets([
        "Không tin studentId trong body đối với luồng tự phục vụ; lấy chủ thể từ access token.",
        "Cố vấn luôn phải có AdvisorAssignment ACTIVE tại thời điểm đọc và ghi, không chỉ tại thời điểm đăng nhập.",
        "Các truy vấn list/count/dashboard áp dụng scope ngay trong where, không lọc sau khi tải toàn bộ.",
        "404 được ưu tiên khi cần tránh tiết lộ sự tồn tại bản ghi ngoài phạm vi.",
        "Admin thao tác thay người dùng phải ghi actor, subject, reason, entity và requestId.",
    ])
    w.heading("22. Thiết kế kiểm thử toàn hệ thống", 1)
    w.paragraph("Bộ kiểm thử kết hợp unit cho quy tắc, property test cho bất biến, integration cho giao dịch và database, contract cho request/response, E2E theo vai trò và security test cho phạm vi dữ liệu.")
    w.table(["Mã TC", "Module", "Input/điều kiện", "Kết quả mong đợi"], TEST_CASES, [1300, 1400, 3700, 2960], "Test case chức năng và bảo mật", 7.5)
    w.heading("22.1. Tiêu chí chất lượng phát hành", 2)
    w.bullets([
        "100% test P0/P1 đạt; không còn lỗi phân quyền mức cao hoặc rất cao.",
        "Migration thử nghiệm trên bản sao dữ liệu; rollback hoặc forward-fix được diễn tập.",
        "Contract frontend/backend được kiểm tra từ OpenAPI; enum không còn lệch Prisma.",
        "Hiệu năng đạt NFR đã định cho analysis, dashboard, list và export job.",
        "Mọi đường xuất file, upload và link ký được kiểm tra hạn dùng và quyền sở hữu.",
    ])
    w.heading("23. Ma trận truy vết yêu cầu", 1)
    w.paragraph("Ma trận này nối yêu cầu với use case, API, dữ liệu và kiểm thử. Một hạng mục chỉ được xem là hoàn tất khi các cột liên quan có triển khai và test tương ứng.")
    w.table(["Yêu cầu", "Use case", "API", "Dữ liệu", "Test", "Hiện trạng"], TRACEABILITY, [1300, 1350, 2400, 2050, 1300, 960], "Ma trận FR - UC - API - DB - Test", 6.9)


def add_source_alignment(w: Writer):
    w.heading("24. Đối chiếu với hiện trạng mã nguồn", 1)
    w.callout("Phạm vi đối chiếu", "Đánh giá dựa trên backend/src, backend/prisma/schema.prisma và frontend/src tại ngày 28/06/2026. Trạng thái 'có' không mặc định đồng nghĩa hoàn chỉnh end-to-end; API có nhưng UI placeholder được ghi riêng.", LIGHT_BLUE)
    w.table(["Module", "Đã có", "Thiếu/sai lệch", "Khuyến nghị", "Ưu tiên"], SOURCE_ALIGNMENT, [1550, 2850, 2200, 2160, 600], "Đối chiếu thiết kế với codebase", 7.1)
    w.heading("24.1. Backlog triển khai ưu tiên", 2)
    backlog = [
        ["P0-01", "Chốt nguồn cấu hình Engine/Assessment", "Quyết định AnalysisPolicy và AssessmentPolicy có lưu DB hay cấu hình release", "Backend + Product", "Trước sprint tính năng mới"],
        ["P0-02", "Lịch sử Assessment", "Bổ sung API/detail/history, quyền cố vấn và màn hình so sánh", "Backend + Frontend", "Sprint 1"],
        ["P1-01", "Hoàn thiện màn hình quản trị", "User, student, lecturer, assignment, advisor review", "Frontend", "Sprint 1-2"],
        ["P1-02", "Coverage Dashboard", "Theo goal/spec/skill/level; chặn publish cấu hình thiếu", "Backend + Frontend", "Sprint 2"],
        ["P1-03", "Evidence revision", "Nộp lại, expiry, checksum, thông báo verify/reject", "Backend + Frontend", "Sprint 2"],
        ["P1-04", "Recommendation feedback và Roadmap dependency", "Thêm model/API/UI và đồng bộ trạng thái", "Full stack", "Sprint 3"],
        ["P1-05", "Export Job", "Portfolio PDF, Excel, queue, signed URL, cleanup, log", "Backend + Infra + Frontend", "Sprint 3"],
        ["P1-06", "Sinh type từ OpenAPI", "Loại bỏ enum legacy và drift contract", "Platform", "Song song"],
        ["P2-01", "Audit UI và retention", "API đọc log, bộ lọc, phân quyền, chính sách lưu", "Backend + Frontend", "Sau MVP"],
        ["P2-02", "Email notification", "Template, preference, retry/dead-letter", "Backend + Infra", "Sau MVP"],
    ]
    w.table(["Mã", "Hạng mục", "Đầu ra", "Chủ trì", "Mốc"], backlog, [900, 1900, 3600, 1500, 1460], "Backlog đề xuất từ gap analysis", 7.6)
    w.heading("24.2. Định nghĩa hoàn tất", 2)
    w.numbered([
        "Yêu cầu và business rule được cập nhật, có mã truy vết.",
        "Migration/schema, service, controller và OpenAPI cùng nhất quán.",
        "UI có loading, empty, error, validation và permission state.",
        "Unit, integration, contract và E2E phù hợp mức rủi ro đều đạt.",
        "Activity log, notification và side effect được xác minh.",
        "Tài liệu và ma trận truy vết phản ánh code đã merge.",
    ])


def add_appendices(w: Writer):
    w.heading("Phụ lục D. Máy trạng thái và enum nghiệp vụ", 1, new_page=True)
    states = [
        ["Assessment", "IN_PROGRESS → GRADED hoặc CANCELLED", "Không nộp lại sau trạng thái cuối"],
        ["Evidence", "PENDING → VERIFIED hoặc REJECTED", "Nộp lại tạo revision mới"],
        ["Analysis", "CURRENT → OBSOLETE", "Mỗi scope có tối đa một CURRENT"],
        ["Recommendation", "NEW → SAVED/DISMISSED; SAVED → IN_PROGRESS/DISMISSED; IN_PROGRESS → SAVED/DONE", "DONE/DISMISSED/OBSOLETE là cuối"],
        ["ResourceProgress", "NOT_STARTED → IN_PROGRESS/SKIPPED; IN_PROGRESS → COMPLETED/SKIPPED; SKIPPED → IN_PROGRESS", "COMPLETED là cuối"],
        ["Roadmap", "ACTIVE → ARCHIVED/COMPLETED/CANCELLED", "Mỗi context có tối đa một ACTIVE"],
        ["RoadmapItem", "TODO → IN_PROGRESS/CANCELLED; IN_PROGRESS → TODO/DONE/CANCELLED; DONE → IN_PROGRESS có note", "CANCELLED là cuối"],
        ["User", "ACTIVE ↔ INACTIVE", "INACTIVE bị chặn mọi phiên"],
    ]
    w.table(["Đối tượng", "Chuyển trạng thái", "Bất biến"], states, [1800, 4900, 2660], "Máy trạng thái nghiệp vụ", 7.8)
    w.heading("Phụ lục E. Danh mục API hiện có", 1, new_page=True)
    endpoints = parse_controller_endpoints(CONTROLLER_DIR)
    w.table(["Method", "Endpoint", "Role", "Request", "Response", "Lỗi"], endpoints, [750, 3150, 1350, 1700, 1500, 910], "Danh mục API hiện có tại thời điểm đối chiếu", 6.8)
    w.heading("Phụ lục F. Câu hỏi cần chốt cho giai đoạn triển khai", 1, new_page=True)
    w.numbered([
        "Policy Engine và Assessment sẽ lưu trong database có version hay cố định theo release?",
        "Có cho phép đăng ký công khai hay tài khoản chỉ do nhà trường tạo/import?",
        "Minh chứng nào có thời hạn và ai được quyền xác minh từng loại?",
        "Mức kỹ năng tự khai có được dùng khi chưa xác minh hay chỉ dùng với confidence thấp?",
        "Lịch sử Assessment có hiển thị đáp án đúng và lời giải sau khi nộp không?",
        "Tối đa ba lần đánh giá là theo đời sinh viên, theo học kỳ hay theo phiên bản policy?",
        "Feedback gợi ý được dùng để thay đổi cấu hình thủ công hay huấn luyện mô hình trong tương lai?",
        "Dependency roadmap là bắt buộc cứng hay chỉ là cảnh báo?",
        "Portfolio PDF mặc định công khai những trường nào và có QR/link xác thực không?",
        "Báo cáo Excel tối đa bao nhiêu dòng trước khi bắt buộc chạy job nền?",
        "Activity log và file export được lưu bao lâu theo chính sách nhà trường?",
        "Email notification có nằm trong MVP hay chỉ dùng IN_APP?",
    ])
    w.callout("Kết thúc tài liệu", "Phiên bản 3.0 cân bằng thiết kế toàn hệ thống với độ sâu của Competency Analysis Engine, đồng thời chỉ rõ những phần đã có, còn thiếu và cần refactor trong codebase.", GREEN)


def build():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    make_use_case_diagram(ASSET_DIR / "use_case_system.png")
    make_full_data_map(ASSET_DIR / "full_data_map.png")
    doc = Document(SOURCE_DOC)
    replace_front_matter(doc)
    extend_toc(doc)
    w = Writer(doc)
    doc.add_page_break()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(12)
    r = p.add_run("PHẦN II")
    set_run_font(r, size=26, bold=True, color=BLUE)
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run("ĐẶC TẢ CHI TIẾT TOÀN HỆ THỐNG")
    set_run_font(r2, size=18, bold=True, color=NAVY)
    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r3 = p3.add_run("Từ chức năng → Use Case → API → Dữ liệu → Giao diện → Kiểm thử → Mã nguồn")
    set_run_font(r3, size=11, italic=True, color="66788A")
    w.callout("Mục tiêu nâng cấp", "Bổ sung độ sâu cho toàn hệ thống mà không làm suy yếu Engine. Phần này là hợp đồng giao tiếp giữa nghiệp vụ, backend, frontend, dữ liệu, kiểm thử và vận hành.", LIGHT_BLUE)
    w.heading("15. Phân rã chức năng chi tiết", 1, new_page=True)
    w.paragraph("Cây chức năng được mở rộng tới cấp 2 và cấp 3 để mỗi nhánh có thể ánh xạ trực tiếp sang use case, màn hình, endpoint, bảng dữ liệu và test case.")
    w.table(["Cấp 1", "Nhóm chức năng", "Cấp 2", "Chức năng con", "Cấp 3 / thao tác"], [list(r) for r in FUNCTION_TREE], [800, 2050, 800, 1700, 4010], "Cây chức năng cấp 2 và cấp 3", 7.2)
    add_use_cases(w)
    add_module_designs(w)
    add_data_dictionary(w)
    add_api_design(w)
    add_ui_design(w)
    add_security_testing_trace(w)
    add_source_alignment(w)
    add_appendices(w)
    doc.core_properties.title = "Phân tích và thiết kế hệ thống Student Digital Competency Profile - Bản chuyên nghiệp toàn hệ thống"
    doc.core_properties.subject = "Đặc tả chức năng, Engine, dữ liệu, API, UI, kiểm thử và đối chiếu mã nguồn"
    doc.core_properties.comments = "Phiên bản 3.0 - 28/06/2026"
    doc.save(OUTPUT_DOC)
    print(OUTPUT_DOC)


if __name__ == "__main__":
    build()
