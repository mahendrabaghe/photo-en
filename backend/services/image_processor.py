"""
Core image processing utilities using Pillow and OpenCV.
All operations return PIL Images or save to disk paths.
"""
import io
import math
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ImageDraw
import cv2


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pil_to_cv2(img: Image.Image) -> np.ndarray:
    """Convert PIL RGBA/RGB to OpenCV BGR(A) ndarray."""
    if img.mode == 'RGBA':
        arr = np.array(img)
        return cv2.cvtColor(arr, cv2.COLOR_RGBA2BGRA)
    arr = np.array(img.convert('RGB'))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def cv2_to_pil(arr: np.ndarray) -> Image.Image:
    if arr.ndim == 3 and arr.shape[2] == 4:
        return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGRA2RGBA))
    return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))


def open_image(path: str) -> Image.Image:
    img = Image.open(path)
    img.load()
    return img


def save_image(img: Image.Image, path: str, fmt: str = 'PNG', quality: int = 92):
    save_kwargs: dict = {}
    fmt_upper = fmt.upper()
    if fmt_upper == 'JPEG':
        img = img.convert('RGB')
        save_kwargs['quality'] = quality
        save_kwargs['optimize'] = True
    elif fmt_upper == 'WEBP':
        save_kwargs['quality'] = quality
        save_kwargs['method'] = 4
    elif fmt_upper == 'PNG':
        save_kwargs['optimize'] = True
    img.save(path, format=fmt_upper if fmt_upper != 'JPG' else 'JPEG', **save_kwargs)


def image_to_bytes(img: Image.Image, fmt: str = 'PNG', quality: int = 92) -> bytes:
    buf = io.BytesIO()
    save_image(img, buf, fmt=fmt, quality=quality)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Resize
# ---------------------------------------------------------------------------

def cm_to_pixels(cm: float, dpi: int) -> int:
    return max(1, round((cm / 2.54) * dpi))


def mm_to_pixels(mm: float, dpi: int) -> int:
    return max(1, round((mm / 25.4) * dpi))


def inches_to_pixels(inches: float, dpi: int) -> int:
    return max(1, round(inches * dpi))


def resize_image(
    img: Image.Image,
    width_px: int,
    height_px: int,
    mode: str = 'fit',
) -> Image.Image:
    """
    mode: 'fit' | 'fill' | 'stretch'
    """
    mode = mode.lower()
    target = (width_px, height_px)

    if mode == 'stretch':
        return img.resize(target, Image.LANCZOS)

    if mode == 'fill':
        # Crop to fill
        img_ratio = img.width / img.height
        tgt_ratio = width_px / height_px
        if img_ratio > tgt_ratio:
            new_h = height_px
            new_w = round(height_px * img_ratio)
        else:
            new_w = width_px
            new_h = round(width_px / img_ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        left = (img.width - width_px) // 2
        top = (img.height - height_px) // 2
        return img.crop((left, top, left + width_px, top + height_px))

    # fit (default) – letterbox / scale to fit within target, no crop
    img.thumbnail(target, Image.LANCZOS)
    return img


# ---------------------------------------------------------------------------
# Compress
# ---------------------------------------------------------------------------

def compress_to_target(
    img: Image.Image,
    target_bytes: int,
    fmt: str = 'JPEG',
    allow_resize: bool = False,
) -> tuple[bytes, int, int]:
    """
    Iteratively adjust quality (and optionally dimensions) to hit target_bytes.
    Returns (data_bytes, actual_size, quality_used).
    """
    fmt_upper = fmt.upper()
    if fmt_upper == 'JPG':
        fmt_upper = 'JPEG'

    if fmt_upper == 'PNG':
        # PNG is lossless; try png optimize, then suggest conversion
        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True, compress_level=9)
        data = buf.getvalue()
        return data, len(data), 100

    lo, hi = 10, 95
    best_data = b''
    best_size = 10 ** 9
    quality = hi

    for _ in range(20):
        mid = (lo + hi) // 2
        buf = io.BytesIO()
        work = img.convert('RGB') if fmt_upper == 'JPEG' else img
        work.save(buf, format=fmt_upper, quality=mid, optimize=True)
        data = buf.getvalue()
        size = len(data)

        if abs(size - target_bytes) < abs(best_size - target_bytes):
            best_data = data
            best_size = size
            quality = mid

        if size > target_bytes:
            hi = mid - 1
        else:
            lo = mid + 1

        if lo > hi:
            break

    # If still too big and resize allowed, shrink dimensions
    if best_size > target_bytes * 1.05 and allow_resize:
        scale = math.sqrt(target_bytes / best_size)
        new_w = max(1, round(img.width * scale))
        new_h = max(1, round(img.height * scale))
        img_small = img.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        work = img_small.convert('RGB') if fmt_upper == 'JPEG' else img_small
        work.save(buf, format=fmt_upper, quality=quality, optimize=True)
        best_data = buf.getvalue()
        best_size = len(best_data)

    return best_data, best_size, quality


# ---------------------------------------------------------------------------
# Crop
# ---------------------------------------------------------------------------

def crop_image(
    img: Image.Image,
    x: int,
    y: int,
    w: int,
    h: int,
) -> Image.Image:
    x2, y2 = min(x + w, img.width), min(y + h, img.height)
    return img.crop((max(0, x), max(0, y), x2, y2))


def crop_to_aspect(img: Image.Image, aspect_w: float, aspect_h: float) -> Image.Image:
    img_ratio = img.width / img.height
    tgt_ratio = aspect_w / aspect_h
    if img_ratio > tgt_ratio:
        new_w = round(img.height * tgt_ratio)
        left = (img.width - new_w) // 2
        return img.crop((left, 0, left + new_w, img.height))
    else:
        new_h = round(img.width / tgt_ratio)
        top = (img.height - new_h) // 2
        return img.crop((0, top, img.width, top + new_h))


def crop_circle(img: Image.Image) -> Image.Image:
    """Crop image to a circle with transparent background (RGBA)."""
    img = img.convert('RGBA')
    size = min(img.width, img.height)
    # Center crop first
    left = (img.width - size) // 2
    top = (img.height - size) // 2
    img = img.crop((left, top, left + size, top + size))

    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    img.putalpha(mask)
    return img


def flip_image(img: Image.Image, direction: str) -> Image.Image:
    if direction == 'horizontal':
        return ImageOps.mirror(img)
    return ImageOps.flip(img)


def rotate_image(img: Image.Image, degrees: int) -> Image.Image:
    return img.rotate(-degrees, expand=True)


# ---------------------------------------------------------------------------
# Filters & adjustments
# ---------------------------------------------------------------------------

def apply_adjustments(
    img: Image.Image,
    brightness: float = 1.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    sharpness: float = 1.0,
    warmth: float = 0.0,
    blur: float = 0.0,
    highlights: float = 0.0,
    shadows: float = 0.0,
    vignette: float = 0.0,
) -> Image.Image:
    """Apply all slider adjustments. Values: brightness/contrast/saturation/sharpness 0–2,
    warmth -1..1, blur 0..10, highlights/shadows -1..1, vignette 0..1."""

    img = ImageEnhance.Brightness(img).enhance(max(0.0, brightness))
    img = ImageEnhance.Contrast(img).enhance(max(0.0, contrast))
    img = ImageEnhance.Color(img).enhance(max(0.0, saturation))
    img = ImageEnhance.Sharpness(img).enhance(max(0.0, sharpness))

    if warmth != 0.0:
        img = _apply_warmth(img, warmth)

    if highlights != 0.0 or shadows != 0.0:
        img = _apply_highlights_shadows(img, highlights, shadows)

    if blur > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur))

    if vignette > 0:
        img = _apply_vignette(img, vignette)

    return img


def _apply_warmth(img: Image.Image, warmth: float) -> Image.Image:
    """warmth in -1..1; positive = warmer (more red/yellow), negative = cooler."""
    arr = np.array(img.convert('RGB')).astype(np.float32)
    factor = warmth * 30
    arr[:, :, 0] = np.clip(arr[:, :, 0] + factor, 0, 255)   # R
    arr[:, :, 2] = np.clip(arr[:, :, 2] - factor, 0, 255)   # B
    result = Image.fromarray(arr.astype(np.uint8))
    if img.mode == 'RGBA':
        result = result.convert('RGBA')
        result.putalpha(img.split()[3])
    return result


def _apply_highlights_shadows(img: Image.Image, highlights: float, shadows: float) -> Image.Image:
    """highlights/shadows in -1..1."""
    arr = np.array(img.convert('RGB')).astype(np.float32)
    # highlights affect bright areas
    if highlights != 0:
        mask = arr / 255.0
        arr = arr + highlights * 50 * mask
    # shadows affect dark areas
    if shadows != 0:
        mask = 1.0 - arr / 255.0
        arr = arr + shadows * 50 * mask
    arr = np.clip(arr, 0, 255)
    result = Image.fromarray(arr.astype(np.uint8))
    if img.mode == 'RGBA':
        result = result.convert('RGBA')
        result.putalpha(img.split()[3])
    return result


def _apply_vignette(img: Image.Image, strength: float) -> Image.Image:
    """strength 0..1"""
    arr = np.array(img.convert('RGBA')).astype(np.float32)
    h, w = arr.shape[:2]
    cy, cx = h / 2, w / 2
    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt(((X - cx) / cx) ** 2 + ((Y - cy) / cy) ** 2)
    vign = 1 - np.clip(dist * strength, 0, 1) * 0.8
    for c in range(3):
        arr[:, :, c] *= vign
    arr = np.clip(arr, 0, 255)
    result = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    if img.mode != 'RGBA':
        result = result.convert(img.mode)
    return result


FILTER_PRESETS = {
    'original': {},
    'natural': {'saturation': 1.1, 'contrast': 1.05, 'brightness': 1.02},
    'portrait': {'saturation': 0.9, 'contrast': 1.1, 'warmth': 0.2, 'brightness': 1.05},
    'vintage': {'saturation': 0.6, 'contrast': 1.15, 'warmth': 0.3, 'brightness': 0.95},
    'bw': {'saturation': 0.0},
    'sepia': {'saturation': 0.0, 'warmth': 0.5, 'contrast': 1.1},
    'warm': {'warmth': 0.6, 'saturation': 1.1},
    'cool': {'warmth': -0.5, 'saturation': 1.05},
    'cinematic': {'contrast': 1.3, 'saturation': 0.8, 'shadows': -0.2, 'highlights': -0.1},
    'hdr': {'contrast': 1.4, 'saturation': 1.3, 'sharpness': 1.5},
    'vivid': {'saturation': 1.5, 'contrast': 1.2, 'brightness': 1.05},
    'soft_glow': {'brightness': 1.1, 'saturation': 0.95, 'blur': 0.4, 'contrast': 0.95},
    'sharpen': {'sharpness': 2.0},
    'grayscale': {'saturation': 0.0},
    'brighten': {'brightness': 1.3},
    'contrast_boost': {'contrast': 1.5},
}


def apply_filter_preset(img: Image.Image, preset_name: str) -> Image.Image:
    params = FILTER_PRESETS.get(preset_name, {})
    defaults = {
        'brightness': 1.0,
        'contrast': 1.0,
        'saturation': 1.0,
        'sharpness': 1.0,
        'warmth': 0.0,
        'blur': 0.0,
        'highlights': 0.0,
        'shadows': 0.0,
        'vignette': 0.0,
    }
    defaults.update(params)
    result = apply_adjustments(img, **defaults)
    # Special sepia toning
    if preset_name == 'sepia':
        result = _sepia_tone(result)
    return result


def _sepia_tone(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert('RGB')).astype(np.float32)
    r = arr[:, :, 0] * 0.393 + arr[:, :, 1] * 0.769 + arr[:, :, 2] * 0.189
    g = arr[:, :, 0] * 0.349 + arr[:, :, 1] * 0.686 + arr[:, :, 2] * 0.168
    b = arr[:, :, 0] * 0.272 + arr[:, :, 1] * 0.534 + arr[:, :, 2] * 0.131
    sepia = np.stack([r, g, b], axis=2)
    sepia = np.clip(sepia, 0, 255).astype(np.uint8)
    return Image.fromarray(sepia)


# ---------------------------------------------------------------------------
# Format conversion
# ---------------------------------------------------------------------------

def convert_format(
    img: Image.Image,
    target_fmt: str,
    bg_color: tuple = (255, 255, 255),
) -> Image.Image:
    """Convert image to target_fmt. Handles transparency → JPEG by compositing."""
    target_upper = target_fmt.upper()
    if target_upper == 'JPG':
        target_upper = 'JPEG'

    if target_upper == 'JPEG' and img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, bg_color)
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        return background

    if target_upper == 'PNG':
        return img.convert('RGBA') if img.mode not in ('RGB', 'RGBA', 'L', 'LA') else img

    if target_upper == 'WEBP':
        return img

    return img
