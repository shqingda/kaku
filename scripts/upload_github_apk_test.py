import hashlib
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('upload_github_apk', Path(__file__).with_name('upload-github-apk.py'))
upload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload)


class UploadTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.apk = Path(self.directory.name) / 'kaku-release.apk'
        self.apk.write_bytes(b'verified-apk')
        self.asset = {'name': self.apk.name, 'state': 'uploaded', 'size': self.apk.stat().st_size,
                      'digest': 'sha256:' + hashlib.sha256(self.apk.read_bytes()).hexdigest()}
        self.release = {'id': 123, 'draft': True, 'tag_name': 'v1.2.3',
                        'upload_url': 'https://uploads.github.com/repos/shqingda/kaku/releases/123/assets{?name,label}'}

    def test_list_pagination_and_invalid_tag(self):
        with patch.object(upload, 'github_json', side_effect=[[{}] * 100, [{'id': 2}]]) as query:
            self.assertEqual(len(upload.github_items('releases')), 101)
            self.assertEqual(query.call_args_list[1].args, ('releases?per_page=100&page=2',))
        with patch.object(upload, 'github_json') as query:
            with self.assertRaises(ValueError):
                upload.upload_apk('vv1..2', self.apk)
            query.assert_not_called()

    def test_verified_existing_asset_never_reuploads(self):
        with patch.object(upload, 'github_json', side_effect=[[self.release], [self.asset]]), \
                patch.object(upload.subprocess, 'run') as run:
            upload.upload_apk('v1.2.3', self.apk)
            run.assert_not_called()

    def test_mismatched_asset_and_published_release_are_preserved(self):
        for responses in ([[self.release], [{**self.asset, 'digest': 'wrong'}]], [[{**self.release, 'draft': False}]]):
            with self.subTest(responses=responses), patch.object(upload, 'github_json', side_effect=responses), \
                    patch.object(upload.subprocess, 'run') as run:
                with self.assertRaises(RuntimeError):
                    upload.upload_apk('v1.2.3', self.apk)
                run.assert_not_called()

    def test_fixed_upload_options_and_unknown_result_recovery(self):
        for exit_code in (0, 28):
            with self.subTest(exit_code=exit_code), \
                    patch.object(upload, 'github_json', side_effect=[[self.release], [], [self.asset]]), \
                    patch.object(upload.subprocess, 'check_output', return_value='test-token'), \
                    patch.object(upload.subprocess, 'run', return_value=subprocess.CompletedProcess([], exit_code)) as run, \
                    patch.dict(upload.os.environ, {'HTTPS_PROXY': 'must-not-inherit'}):
                upload.upload_apk('v1.2.3', self.apk)
                self.assertEqual(run.call_count, 1)
                args = run.call_args.args[0]
                self.assertIn('--http2', args)
                self.assertEqual(args[args.index('--proxy') + 1], 'socks5h://127.0.0.1:7890')
                self.assertEqual(args[args.index('--max-time') + 1], '900')
                self.assertIn('Expect:', args)
                self.assertNotIn('test-token', ' '.join(args))
                self.assertNotIn('HTTPS_PROXY', run.call_args.kwargs['env'])

    def test_unconfirmed_upload_stops_without_retry_or_rebuild(self):
        with patch.object(upload, 'github_json', side_effect=[[self.release], [], []]), \
                patch.object(upload.subprocess, 'check_output', return_value='test-token'), \
                patch.object(upload.subprocess, 'run', return_value=subprocess.CompletedProcess([], 28)) as run:
            with self.assertRaisesRegex(RuntimeError, '上传尚未确认'):
                upload.upload_apk('v1.2.3', self.apk)
            self.assertEqual(run.call_count, 1)


if __name__ == '__main__':
    unittest.main()
