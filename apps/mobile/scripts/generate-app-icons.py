#!/usr/bin/env python3
"""Generate Kaku production and channel app icons.

Requires Pillow. The committed PNG files are the build inputs; this script is
kept so the geometry and channel treatment stay reproducible.
"""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets" / "images"
OUTPUT = IMAGES / "app-icons"
LEGACY = OUTPUT / "legacy"
SIZE = 1024
SCALE = 4

PINK = "#F09199"
LIGHT_BACKGROUND = "#FFF9F6"
DARK_BACKGROUND = "#0E0E10"
LIGHT_TILE = "#29282D"
DARK_TILE = "#F6F1ED"

CHANNELS = {
    "production": None,
    "debug": ("DEBUG", "#3478F6"),
    "dev": ("DEV", "#F08A24"),
    "preview": ("PREVIEW", "#8B5CF6"),
}


def scaled(value: int) -> int:
    return value * SCALE


def rounded_rectangle(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill: str | tuple[int, int, int, int],
) -> None:
    draw.rounded_rectangle(tuple(scaled(v) for v in box), radius=scaled(radius), fill=fill)


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
                selected.set_variation_by_name("Semibold")
            return selected
    raise FileNotFoundError("No supported bold font was found")


def draw_grid(
    image: Image.Image,
    *,
    origin_x: int,
    origin_y: int,
    tile_size: int,
    gap: int,
    inactive: str,
    shadow: bool,
) -> None:
    if shadow:
        shadow_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow_layer)
        for row in range(3):
            for column in range(3):
                x = origin_x + column * (tile_size + gap)
                y = origin_y + row * (tile_size + gap) + 10
                rounded_rectangle(
                    shadow_draw,
                    (x, y, x + tile_size, y + tile_size),
                    38,
                    (0, 0, 0, 68),
                )
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(scaled(18)))
        image.alpha_composite(shadow_layer)

    draw = ImageDraw.Draw(image)
    for row in range(3):
        for column in range(3):
            x = origin_x + column * (tile_size + gap)
            y = origin_y + row * (tile_size + gap)
            color = PINK if (row, column) == (1, 2) else inactive
            rounded_rectangle(
                draw,
                (x, y, x + tile_size, y + tile_size),
                38,
                color,
            )


def draw_badge(
    image: Image.Image,
    *,
    label: str,
    color: str,
    top: int,
    left: int,
    right: int,
    height: int,
) -> None:
    draw = ImageDraw.Draw(image)
    rounded_rectangle(draw, (left, top, right, top + height), 42, color)
    label_font = font(78 if label == "PREVIEW" else 88)
    bounds = draw.textbbox((0, 0), label, font=label_font)
    width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    x = scaled((left + right) // 2) - width // 2
    y = scaled(top + height // 2) - text_height // 2 - bounds[1]
    draw.text((x, y), label, font=label_font, fill="#FFFFFF")


def downsample(image: Image.Image) -> Image.Image:
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def make_ios_icon(channel: str, appearance: str) -> None:
    channel_config = CHANNELS[channel]
    is_dark = appearance == "dark"
    background = DARK_BACKGROUND if is_dark else LIGHT_BACKGROUND
    inactive = DARK_TILE if is_dark else LIGHT_TILE
    image = Image.new("RGBA", (scaled(SIZE), scaled(SIZE)), background)

    if channel_config:
        draw_grid(
            image,
            origin_x=194,
            origin_y=112,
            tile_size=176,
            gap=54,
            inactive=inactive,
            shadow=True,
        )
        draw_badge(
            image,
            label=channel_config[0],
            color=channel_config[1],
            top=766,
            left=150,
            right=874,
            height=142,
        )
    else:
        draw_grid(
            image,
            origin_x=194,
            origin_y=194,
            tile_size=176,
            gap=54,
            inactive=inactive,
            shadow=True,
        )

    downsample(image).convert("RGB").save(
        OUTPUT / f"kaku-{channel}-{appearance}.png",
        optimize=True,
    )


def make_android_foreground(channel: str) -> None:
    channel_config = CHANNELS[channel]
    image = Image.new("RGBA", (scaled(SIZE), scaled(SIZE)), (0, 0, 0, 0))

    if channel_config:
        draw_grid(
            image,
            origin_x=257,
            origin_y=202,
            tile_size=132,
            gap=54,
            inactive=LIGHT_TILE,
            shadow=False,
        )
        draw_badge(
            image,
            label=channel_config[0],
            color=channel_config[1],
            top=690,
            left=230,
            right=794,
            height=116,
        )
    else:
        draw_grid(
            image,
            origin_x=257,
            origin_y=257,
            tile_size=132,
            gap=54,
            inactive=LIGHT_TILE,
            shadow=False,
        )

    downsample(image).save(
        OUTPUT / f"kaku-{channel}-foreground.png",
        optimize=True,
    )


def make_android_monochrome(channel: str) -> None:
    channel_config = CHANNELS[channel]
    mask = Image.new("L", (scaled(SIZE), scaled(SIZE)), 0)
    draw = ImageDraw.Draw(mask)

    grid_y = 202 if channel_config else 257
    for row in range(3):
        for column in range(3):
            x = 257 + column * (132 + 54)
            y = grid_y + row * (132 + 54)
            rounded_rectangle(draw, (x, y, x + 132, y + 132), 30, 255)

    if channel_config:
        left, top, right, height = 230, 690, 794, 116
        rounded_rectangle(draw, (left, top, right, top + height), 34, 255)
        label = channel_config[0]
        label_font = font(58 if label == "PREVIEW" else 68)
        bounds = draw.textbbox((0, 0), label, font=label_font)
        width = bounds[2] - bounds[0]
        text_height = bounds[3] - bounds[1]
        x = scaled((left + right) // 2) - width // 2
        y = scaled(top + height // 2) - text_height // 2 - bounds[1]
        draw.text((x, y), label, font=label_font, fill=0)

    alpha = downsample(mask)
    result = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    result.putalpha(alpha)
    result.save(OUTPUT / f"kaku-{channel}-monochrome.png", optimize=True)


def preserve_legacy_assets() -> None:
    LEGACY.mkdir(parents=True, exist_ok=True)
    for filename in ("kaku-icon.png", "kaku-mark.png", "kaku-mark-safe.png"):
        source = IMAGES / filename
        digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
        target = LEGACY / f"{source.stem}-{digest}{source.suffix}"
        if not target.exists():
            shutil.copyfile(source, target)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    preserve_legacy_assets()
    for channel in CHANNELS:
        for appearance in ("light", "dark"):
            make_ios_icon(channel, appearance)
        make_android_foreground(channel)
        make_android_monochrome(channel)


if __name__ == "__main__":
    main()
