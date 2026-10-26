#!/usr/bin/env python3
"""Upload an already verified APK to an existing draft; never build or publish."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile

REPOSITORY = 'shqingda/kaku'
PROXY_KEYS = ('http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'all_proxy', 'ALL_PROXY')


def clean_environment():
    return {key: value for key, value in os.environ.items() if key not in PROXY_KEYS}


def github_json(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], env=clean_environment(), text=True))


def github_items(path):
    items, page = [], 1
    while True:
        batch = github_json(f'{path}?per_page=100&page={page}')
        items.extend(batch)
        if len(batch) < 100:
            return items
        page += 1


def check_asset(assets, apk, digest):
    matches = [asset for asset in assets if asset['name'] == apk.name]
    if not matches:
        return False
    if (len(matches) != 1 or matches[0]['state'] != 'uploaded'
            or matches[0]['size'] != apk.stat().st_size or matches[0].get('digest') != digest):
        raise RuntimeError('远端文件与本地不一致，保留草稿，不覆盖或发布')
    return True


def upload_apk(tag, apk, direct=False):
    if apk.name not in ('kaku-release.apk', 'kaku-debug.apk') or not apk.is_file():
        raise ValueError('需要已验证的 kaku-release.apk 或 kaku-debug.apk')
    if not re.fullmatch(r'v\d+\.\d+\.\d+', tag):
        raise ValueError('需要形如 v1.2.3 的版本标签')
    with apk.open('rb') as source:
        digest = 'sha256:' + hashlib.file_digest(source, 'sha256').hexdigest()
    # The tag endpoint is for published releases; the authenticated list includes drafts.
    matches = [item for item in github_items(f'repos/{REPOSITORY}/releases') if item['tag_name'] == tag]
    if len(matches) != 1:
        raise RuntimeError('未找到唯一的版本草稿，请先创建草稿并确认权限')
    release = matches[0]
    if not release['draft']:
        raise RuntimeError('只接受现有草稿，不修改已发布版本')
    asset_path = f'repos/{REPOSITORY}/releases/{release["id"]}/assets'
    assets = github_items(asset_path)
    if check_asset(assets, apk, digest):
        return
    upload_url = release['upload_url'].split('{')[0]
    expected_url = f'https://uploads.github.com/repos/{REPOSITORY}/releases/{release["id"]}/assets'
    if upload_url != expected_url:
        raise RuntimeError('上传地址不符合固定仓库，停止')
    token = subprocess.check_output(['gh', 'auth', 'token'], env=clean_environment(), text=True).strip()
    if not token or '\n' in token or '\r' in token or '"' in token:
        raise RuntimeError('GitHub 凭据格式无效')
    with tempfile.TemporaryDirectory(prefix='kaku-upload-') as directory:
        result = Path(directory) / 'asset.json'
        # Locally the upload goes through the Clash SOCKS port (see release.md);
        # GitHub Actions runners reach GitHub directly.
        proxy = ['--noproxy', '*'] if direct else ['--proxy', 'socks5h://127.0.0.1:7890', '--noproxy', '']
        completed = subprocess.run([
            'curl', '--http2', *proxy,
            '--connect-timeout', '15', '--max-time', '900', '--fail-with-body', '--progress-bar',
            '--config', '-', '-H', 'Content-Type: application/vnd.android.package-archive',
            '-H', 'Expect:', '--data-binary', '@' + str(apk),
            upload_url + '?name=' + apk.name, '-o', str(result),
        ], input='header = "Authorization: Bearer ' + token + '"\n',
            env=clean_environment(), text=True, check=False)
    # Even a timeout can mean the remote upload succeeded. Inspect, never retry
    # blindly, rebuild, clobber, or publish after an ambiguous result.
    if not check_asset(github_items(asset_path), apk, digest):
        raise RuntimeError(f'上传尚未确认（curl {completed.returncode}），保留草稿；再次运行会先核查资源')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tag')
    parser.add_argument('--apk', type=Path, default=Path('apps/mobile/dist-split/kaku-release.apk'))
    parser.add_argument('--direct', action='store_true', help='connect without the local SOCKS proxy (CI)')
    args = parser.parse_args()
    try:
        upload_apk(args.tag, args.apk.resolve(), direct=args.direct)
    except (ValueError, RuntimeError, OSError, subprocess.CalledProcessError, KeyError) as error:
        parser.exit(1, str(error) + '\n')
    print('远端大小与 SHA-256 一致；草稿保持未发布。')


if __name__ == '__main__':
    main()
