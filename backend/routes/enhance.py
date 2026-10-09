"""POST /api/enhance — AI-powered image enhancement."""
import io
import os
from flask import Blueprint, request, jsonify, send_file, make_response
from PIL import Image

from services.ai_enhancer import enhance_image, AI_AVAILABLE
from utils.file_utils import validate_extension, safe_temp_path, delete_temp, mime_for_format

enhance_bp = Blueprint('enhance', __name__)

MAX_INPUT_PX = 4000  # each side


@enhance_bp.route('/api/enhance', methods=['POST'])
def enhance():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided.'}), 400

    file = request.files['image']
    if not file.filename or not validate_extension(file.filename):
        return jsonify({'error': 'Unsupported file type. Use JPG, PNG, or WebP.'}), 400

    scale = int(request.form.get('scale', 2))
    if scale not in (2, 4):
        scale = 2

    preset = request.form.get('preset', 'natural')
    output_fmt = request.form.get('format', 'PNG').upper()
    if output_fmt == 'JPG':
        output_fmt = 'JPEG'
    if output_fmt not in ('JPEG', 'PNG', 'WEBP'):
        output_fmt = 'PNG'

    try:
        img = Image.open(file.stream)
        img.load()
    except Exception:
        return jsonify({'error': 'Could not read image file. It may be corrupt.'}), 400

    # Guard against very large inputs
    if img.width > MAX_INPUT_PX or img.height > MAX_INPUT_PX:
        return jsonify({
            'error': f'Input image too large (max {MAX_INPUT_PX}px per side for enhancement).'
        }), 400

    # Guard against upscaling already huge images
    if img.width * scale > 8000 or img.height * scale > 8000:
        scale = 2

    try:
        enhanced = enhance_image(img, scale=scale, preset=preset)
    except Exception as exc:
        return jsonify({'error': f'Enhancement failed: {str(exc)}'}), 500

    buf = io.BytesIO()
    if output_fmt == 'JPEG':
        enhanced = enhanced.convert('RGB')
        enhanced.save(buf, format='JPEG', quality=92, optimize=True)
    elif output_fmt == 'WEBP':
        enhanced.save(buf, format='WEBP', quality=92)
    else:
        enhanced.save(buf, format='PNG', optimize=True)

    buf.seek(0)
    ext_map = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
    filename = f"enhanced.{ext_map.get(output_fmt, 'png')}"

    response = make_response(send_file(
        buf,
        mimetype=mime_for_format(output_fmt),
        as_attachment=False,
        download_name=filename,
    ))
    response.headers['X-AI-Available'] = str(AI_AVAILABLE).lower()
    response.headers['X-Output-Width'] = str(enhanced.width)
    response.headers['X-Output-Height'] = str(enhanced.height)
    response.headers['Access-Control-Expose-Headers'] = 'X-AI-Available,X-Output-Width,X-Output-Height'
    return response
