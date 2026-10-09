"""POST /api/resize — pixel and physical dimension resizing."""
import io
from flask import Blueprint, request, jsonify, send_file, make_response
from PIL import Image

from services.image_processor import (
    cm_to_pixels, mm_to_pixels, inches_to_pixels, resize_image
)
from utils.file_utils import validate_extension, mime_for_format

resize_bp = Blueprint('resize', __name__)


@resize_bp.route('/api/resize', methods=['POST'])
def resize():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided.'}), 400

    file = request.files['image']
    if not file.filename or not validate_extension(file.filename):
        return jsonify({'error': 'Unsupported file type.'}), 400

    # Parse parameters
    unit = request.form.get('unit', 'pixels').lower()
    dpi = int(request.form.get('dpi', 96))
    mode = request.form.get('mode', 'fit')  # fit | fill | stretch
    output_fmt = request.form.get('format', 'PNG').upper()
    if output_fmt == 'JPG':
        output_fmt = 'JPEG'

    try:
        width_val = float(request.form.get('width', 0))
        height_val = float(request.form.get('height', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'Width and height must be numeric.'}), 400

    if width_val <= 0 or height_val <= 0:
        return jsonify({'error': 'Width and height must be greater than zero.'}), 400

    # Convert to pixels
    if unit == 'cm':
        width_px = cm_to_pixels(width_val, dpi)
        height_px = cm_to_pixels(height_val, dpi)
    elif unit == 'mm':
        width_px = mm_to_pixels(width_val, dpi)
        height_px = mm_to_pixels(height_val, dpi)
    elif unit == 'inches':
        width_px = inches_to_pixels(width_val, dpi)
        height_px = inches_to_pixels(height_val, dpi)
    else:  # pixels
        width_px = max(1, round(width_val))
        height_px = max(1, round(height_val))

    if width_px > 8000 or height_px > 8000:
        return jsonify({'error': 'Resulting dimensions exceed maximum allowed (8000px).'}), 400

    try:
        img = Image.open(file.stream)
        img.load()
    except Exception:
        return jsonify({'error': 'Could not read image file.'}), 400

    try:
        result = resize_image(img, width_px, height_px, mode=mode)
    except Exception as exc:
        return jsonify({'error': f'Resize failed: {str(exc)}'}), 500

    buf = io.BytesIO()
    if output_fmt == 'JPEG':
        result.convert('RGB').save(buf, format='JPEG', quality=92, optimize=True, dpi=(dpi, dpi))
    elif output_fmt == 'WEBP':
        result.save(buf, format='WEBP', quality=92)
    else:
        result.save(buf, format='PNG', optimize=True, dpi=(dpi, dpi))

    buf.seek(0)
    ext_map = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
    response = make_response(send_file(
        buf,
        mimetype=mime_for_format(output_fmt),
        as_attachment=False,
        download_name=f"resized.{ext_map.get(output_fmt, 'png')}",
    ))
    response.headers['X-Output-Width'] = str(result.width)
    response.headers['X-Output-Height'] = str(result.height)
    response.headers['Access-Control-Expose-Headers'] = 'X-Output-Width,X-Output-Height'
    return response
