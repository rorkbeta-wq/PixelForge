# Tree model training data

This directory contains the first data-preparation step for the reference-learned tree generator. It contains no training images or model weights.

## Dataset layout

Keep source images outside Git unless their license explicitly permits redistribution:

    my-tree-dataset/
      metadata.jsonl
      images/
        oak_001.png
        pine_001.png
        birch_001.png

Each PNG must have an alpha channel. Each metadata line describes one independently reviewed sprite:

    {"id":"oak-001","file":"images/oak_001.png","source_group":"oak-photo-set-a","species":"oak","stage":"mature","season":"summer","license":"CC-BY-4.0","source_url":"https://example.org/source","rights_confirmed":true,"caption":"Detailed mature broadleaf oak, transparent background"}

source_group identifies the original artwork, artist, source sheet, or tightly related source family. All crops or variants from the same source group stay in the same split to prevent leakage. Do not create fake groups just to satisfy the split requirement.

rights_confirmed must be true only after checking the actual license and permissions for model training and intended distribution. A publicly viewable image is not automatically licensed for training.

## Validate and split

The validator uses only the Python standard library:

    python3 training/trees/prepare_dataset.py /path/to/my-tree-dataset

Use --check-only to validate without writing files. Successful validation creates train.jsonl, validation.jsonl, test.jsonl, and summary.json in a splits directory.

The split is deterministic and grouped by source_group. The validator rejects missing rights confirmation, duplicate image content, non-PNG files, PNGs without alpha, unsafe paths, and datasets with fewer than three independent source groups.

## Important limitations

- This step does not train a model.
- It does not remove backgrounds, resize sprites, augment images, or alter source files.
- The source images are not copied into model outputs.
- A successful dataset check is not evidence of model quality or novelty.
- Training code and a model choice are added only after a pilot dataset and hardware benchmark justify them.

The first pilot should include multiple species and visually distinct examples. Keep a human-reviewed holdout set untouched until the model and training settings are selected.
