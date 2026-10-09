"""Utility functions for safe file handling and validation."""
import os
import uuid
import tempfile
import time
import threading
from pathlib import Path

# Allowed MIME types and extensions
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_DIMENSION = 8000  # pixels
MAX_UPLOAD_BYTES = int(os.getenv('MAX_UPLOAD_MB', '20')) * 1024 * 1024

# Track temp files for cleanup
_temp_files: list[tuple[str, float]] = []
_lock = threading.Lock()


def get_temp_dir() -> str:
    td = os.getenv('TEMP_DIR', tempfile.gettempdir())
    os.makedirs(td, exist_ok=True)
    return td


def safe_temp_path(suffix: str = '.png') -> str:
    """Return a unique temp file path and register it for cleanup."""
    path = os.path.join(get_temp_dir(), f"{uuid.uuid4().hex}{suffix}")
    with _lock:
        _temp_files.append((path, time.time()))
    return path


def register_temp(path: str):
    """Register an existing path for timed cleanup."""
    with _lock:
        _temp_files.append((path, time.time()))


def cleanup_old_temps(max_age_seconds: int = 300):
    """Delete temp files older than max_age_seconds."""
    now = time.time()
    with _lock:
        remaining = []
        for path, ts in _temp_files:
            if now - ts > max_age_seconds:
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except OSError:
                    pass
            else:
                remaining.append((path, ts))
        _temp_files[:] = remaining


def delete_temp(path: str):
    """Immediately delete a temp file."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass


def validate_extension(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def extension_for_format(fmt: str) -> str:
    mapping = {
        'JPEG': '.jpg',
        'JPG': '.jpg',
        'PNG': '.png',
        'WEBP': '.webp',
    }
    return mapping.get(fmt.upper(), '.png')


def mime_for_format(fmt: str) -> str:
    mapping = {
        'JPEG': 'image/jpeg',
        'JPG': 'image/jpeg',
        'PNG': 'image/png',
        'WEBP': 'image/webp',
    }
    return mapping.get(fmt.upper(), 'image/png')
