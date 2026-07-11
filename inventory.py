from pathlib import Path
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

SRC = Path('/Users/nguyenhaiduong/Downloads/PTTK_Student_Digital_Competency_Profile_Da_Chinh_Dinh_Dang_Muc_9.5.docx')
OUT = Path('.codex-uc-errors/inventory.txt')


def blocks(doc):
    body = doc.element.body
    for child in body.iterchildren():
        if child.tag.endswith('}p'):
            yield Paragraph(child, doc)
        elif child.tag.endswith('}tbl'):
            yield Table(child, doc)


doc = Document(SRC)
in_ch5 = False
table_idx = 0
lines = []
for idx, block in enumerate(blocks(doc)):
    if isinstance(block, Paragraph):
        text = ' '.join(block.text.split())
        style = block.style.name if block.style else ''
        if text.startswith('5.') and ('USE CASE' in text.upper() or style.startswith('Heading')):
            in_ch5 = True
        if in_ch5 and text.startswith('6.') and style.startswith('Heading'):
            break
        if in_ch5 and text:
            lines.append(f'P|{idx}|{style}|{text}')
    elif in_ch5:
        table_idx += 1
        lines.append(f'TABLE|block={idx}|chapter_table={table_idx}|rows={len(block.rows)}|cols={len(block.columns)}')
        for r, row in enumerate(block.rows):
            vals = [' '.join(cell.text.split()) for cell in row.cells]
            lines.append(f'  R{r}: ' + ' || '.join(vals))

OUT.write_text('\n'.join(lines), encoding='utf-8')
print(f'wrote {OUT} with {len(lines)} lines')
