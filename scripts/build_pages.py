from pathlib import Path
import os
import shutil
import stat


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


def make_writable(path: str) -> None:
    os.chmod(path, stat.S_IWRITE)


def remove_tree(path: Path) -> None:
    for child in path.rglob("*"):
        if child.is_file():
            make_writable(str(child))
    shutil.rmtree(path)


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
        make_writable(str(target))


def main() -> None:
    if OUT.exists():
        remove_tree(OUT)

    OUT.mkdir()
    for relative_path in STATIC_PATHS:
        copy_path(relative_path)

    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Built GitHub Pages site at {OUT}")


if __name__ == "__main__":
    main()
