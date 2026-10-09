"""
AI enhancement service.

Attempts to load Real-ESRGAN for upscaling.  If the model is unavailable
(not installed, weights missing, or out-of-memory), falls back to a
conventional pipeline using OpenCV and Pillow that still provides a
meaningful improvement: denoising, unsharp mask, super-resolution via
Lanczos, and local-contrast enhancement.

The caller should check `AI_AVAILABLE` to inform the frontend whether true
AI upscaling is active.
"""

import os
import logging
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import cv2

logger = logging.getLogger(__name__)

AI_AVAILABLE = False
_upsampler = None


def _try_load_realesrgan():
    global AI_AVAILABLE, _upsampler
    try:
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer

        model = RRDBNet(
            num_in_ch=3, num_out_ch=3, num_feat=64,
            num_block=23, num_grow_ch=32, scale=4,
        )
        weights_path = os.path.join(
            os.path.dirname(__file__), '..', 'weights',
            'RealESRGAN_x4plus.pth',
        )
        if not os.path.exists(weights_path):
            logger.info("Real-ESRGAN weights not found; using conventional fallback.")
            return

        _upsampler = RealESRGANer(
            scale=4,
            model_path=weights_path,
            model=model,
            half=False,
            tile=256,
            tile_pad=10,
            pre_pad=0,
        )
        AI_AVAILABLE = True
        logger.info("Real-ESRGAN loaded successfully.")
    except Exception as exc:
        logger.info("Real-ESRGAN not available (%s); using conventional fallback.", exc)


# Try once at import time (non-fatal)
_try_load_realesrgan()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def enhance_image(img: Image.Image, scale: int = 2, preset: str = 'natural') -> Image.Image:
    """
    Main entry point.  Returns an enhanced PIL Image.

    scale: 2 or 4
    preset: 'face_enhance' | 'old_photo' | 'blur_reduction' |
            'hd_upscale' | 'natural' | 'color'
    """
    if AI_AVAILABLE and _upsampler is not None:
        return _ai_enhance(img, scale, preset)
    return _conventional_enhance(img, scale, preset)


# ---------------------------------------------------------------------------
# AI path
# ---------------------------------------------------------------------------

def _ai_enhance(img: Image.Image, scale: int, preset: str) -> Image.Image:
    try:
        arr = np.array(img.convert('RGB'))
        arr_bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

        out_bgr, _ = _upsampler.enhance(arr_bgr, outscale=scale)
        out_rgb = cv2.cvtColor(out_bgr, cv2.COLOR_BGR2RGB)
        result = Image.fromarray(out_rgb)

        # Apply preset-specific post-processing
        result = _postprocess(result, preset)
        return result
    except Exception as exc:
        logger.warning("AI enhance failed (%s); falling back.", exc)
        return _conventional_enhance(img, scale, preset)


# ---------------------------------------------------------------------------
# Conventional fallback
# ---------------------------------------------------------------------------

def _conventional_enhance(img: Image.Image, scale: int, preset: str) -> Image.Image:
    """
    High-quality conventional enhancement pipeline:
    1. Denoise with Non-Local Means (OpenCV)
    2. Upscale with Lanczos
    3. Unsharp mask sharpening
    4. Preset-specific tone adjustments
    """
    # Work in RGB
    arr = np.array(img.convert('RGB'))

    # 1. Denoise
    h_param = 8 if preset in ('blur_reduction', 'old_photo') else 5
    arr = cv2.fastNlMeansDenoisingColored(arr, None, h_param, h_param, 7, 21)

    # 2. Upscale
    new_w = img.width * scale
    new_h = img.height * scale
    arr = cv2.resize(arr, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    # 3. Unsharp mask for apparent sharpness
    blur = cv2.GaussianBlur(arr, (0, 0), 3)
    arr = cv2.addWeighted(arr, 1.5, blur, -0.5, 0)
    arr = np.clip(arr, 0, 255).astype(np.uint8)

    result = Image.fromarray(arr)

    # 4. Preset tone adjustments
    result = _postprocess(result, preset)
    return result


# ---------------------------------------------------------------------------
# Post-processing by preset
# ---------------------------------------------------------------------------

def _postprocess(img: Image.Image, preset: str) -> Image.Image:
    from services.image_processor import apply_adjustments, _sepia_tone

    presets = {
        'face_enhance': dict(contrast=1.1, sharpness=1.4, brightness=1.05, saturation=1.05),
        'old_photo':    dict(contrast=1.15, sharpness=1.3, brightness=1.1, saturation=0.85),
        'blur_reduction': dict(sharpness=1.8, contrast=1.1),
        'hd_upscale':   dict(sharpness=1.2, contrast=1.05),
        'natural':      dict(saturation=1.05, contrast=1.05, brightness=1.02),
        'color':        dict(saturation=1.3, contrast=1.1, warmth=0.1),
    }
    params = presets.get(preset, presets['natural'])
    defaults = dict(brightness=1.0, contrast=1.0, saturation=1.0,
                    sharpness=1.0, warmth=0.0, blur=0.0,
                    highlights=0.0, shadows=0.0, vignette=0.0)
    defaults.update(params)
    return apply_adjustments(img, **defaults)
