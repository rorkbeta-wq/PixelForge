import importlib.util
import json
import struct
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("prepare_dataset.py")
SPEC = importlib.util.spec_from_file_location("prepare_dataset", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


def write_png(path: Path, width: int = 8, height: int = 8) -> None:
    header = (
        b"\x89PNG\r\n\x1a\n"
        + struct.pack(">I", 13)
        + b"IHDR"
        + struct.pack(">II", width, height)
        + bytes((8, 6, 0, 0, 0))
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(header)


class DatasetPreparationTests(unittest.TestCase):
    def make_dataset(self, root: Path, records: list[dict]) -> None:
        for record in records:
            write_png(root / record["file"], width=8 + int(record["id"].split("-")[-1]))
        (root / "metadata.jsonl").write_text(
            "".join(json.dumps(record) + "\n" for record in records),
            encoding="utf-8",
        )

    def record(self, index: int, group: str | None = None) -> dict:
        return {
            "id": f"tree-{index}",
            "file": f"images/tree-{index}.png",
            "source_group": group or f"source-{index}",
            "species": "oak",
            "stage": "mature",
            "season": "summer",
            "license": "CC0-1.0",
            "source_url": f"https://example.org/{index}",
            "rights_confirmed": True,
        }

    def test_split_keeps_related_sources_together(self) -> None:
        records = [
            self.record(1, "artist-a"),
            self.record(2, "artist-a"),
            self.record(3, "artist-b"),
            self.record(4, "artist-c"),
        ]
        splits = MODULE.assign_splits(records)
        group_locations = {}
        for split_name, items in splits.items():
            for item in items:
                group_locations.setdefault(item["source_group"], set()).add(split_name)
        self.assertTrue(all(len(locations) == 1 for locations in group_locations.values()))
        self.assertEqual(set(splits), {"train", "validation", "test"})

    def test_rejects_unconfirmed_rights(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            record = self.record(1)
            record["rights_confirmed"] = False
            self.make_dataset(root, [record])
            with self.assertRaises(MODULE.DatasetError):
                MODULE.load_records(root)

    def test_rejects_duplicate_image_content(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            records = [self.record(1), self.record(2), self.record(3)]
            self.make_dataset(root, records)
            (root / records[1]["file"]).write_bytes((root / records[0]["file"]).read_bytes())
            with self.assertRaisesRegex(MODULE.DatasetError, "Duplicate image content"):
                MODULE.load_records(root)

    def test_rejects_unsafe_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            record = self.record(1)
            record["file"] = "../outside.png"
            self.make_dataset(root, [record])
            with self.assertRaisesRegex(MODULE.DatasetError, "inside the dataset"):
                MODULE.load_records(root)

    def test_requires_three_independent_source_groups(self) -> None:
        with self.assertRaisesRegex(MODULE.DatasetError, "At least three"):
            MODULE.assign_splits([self.record(1), self.record(2)])

    def test_writes_split_manifests(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.make_dataset(root, [self.record(1), self.record(2), self.record(3)])
            splits = MODULE.assign_splits(MODULE.load_records(root))
            MODULE.write_manifests(root, splits)
            self.assertTrue((root / "splits/train.jsonl").is_file())
            self.assertTrue((root / "splits/validation.jsonl").is_file())
            self.assertTrue((root / "splits/test.jsonl").is_file())
            summary = json.loads((root / "splits/summary.json").read_text(encoding="utf-8"))
            self.assertEqual(sum(summary["counts"].values()), 3)


if __name__ == "__main__":
    unittest.main()
