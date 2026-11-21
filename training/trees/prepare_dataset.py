#!/usr/bin/env python3
"""Validate a tree-sprite dataset and create leakage-safe split manifests."""
from __future__ import annotations
import argparse
import hashlib
import json
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

SPLITS = (("train", 80), ("validation", 10), ("test", 10))
REQUIRED_FIELDS = ("id", "file", "source_group", "species", "stage", "season", "license", "source_url", "rights_confirmed")


class DatasetError(Exception):
    pass


def read_png(path: Path) -> tuple[int, int, int]:
    with path.open("rb") as stream:
        header = stream.read(26)
    if len(header) != 26 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise DatasetError(f"{path}: expected a valid PNG file")
    width, height = struct.unpack(">II", header[16:24])
    color_type = header[25]
    if width < 1 or height < 1:
        raise DatasetError(f"{path}: invalid image dimensions")
    if color_type not in (4, 6):
        raise DatasetError(f"{path}: PNG must contain an alpha channel")
    return width, height, color_type


def load_records(dataset_dir: Path) -> list[dict[str, Any]]:
    metadata_path = dataset_dir / "metadata.jsonl"
    if not metadata_path.is_file():
        raise DatasetError(f"Missing metadata file: {metadata_path}")
    records: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_files: set[str] = set()
    seen_hashes: dict[str, str] = {}
    for line_number, raw_line in enumerate(metadata_path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw_line.strip():
            continue
        try:
            item = json.loads(raw_line)
        except json.JSONDecodeError as error:
            raise DatasetError(f"metadata.jsonl:{line_number}: {error}") from error
        if not isinstance(item, dict):
            raise DatasetError(f"metadata.jsonl:{line_number}: each entry must be an object")
        missing = [field for field in REQUIRED_FIELDS if field not in item]
        if missing:
            raise DatasetError(f"metadata.jsonl:{line_number}: missing fields: {', '.join(missing)}")
        for field in REQUIRED_FIELDS:
            if field != "rights_confirmed" and not isinstance(item[field], str):
                raise DatasetError(f"metadata.jsonl:{line_number}: {field} must be a string")
            if field != "rights_confirmed" and not item[field].strip():
                raise DatasetError(f"metadata.jsonl:{line_number}: {field} cannot be empty")
        if item["rights_confirmed"] is not True:
            raise DatasetError(f"metadata.jsonl:{line_number}: usage rights must be explicitly confirmed")
        relative_file = Path(item["file"])
        if item["id"] in seen_ids:
            raise DatasetError(f"metadata.jsonl:{line_number}: duplicate id {item['id']!r}")
        if item["file"] in seen_files:
            raise DatasetError(f"metadata.jsonl:{line_number}: duplicate file {item['file']!r}")
        if relative_file.is_absolute() or ".." in relative_file.parts:
            raise DatasetError(f"metadata.jsonl:{line_number}: file must stay inside the dataset directory")
        image_path = (dataset_dir / relative_file).resolve()
        if not image_path.is_relative_to(dataset_dir.resolve()) or not image_path.is_file():
            raise DatasetError(f"metadata.jsonl:{line_number}: image not found: {item['file']}")
        width, height, _ = read_png(image_path)
        digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
        if digest in seen_hashes:
            raise DatasetError(f"Duplicate image content: {item['file']} matches {seen_hashes[digest]}")
        item.update({"width": width, "height": height, "sha256": digest})
        seen_ids.add(item["id"])
        seen_files.add(item["file"])
        seen_hashes[digest] = item["file"]
        records.append(item)
    if not records:
        raise DatasetError("Dataset contains no image records")
    return records


def assign_splits(records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in records:
        groups[item["source_group"]].append(item)
    if len(groups) < 3:
        raise DatasetError("At least three independent source_group values are required for leakage-safe train, validation, and test splits")
    ordered = sorted(groups, key=lambda group: hashlib.sha256(group.encode("utf-8")).hexdigest())
    total = len(records)
    targets = {name: total * percentage / 100 for name, percentage in SPLITS}
    assigned = {name: [] for name, _ in SPLITS}
    counts = Counter()
    for index, group in enumerate(ordered):
        remaining = len(ordered) - index
        empty = [name for name, _ in SPLITS if not assigned[name]]
        if remaining <= len(empty):
            selected = empty[0]
        else:
            selected = min((name for name, _ in SPLITS), key=lambda name: (len(assigned[name]) - targets[name], counts[name]))
        assigned[selected].extend(groups[group])
        counts[selected] += len(groups[group])
    return assigned


def write_manifests(dataset_dir: Path, splits: dict[str, list[dict[str, Any]]]) -> None:
    output_dir = dataset_dir / "splits"
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, records in splits.items():
        with (output_dir / f"{name}.jsonl").open("w", encoding="utf-8", newline="\n") as stream:
            for item in sorted(records, key=lambda record: record["id"]):
                stream.write(json.dumps(item, ensure_ascii=False, sort_keys=True) + "\n")
    summary = {
        "schema_version": 1,
        "split_strategy": "source_group",
        "counts": {name: len(records) for name, records in splits.items()},
        "groups": {name: sorted({item["source_group"] for item in records}) for name, records in splits.items()},
    }
    (output_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset_dir", type=Path, help="Directory containing metadata.jsonl and PNG files")
    parser.add_argument("--check-only", action="store_true", help="Validate without writing split manifests")
    args = parser.parse_args()
    try:
        dataset_dir = args.dataset_dir.resolve()
        records = load_records(dataset_dir)
        splits = assign_splits(records)
        if not args.check_only:
            write_manifests(dataset_dir, splits)
        print(f"Validated {len(records)} images across {len({r['source_group'] for r in records})} source groups.")
        for name, items in splits.items():
            print(f"{name}: {len(items)} images, {len({item['source_group'] for item in items})} source groups")
        return 0
    except (DatasetError, OSError) as error:
        print(f"Dataset error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
