"""POST /api/filters — apply filter presets and slider adjustments."""
import io
from flask import Blueprint, request, jsonify, send_file
from PIL import Image

from services.image_processor import apply_adjustments, apply_filter_preset
from utils.file_utils import validate_extension, mime_for_format

filters_bp = Blueprint('filters', __name__)


@filters_bp.route('/api/filters', methods=['POST'])
def apply_filters():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided.'}), 400

    file = request.files['image']
    if not file.filename or not validate_extension(file.filename):
        return jsonify({'error': 'Unsupported file type.'}), 400

    try:
        img = Image.open(file.stream)
        img.load()
    except Exception:
        return jsonify({'error': 'Could not read image file.'}), 400

    output_fmt = request.form.get('format', 'JPEG').upper()
    if output_fmt == 'JPG':
        output_fmt = 'JPEG'

    preset = request.form.get('preset', '')

    def _float(key, default):
        try:
            return float(request.form.get(key, default))
        except (TypeError, ValueError):
            return float(default)

    try:
        if preset and preset != 'original':
            result = apply_filter_preset(img, preset)
            # Then apply any additional slider overrides on top
            brightness   = _float('brightness', 1.0)
            contrast     = _float('contrast', 1.0)
            saturation   = _float('saturation', 1.0)
            sharpness    = _float('sharpness', 1.0)
            warmth       = _float('warmth', 0.0)
            blur         = _float('blur', 0.0)
            highlights   = _float('highlights', 0.0)
            shadows      = _float('shadows', 0.0)
            vignette     = _float('vignette', 0.0)
            # Only re-apply if any slider is non-default
            if any(v != d for v, d in [
                (brightness, 1.0), (contrast, 1.0), (saturation, 1.0),
                (sharpness, 1.0), (warmth, 0.0), (blur, 0.0),
                (highlights, 0.0), (shadows, 0.0), (vignette, 0.0),
            ]):
                result = apply_adjustments(result, brightness=brightness,
                    contrast=contrast, saturation=saturation,
                    sharpness=sharpness, warmth=warmth, blur=blur,
                    highlights=highlights, shadows=shadows, vignette=vignette)
        else:
            result = apply_adjustments(
                img,
                brightness = _float('brightness', 1.0),
                contrast   = _float('contrast', 1.0),
                saturation = _float('saturation', 1.0),
                sharpness  = _float('sharpness', 1.0),
                warmth     = _float('warmth', 0.0),
                blur       = _float('blur', 0.0),
                highlights = _float('highlights', 0.0),
                shadows    = _float('shadows', 0.0),
                vignette   = _float('vignette', 0.0),
            )
    except Exception as exc:
        return jsonify({'error': f'Filter failed: {str(exc)}'}), 500

    buf = io.BytesIO()
    if output_fmt == 'JPEG':
        result.convert('RGB').save(buf, format='JPEG', quality=92, optimize=True)
    elif output_fmt == 'WEBP':
        result.save(buf, format='WEBP', quality=92)
    else:
        result.save(buf, format='PNG', optimize=True)

    buf.seek(0)
    ext_map = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
    return send_file(
        buf,
        mimetype=mime_for_format(output_fmt),
        as_attachment=False,
        download_name=f"filtered.{ext_map.get(output_fmt, 'jpg')}",
    )
