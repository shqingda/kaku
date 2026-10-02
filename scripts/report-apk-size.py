#!/usr/bin/env python3
"""Report compressed APK categories; optional comparison uses another APK."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path


def category(name):
    if name.startswith("lib/"):
        return "native"
    if re.fullmatch(r"classes\d*\.dex", name):
        return "dex"
    if name.startswith("assets/") and name.endswith((".bundle", ".hbc")):
        return "javascript"
    if name.startswith(("res/", "assets/")) or name == "resources.arsc":
        return "resources"
    return "other"


def inspect_apk(path):
    path = Path(path)
    groups = dict.fromkeys(("native", "dex", "javascript", "resources", "other"), 0)
    with zipfile.ZipFile(path) as archive:
        for entry in archive.infolist():
            groups[category(entry.filename)] += entry.compress_size
    size = path.stat().st_size
    groups["zip_overhead"] = size - sum(groups.values())
    return {"apk": path.name, "bytes": size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "groups": groups}


def compare(current, baseline):
    result = {}
    for key, value in {"total": current["bytes"], **current["groups"]}.items():
        before = baseline["bytes"] if key == "total" else baseline["groups"][key]
        result[key] = {"before": before, "after": value, "delta": value - before,
                       "percent": round((value - before) * 100 / before, 2) if before else None}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        report = inspect_apk(args.apk)
        if args.baseline:
            baseline = inspect_apk(args.baseline)
            report["baseline"] = baseline
            report["comparison"] = compare(report, baseline)
    except (OSError, zipfile.BadZipFile) as error:
        parser.exit(2, f"无法读取 APK: {error}\n")
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f'{report["apk"]}: {report["bytes"]:,} bytes')
        for key, value in report["groups"].items():
            print(f"  {key:14} {value:>12,}")
        for key, row in report.get("comparison", {}).items():
            percent = "n/a" if row["percent"] is None else f'{row["percent"]:+.2f}%'
            print(f'{key:14} {row["before"]:>12,} -> {row["after"]:>12,}  {row["delta"]:+,} ({percent})')


if __name__ == "__main__":
    main()
