import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('provenance', Path(__file__).with_name('record-android-artifact.py'))
provenance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(provenance)


class ArtifactTests(unittest.TestCase):
    def test_matching_bundle_maps_are_archived_and_mismatches_do_not_touch_the_apk(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            apk = root / 'app.apk'
            with zipfile.ZipFile(apk, 'w') as archive:
                archive.writestr('assets/index.android.bundle', b'hermes')
            original = apk.read_bytes()
            build = root / 'build'
            bundle = build / 'generated/assets/react/release/index.android.bundle'
            bundle.parent.mkdir(parents=True)
            bundle.write_bytes(b'hermes')
            source_map = build / 'generated/sourcemaps/react/release/index.android.bundle.map'
            source_map.parent.mkdir(parents=True)
            source_map.write_text('{}')
            output, manifest = provenance.record_artifact(apk, build, '1.2.3', 'commit', False)
            self.assertEqual(json.loads((output / 'manifest.json').read_text()), manifest)
            self.assertEqual(manifest['apk']['sha256'], hashlib.sha256(original).hexdigest())
            self.assertEqual(manifest['missing'], ['mapping.txt'])
            self.assertEqual((output / source_map.name).read_text(), '{}')
            self.assertEqual(provenance.record_artifact(apk, build, '1.2.3', 'commit', False), (output, manifest))
            other = root / 'other.apk'
            other.write_bytes(original)
            bundle.write_bytes(b'old-build')
            with self.assertRaisesRegex(ValueError, '不匹配'):
                provenance.record_artifact(other, build, '1.2.3', 'commit', False)
            self.assertEqual(apk.read_bytes(), original)
            self.assertEqual(other.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
