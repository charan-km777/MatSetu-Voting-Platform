from pathlib import Path
import fitz

source = Path("attached_assets/MatSetu_Synopsis_VTU_1789897415597.pdf")
output_dir = Path(".agents/outputs/matsetu_synopsis")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")

for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    destination = output_dir / f"page-{index + 1:02d}.png"
    pixmap.save(destination)
    print(destination)