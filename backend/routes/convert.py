"""POST /api/convert — image format conversion."""
import io
from flask import Blueprint, request, jsonify, send_file, make_response
from PIL import Image

from services.image_processor import convert_format
from utils.file_utils import validate_extension, mime_for_format

convert_bp = Blueprint('convert', __name__)

SUPPORTED_CONVERSIONS = {
    ('PNG', 'JPEG'), ('PNG', 'WEBP'),
    ('JPEG', 'PNG'), ('JPEG', 'WEBP'),
    ('WEBP', 'PNG'), ('WEBP', 'JPEG'),
}


@convert_bp.route('/api/convert', methods=['POST'])
def convert():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided.'}), 400

    file = request.files['image']
    if not file.filename or not validate_extension(file.filename):
        return jsonify({'error': 'Unsupported file type.'}), 400

    target_fmt = request.form.get('target_format', 'PNG').upper()
    if target_fmt == 'JPG':
        target_fmt = 'JPEG'
    if target_fmt not in ('JPEG', 'PNG', 'WEBP'):
        return jsonify({'error': 'Unsupported target format.'}), 400

    # Parse optional background color for JPEG transparency handling
    bg_r = int(request.form.get('bg_r', 255))
    bg_g = int(request.form.get('bg_g', 255))
    bg_b = int(request.form.get('bg_b', 255))
    bg_color = (bg_r, bg_g, bg_b)

    quality = int(request.form.get('quality', 92))
    quality = max(10, min(100, quality))

    try:
        img = Image.open(file.stream)
        img.load()
    except Exception:
        return jsonify({'error': 'Could not read image file.'}), 400

    original_format = (img.format or 'UNKNOWN').upper()
    had_transparency = img.mode in ('RGBA', 'LA', 'P')

    try:
        result = convert_format(img, target_fmt, bg_color=bg_color)
    except Exception as exc:
        return jsonify({'error': f'Conversion failed: {str(exc)}'}), 500

    buf = io.BytesIO()
    if target_fmt == 'JPEG':
        result.save(buf, format='JPEG', quality=quality, optimize=True)
    elif target_fmt == 'WEBP':
        result.save(buf, format='WEBP', quality=quality)
    else:
        result.save(buf, format='PNG', optimize=True)

    converted_size = buf.tell()
    buf.seek(0)

    ext_map = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
    response = make_response(send_file(
        buf,
        mimetype=mime_for_format(target_fmt),
        as_attachment=False,
        download_name=f"converted.{ext_map.get(target_fmt, 'png')}",
    ))
    response.headers['X-Original-Format']  = original_format
    response.headers['X-Output-Format']    = target_fmt
    response.headers['X-Converted-Size']   = str(converted_size)
    response.headers['X-Had-Transparency'] = str(had_transparency).lower()
    response.headers['Access-Control-Expose-Headers'] = (
        'X-Original-Format,X-Output-Format,X-Converted-Size,X-Had-Transparency'
    )
    return response
