import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from install_env import create_environment


class InstallEnvironmentTests(unittest.TestCase):
    def test_private_non_overwriting_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "legacy.json"
            output = Path(directory) / ".env"
            source.write_text(json.dumps({"basic": {"openai": {"apiKey": "sk-test-never-print"},
                "uiAuth": {"enabled": True, "username": "operator", "passwordHash": "$2b$10$hash/value"}}}))
            with patch("install_env.secrets.token_urlsafe", return_value="random_password"), \
                 patch("install_env.secrets.token_hex", return_value="a" * 64):
                public = create_environment(source, output)
            self.assertEqual(public["uiBind"], "127.0.0.1")
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
            contents = output.read_text()
            self.assertIn("OPENAI_API_KEY='sk-test-never-print'", contents)
            self.assertIn("TRADER_UI_PASSWORD_HASH='$2b$10$hash/value'", contents)
            self.assertIn("TRADER_UID='1000'", contents)
            with self.assertRaises(FileExistsError):
                create_environment(source, output)

    def test_disabled_or_plaintext_ui_auth_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "legacy.json"
            output = Path(directory) / ".env"
            for auth in [{"enabled": False, "username": "x", "passwordHash": "$2b$10$hash"},
                         {"enabled": True, "username": "x", "passwordHash": "plaintext"}]:
                source.write_text(json.dumps({"basic": {"openai": {"apiKey": "sk-test"}, "uiAuth": auth}}))
                with self.assertRaises(ValueError):
                    create_environment(source, output)
