"""POST /api/compress — reduce file size to target KB/MB."""
import io
from flask import Blueprint, request, jsonify, send_file, make_response
from PIL import Image

from services.image_processor import compress_to_target, resize_image
from utils.file_utils import validate_extension, mime_for_format

compress_bp = Blueprint('compress', __name__)


@compress_bp.route('/api/compress', methods=['POST'])
def compress():
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

    # Parameters
    output_fmt = request.form.get('format', 'JPEG').upper()
    if output_fmt == 'JPG':
        output_fmt = 'JPEG'

    allow_resize = request.form.get('allow_resize', 'false').lower() == 'true'

    target_bytes = None
    target_kb = request.form.get('target_kb')
    target_mb = request.form.get('target_mb')
    if target_kb:
        target_bytes = int(float(target_kb) * 1024)
    elif target_mb:
        target_bytes = int(float(target_mb) * 1024 * 1024)

    # Optional max dimension resize before compression
    max_dim = request.form.get('max_dimension')
    if max_dim:
        try:
            max_dim = int(max_dim)
            if img.width > max_dim or img.height > max_dim:
                img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        except (TypeError, ValueError):
            pass

    # Get original size first
    orig_buf = io.BytesIO()
    fmt_save = output_fmt if output_fmt != 'JPEG' else 'JPEG'
    tmp_img = img.convert('RGB') if fmt_save == 'JPEG' else img
    if fmt_save == 'JPEG':
        tmp_img.save(orig_buf, format='JPEG', quality=95)
    elif fmt_save == 'WEBP':
        tmp_img.save(orig_buf, format='WEBP', quality=95)
    else:
        tmp_img.save(orig_buf, format='PNG', optimize=True)
    orig_size = orig_buf.tell()

    if target_bytes is None:
        # No target; use quality slider
        quality = int(request.form.get('quality', 85))
        quality = max(10, min(100, quality))
        buf = io.BytesIO()
        work = img.convert('RGB') if fmt_save == 'JPEG' else img
        if fmt_save == 'PNG':
            work.save(buf, format='PNG', optimize=True)
        else:
            work.save(buf, format=fmt_save, quality=quality, optimize=True)
        data = buf.getvalue()
        actual_size = len(data)
        quality_used = quality
    else:
        data, actual_size, quality_used = compress_to_target(
            img, target_bytes, fmt=output_fmt, allow_resize=allow_resize
        )

    reduction_pct = round((1 - actual_size / max(orig_size, 1)) * 100, 1)

    buf_out = io.BytesIO(data)
    ext_map = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}

    response = make_response(send_file(
        buf_out,
        mimetype=mime_for_format(output_fmt),
        as_attachment=False,
        download_name=f"compressed.{ext_map.get(output_fmt, 'jpg')}",
    ))
    response.headers['X-Original-Size']   = str(orig_size)
    response.headers['X-Compressed-Size'] = str(actual_size)
    response.headers['X-Reduction-Pct']   = str(reduction_pct)
    response.headers['X-Quality-Used']    = str(quality_used)
    response.headers['Access-Control-Expose-Headers'] = (
        'X-Original-Size,X-Compressed-Size,X-Reduction-Pct,X-Quality-Used,X-Target-Warning'
    )
    if target_bytes and actual_size > target_bytes * 1.1:
        response.headers['X-Target-Warning'] = 'Target size could not be fully achieved.'
    return response
