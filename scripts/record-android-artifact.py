#!/usr/bin/env python3
"""Archive local build provenance and matching source maps; never upload."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def record_artifact(apk, build, version, commit, dirty):
    digest = sha256(apk)
    destination = apk.parent / f'{apk.stem}-{digest}.sources'
    if destination.exists():
        existing = json.loads((destination / 'manifest.json').read_text())
        if existing['apk']['sha256'] != digest or any(
                sha256(destination / item['name']) != item['sha256'] for item in existing['files']):
            raise ValueError('已有产物记录校验失败，未覆盖')
        return destination, existing
    bundle = build / 'generated/assets/react/release/index.android.bundle'
    source_map = build / 'generated/sourcemaps/react/release/index.android.bundle.map'
    mapping = build / 'outputs/mapping/release/mapping.txt'
    manifest = {'version': version, 'commit': commit, 'dirty': dirty,
                'apk': {'name': apk.name, 'sha256': digest, 'bytes': apk.stat().st_size},
                'files': [], 'missing': []}
    # Gradle emits this bundle and its composed Hermes map in the same task.
    # Do not pair maps from another build with an existing, verified APK.
    if bundle.is_file():
        with zipfile.ZipFile(apk) as archive:
            embedded = hashlib.sha256(archive.read('assets/index.android.bundle')).hexdigest()
        if embedded != sha256(bundle):
            raise ValueError('构建目录的 JS bundle 与 APK 不匹配，未归档 source map')
    with tempfile.TemporaryDirectory(prefix='.kaku-sources-', dir=apk.parent) as temp:
        output = Path(temp) / 'sources'
        output.mkdir()
        for name, path in [('index.android.bundle', bundle), ('index.android.bundle.map', source_map), ('mapping.txt', mapping)]:
            if not bundle.is_file() or not path.is_file():
                manifest['missing'].append(name)
                continue
            shutil.copyfile(path, output / name)
            manifest['files'].append({'name': name, 'sha256': sha256(path), 'bytes': path.stat().st_size})
        (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        output.rename(destination)
    return destination, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('--build', type=Path, default=Path('android/app/build'))
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    repository = Path(__file__).resolve().parent.parent
    def git(*arguments):
        return subprocess.check_output(['git', '-C', str(repository), *arguments], text=True).strip()
    try:
        destination, manifest = record_artifact(args.apk.resolve(), args.build.resolve(), args.version,
                                               git('rev-parse', 'HEAD'), bool(git('status', '--porcelain')))
    except (ValueError, OSError, KeyError, zipfile.BadZipFile, subprocess.CalledProcessError) as error:
        parser.exit(1, str(error) + '\n')
    print(f'本地产物记录：{destination}')
    if manifest['missing']:
        print('未归档（不得声称可还原此类堆栈）：' + ', '.join(manifest['missing']))


if __name__ == '__main__':
    main()
