"""POST /api/crop — crop, flip, rotate."""
import io
from flask import Blueprint, request, jsonify, send_file, make_response
from PIL import Image

from services.image_processor import (
    crop_image, crop_to_aspect, crop_circle, flip_image, rotate_image
)
from utils.file_utils import validate_extension, mime_for_format

crop_bp = Blueprint('crop', __name__)


@crop_bp.route('/api/crop', methods=['POST'])
def crop():
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

    operation = request.form.get('operation', 'crop')
    output_fmt = request.form.get('format', 'PNG').upper()
    if output_fmt == 'JPG':
        output_fmt = 'JPEG'

    try:
        if operation == 'crop':
            x = int(float(request.form.get('x', 0)))
            y = int(float(request.form.get('y', 0)))
            w = int(float(request.form.get('w', img.width)))
            h = int(float(request.form.get('h', img.height)))
            result = crop_image(img, x, y, w, h)

        elif operation == 'aspect':
            aw = float(request.form.get('aspect_w', 1))
            ah = float(request.form.get('aspect_h', 1))
            result = crop_to_aspect(img, aw, ah)

        elif operation == 'circle':
            result = crop_circle(img)
            output_fmt = 'PNG'  # circle requires alpha channel

        elif operation == 'flip':
            direction = request.form.get('direction', 'horizontal')
            result = flip_image(img, direction)

        elif operation == 'rotate':
            degrees = int(request.form.get('degrees', 90))
            result = rotate_image(img, degrees)

        else:
            return jsonify({'error': f'Unknown operation: {operation}'}), 400

    except Exception as exc:
        return jsonify({'error': f'Operation failed: {str(exc)}'}), 500

    buf = io.BytesIO()
    if output_fmt == 'JPEG':
        result.convert('RGB').save(buf, format='JPEG', quality=92, optimize=True)
    elif output_fmt == 'WEBP':
        result.save(buf, format='WEBP', quality=92)
    else:
        result.save(buf, format='PNG', optimize=True)

    buf.seek(0)
    ext_map = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
    response = make_response(send_file(
        buf,
        mimetype=mime_for_format(output_fmt),
        as_attachment=False,
        download_name=f"cropped.{ext_map.get(output_fmt, 'png')}",
    ))
    response.headers['X-Output-Width']  = str(result.width)
    response.headers['X-Output-Height'] = str(result.height)
    response.headers['Access-Control-Expose-Headers'] = 'X-Output-Width,X-Output-Height'
    return response
