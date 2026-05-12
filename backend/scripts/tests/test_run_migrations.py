#!/usr/bin/env python3
"""Tests for run_migrations.py configuration resolution."""
import os
import sys
import unittest
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from run_migrations import get_alembic_config


class TestAlembicConfigResolution(unittest.TestCase):
    """Test that alembic.ini is found correctly regardless of CWD."""

    def test_config_file_exists(self):
        """get_alembic_config must point to an existing alembic.ini file."""
        config = get_alembic_config()
        self.assertTrue(
            os.path.isfile(config.config_file_name),
            f"alembic.ini not found at resolved path: {config.config_file_name}",
        )

    def test_config_has_script_location(self):
        """The loaded config must contain the script_location key."""
        config = get_alembic_config()
        # Alembic Config.get_main_option reads from [alembic] section
        script_location = config.get_main_option("script_location")
        self.assertIsNotNone(
            script_location,
            "script_location not found in alembic configuration",
        )
        self.assertEqual(script_location, "migrations")


if __name__ == "__main__":
    unittest.main()
