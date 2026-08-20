"""Apply the high-resolution canonical equipment images to public assets.

The source run contains one duplicate slug (smith-machine in the pilot and
full run).  The full-run image wins so every public URL is updated once.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FULL_RUN = ROOT / "artifacts" / "equipment-image-regeneration" / "chatgpt-plus-full"
PILOT_RUN = ROOT / "artifacts" / "equipment-image-regeneration" / "chatgpt-plus-test"
PUBLIC_EQUIPMENT = ROOT / "public" / "equipment"
TARGET_SIZE = (1448, 1086)


def collect_sources() -> dict[str, Path]:
    sources: dict[str, Path] = {}
    # Prefer the full run when a slug exists in both runs.
    for source_dir in (FULL_RUN, PILOT_RUN):
        for source in sorted(source_dir.glob("*.png")):
            if source.name.startswith("_"):
                continue
            with Image.open(source) as image:
                if image.size == TARGET_SIZE:
                    sources.setdefault(source.stem, source)
    return sources


def main() -> None:
    sources = collect_sources()
    PUBLIC_EQUIPMENT.mkdir(parents=True, exist_ok=True)

    for slug, source in sorted(sources.items()):
        target = PUBLIC_EQUIPMENT / f"{slug}.webp"
        with Image.open(source) as image:
            image.convert("RGB").save(target, "WEBP", quality=92, method=6)

    print(f"source_files={len(sources)}")
    print(f"target_dir={PUBLIC_EQUIPMENT}")
    print("slugs=" + ",".join(sorted(sources)))


if __name__ == "__main__":
    main()
