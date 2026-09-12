from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"

STATIC_PATHS = [
    "index.html",
    "pages",
    "assets",
    "docs",
    "fries-widget",
    "fries-widget.zip",
]


def copy_path(relative_path: str) -> None:
    source = ROOT / relative_path
    target = OUT / relative_path

    if not source.exists():
        raise FileNotFoundError(f"Missing required path: {relative_path}")

    if source.is_dir():
        shutil.copytree(source, target)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)

    OUT.mkdir()
    for relative_path in STATIC_PATHS:
        copy_path(relative_path)

    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Built GitHub Pages site at {OUT}")


if __name__ == "__main__":
    main()
