"""
AI Photo Enhancer — Flask Backend
"""
import os
import threading
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

from routes.enhance import enhance_bp
from routes.resize import resize_bp
from routes.compress import compress_bp
from routes.crop import crop_bp
from routes.filters import filters_bp
from routes.convert import convert_bp
from utils.file_utils import cleanup_old_temps
from services.ai_enhancer import AI_AVAILABLE

load_dotenv()

app = Flask(__name__)

# ── CORS ────────────────────────────────────────────────────────────────────
frontend_origin = os.getenv('FRONTEND_ORIGIN', '*')
CORS(
    app,
    origins=[frontend_origin] if frontend_origin != '*' else '*',
    supports_credentials=False,
    expose_headers=[
        'X-AI-Available', 'X-Output-Width', 'X-Output-Height',
        'X-Original-Size', 'X-Compressed-Size', 'X-Reduction-Pct',
        'X-Quality-Used', 'X-Target-Warning',
        'X-Original-Format', 'X-Output-Format', 'X-Converted-Size',
        'X-Had-Transparency',
    ],
)

# ── Upload size limit ────────────────────────────────────────────────────────
max_mb = int(os.getenv('MAX_UPLOAD_MB', '20'))
app.config['MAX_CONTENT_LENGTH'] = max_mb * 1024 * 1024

# ── Blueprints ────────────────────────────────────────────────────────────────
app.register_blueprint(enhance_bp)
app.register_blueprint(resize_bp)
app.register_blueprint(compress_bp)
app.register_blueprint(crop_bp)
app.register_blueprint(filters_bp)
app.register_blueprint(convert_bp)


# ── Health check ─────────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'ai_enhancement': AI_AVAILABLE,
        'max_upload_mb': max_mb,
    })


# ── Error handlers ────────────────────────────────────────────────────────────
@app.errorhandler(413)
def too_large(_):
    return jsonify({'error': f'File too large. Maximum upload size is {max_mb} MB.'}), 413


@app.errorhandler(404)
def not_found(_):
    return jsonify({'error': 'Endpoint not found.'}), 404


@app.errorhandler(500)
def server_error(exc):
    return jsonify({'error': 'Internal server error.', 'detail': str(exc)}), 500


# ── Background temp-file cleanup ──────────────────────────────────────────────
def _cleanup_loop():
    import time
    while True:
        cleanup_old_temps(max_age_seconds=300)
        time.sleep(60)


_cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
_cleanup_thread.start()


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
