import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("report", Path(__file__).with_name("report-apk-size.py"))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class ApkSizeTest(unittest.TestCase):
    def test_categories_add_to_file_size_and_compare_empty_categories(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.apk"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("lib/arm64-v8a/example.so", b"x" * 20)
                archive.writestr("classes2.dex", b"x" * 10)
                archive.writestr("assets/index.android.bundle", b"x" * 5)
                archive.writestr("assets/icon.png", b"x" * 7)
            current = report.inspect_apk(path)
            self.assertEqual(sum(current["groups"].values()), path.stat().st_size)
            self.assertEqual(current["groups"]["native"], 20)
            self.assertEqual(current["groups"]["dex"], 10)
            self.assertEqual(current["groups"]["javascript"], 5)
            self.assertEqual(current["groups"]["resources"], 7)
            comparison = report.compare(current, current)
            self.assertEqual(comparison["total"]["percent"], 0)
            self.assertIsNone(comparison["other"]["percent"])

    def test_invalid_archives_fail_instead_of_reporting_zero(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.apk"
            path.write_text("not an apk")
            with self.assertRaises(zipfile.BadZipFile):
                report.inspect_apk(path)


if __name__ == "__main__":
    unittest.main()
