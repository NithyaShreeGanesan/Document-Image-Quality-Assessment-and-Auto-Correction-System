# DocuQuality Backend App
import sys
from pathlib import Path

# Ensure the backend directory is in sys.path so 'app' can always be imported
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
