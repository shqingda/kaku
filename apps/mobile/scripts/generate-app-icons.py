#!/usr/bin/env python3
"""Generate brightened Kaku icons and Chrome-style channel badges.

Requires Pillow. The committed PNG files are the build inputs; this script is
kept so the color correction and channel treatment stay reproducible.
"""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets" / "images"
OUTPUT = IMAGES / "app-icons"
LEGACY = OUTPUT / "legacy"
SIZE = 1024
SCALE = 4

BADGE_COLOR = "#3A3A3C"
CHANNELS = {
    "production": None,
    "debug": "DEBUG",
    "dev": "DEV",
    "preview": "PREVIEW",
}


def scaled(value: int) -> int:
    return value * SCALE


def font(size: int) -> ImageFont.FreeTypeFont:
    candidates = (
        Path("/System/Library/Fonts/SFNSRounded.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            selected = ImageFont.truetype(str(candidate), scaled(size))
            if candidate.name == "SFNSRounded.ttf":
                selected.set_variation_by_name("Medium")
            return selected
    raise FileNotFoundError("No supported display font was found")


def preserve_legacy_assets() -> None:
    LEGACY.mkdir(parents=True, exist_ok=True)
    for filename in ("kaku-icon.png", "kaku-mark.png", "kaku-mark-safe.png"):
        source = IMAGES / filename
        digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
        target = LEGACY / f"{source.stem}-{digest}{source.suffix}"
        if not target.exists():
            shutil.copyfile(source, target)


def brighten_pink(image: Image.Image) -> Image.Image:
    """Brighten only pink pixels while preserving the original material work."""
    rgba = image.convert("RGBA")
    red, green, blue, alpha = rgba.split()
    red_over_green = ImageChops.subtract(red, green)
    red_over_blue = ImageChops.subtract(red, blue)
    pink_mask = ImageChops.darker(red_over_green, red_over_blue).point(
        lambda value: max(0, min(255, (value - 8) * 7))
    )
    pink_mask = ImageChops.multiply(pink_mask, alpha)

    brighter = ImageEnhance.Brightness(rgba).enhance(1.10)
    brighter = ImageEnhance.Color(brighter).enhance(1.06)
    return Image.composite(brighter, rgba, pink_mask)


def badge_font_size(label: str, *, adaptive: bool) -> int:
    if adaptive:
        return 96 if label == "PREVIEW" else 116
    return 118 if label == "PREVIEW" else 146


def add_badge(
    image: Image.Image,
    label: str,
    *,
    adaptive: bool,
) -> Image.Image:
    canvas = image.convert("RGBA").resize(
        (scaled(SIZE), scaled(SIZE)),
        Image.Resampling.LANCZOS,
    )
    draw = ImageDraw.Draw(canvas)
    label_font = font(badge_font_size(label, adaptive=adaptive))
    bounds = draw.textbbox((0, 0), label, font=label_font)
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]

    if adaptive:
        right = 940
        top = 626
        height = 190
        horizontal_padding = 44
    else:
        right = 1024
        top = 626
        height = 230
        horizontal_padding = 54

    left = right - (text_width // SCALE) - horizontal_padding * 2
    draw.rectangle(
        (scaled(left), scaled(top), scaled(right), scaled(top + height)),
        fill=BADGE_COLOR,
    )

    x = scaled(left + horizontal_padding)
    y = scaled(top + height // 2) - text_height // 2 - bounds[1]
    draw.text((x, y), label, font=label_font, fill="#FFFFFF")

    return canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def make_ios_icons(channel: str) -> None:
    base = brighten_pink(Image.open(IMAGES / "kaku-icon.png"))
    label = CHANNELS[channel]
    result = add_badge(base, label, adaptive=False) if label else base
    result = result.convert("RGB")

    # The owner chose the original icon artwork for both appearances.
    for appearance in ("light", "dark"):
        result.save(
            OUTPUT / f"kaku-{channel}-{appearance}.png",
            optimize=True,
        )


def make_android_foreground(channel: str) -> None:
    base = brighten_pink(Image.open(IMAGES / "kaku-mark-safe.png"))
    label = CHANNELS[channel]
    result = add_badge(base, label, adaptive=True) if label else base
    result.save(
        OUTPUT / f"kaku-{channel}-foreground.png",
        optimize=True,
    )


def make_android_monochrome(channel: str) -> None:
    source = Image.open(IMAGES / "kaku-mark-safe.png").convert("RGBA")
    alpha = source.getchannel("A").resize(
        (scaled(SIZE), scaled(SIZE)),
        Image.Resampling.LANCZOS,
    )
    label = CHANNELS[channel]

    if label:
        draw = ImageDraw.Draw(alpha)
        label_font = font(badge_font_size(label, adaptive=True))
        bounds = draw.textbbox((0, 0), label, font=label_font)
        text_width = bounds[2] - bounds[0]
        text_height = bounds[3] - bounds[1]
        right, top, height, horizontal_padding = 940, 626, 190, 44
        left = right - (text_width // SCALE) - horizontal_padding * 2
        draw.rectangle(
            (scaled(left), scaled(top), scaled(right), scaled(top + height)),
            fill=255,
        )
        x = scaled(left + horizontal_padding)
        y = scaled(top + height // 2) - text_height // 2 - bounds[1]
        draw.text((x, y), label, font=label_font, fill=0)

    alpha = alpha.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    result.putalpha(alpha)
    result.save(OUTPUT / f"kaku-{channel}-monochrome.png", optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    preserve_legacy_assets()
    for channel in CHANNELS:
        make_ios_icons(channel)
        make_android_foreground(channel)
        make_android_monochrome(channel)


if __name__ == "__main__":
    main()
