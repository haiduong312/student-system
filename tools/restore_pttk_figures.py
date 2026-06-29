import os

from docx import Document

from complete_pttk_target_design import DOCX, TMP, restore_figures
from refine_pttk_target_design import renumber_captions


doc = Document(DOCX)
restore_figures(doc)
renumber_captions(doc)
doc.save(TMP)
os.replace(TMP, DOCX)
print(DOCX)
