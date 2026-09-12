from pathlib import Path
import os
import runpy
import sys


ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "api"
ENV_FILE = API_DIR / ".env"


def load_env(path):
    if not path.exists():
        print(f"Missing {path}. Copy api/.env.example to api/.env and fill it in.")
        raise SystemExit(1)

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def main():
    load_env(ENV_FILE)
    os.chdir(API_DIR)
    sys.path.insert(0, str(API_DIR))
    runpy.run_path(str(API_DIR / "server.py"), run_name="__main__")


if __name__ == "__main__":
    main()
