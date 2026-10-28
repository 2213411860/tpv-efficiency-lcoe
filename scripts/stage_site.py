"""Stage only the browser application for GitHub Pages deployment."""
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'_site'
OUT.mkdir(exist_ok=True)
files=['index.html','data.html','app.js','model.js','data.js','style.css','.nojekyll']
paths=[ROOT/name for name in files]+[p for folder in ['data','vendor'] for p in (ROOT/folder).rglob('*') if p.is_file()]
for source in paths:
    assert source.is_file() and not source.is_symlink(),source
    relative=source.relative_to(ROOT)
    destination=OUT/relative
    destination.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source,destination)
assert {p.relative_to(OUT) for p in OUT.rglob('*') if p.is_file()}=={p.relative_to(ROOT) for p in paths}
print('Staged',len(paths),'website assets in',OUT)
