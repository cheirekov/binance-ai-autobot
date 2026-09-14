"""Create a root-private V2 dotenv from the legacy credentials without printing them."""
import argparse
import json
import os
import re
import secrets
from pathlib import Path


SAFE = re.compile(r"^[A-Za-z0-9_./$:@+=-]+$")


def quoted(value):
    if not isinstance(value, str) or not value or not SAFE.fullmatch(value):
        raise ValueError("Unsupported or empty credential value")
    return "'" + value + "'"


def create_environment(legacy_path, output_path):
    config = json.loads(Path(legacy_path).read_text())
    openai_key = config["basic"]["openai"]["apiKey"]
    auth = config["basic"]["uiAuth"]
    if auth.get("enabled") is not True or not re.match(r"^\$2[aby]\$", auth.get("passwordHash", "")):
        raise ValueError("Legacy UI bcrypt authentication must be enabled")
    values = {
        "COMPOSE_PROJECT_NAME": "autobot-v2",
        # The pinned image installs Freqtrade in ftuser's user site (1000:1000).
        # Host root is not a compatible container runtime user.
        "TRADER_UID": "1000", "TRADER_GID": "1000",
        "TRADER_API_USER": "autobot-v2-internal",
        "TRADER_API_PASSWORD": secrets.token_urlsafe(36),
        "TRADER_API_JWT_SECRET": secrets.token_hex(32),
        "TRADER_UI_BIND": "127.0.0.1", "TRADER_UI_PORT": "4174",
        "TRADER_UI_AUTH_ENABLED": "true", "TRADER_UI_USER": auth["username"],
        "TRADER_UI_PASSWORD_HASH": auth["passwordHash"],
        "OPENAI_API_KEY": openai_key, "ASTRA_DAILY_BUDGET_USD": "0.50",
    }
    payload = "\n".join(f"{key}={quoted(value)}" for key, value in values.items()) + "\n"
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "w") as stream:
            stream.write(payload)
    except Exception:
        output.unlink(missing_ok=True)
        raise
    return {"path": str(output), "uiBind": values["TRADER_UI_BIND"],
            "uiPort": int(values["TRADER_UI_PORT"]), "dailyBudgetUsd": float(values["ASTRA_DAILY_BUDGET_USD"])}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = create_environment(args.legacy_config, args.output)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
