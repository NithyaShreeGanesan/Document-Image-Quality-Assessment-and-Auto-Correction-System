import os
import shutil
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np

try:
    import pytesseract
    _pytesseract_imported = True
except ImportError:
    _pytesseract_imported = False

# Environment flag & optional custom tesseract binary path
ENABLE_OCR = os.getenv("ENABLE_OCR", os.getenv("ENABLE_OCR_TESSERACT", "true")).lower() in ("true", "1", "yes")
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "").strip()

# Common Windows install locations
DEFAULT_WINDOWS_TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
]


def get_tesseract_status() -> Tuple[bool, Optional[str], str]:
    """
    Checks if Tesseract binary is accessible and executable.
    Returns: (is_available, executable_path, message)
    """
    if not ENABLE_OCR:
        return False, None, "OCR feature disabled via ENABLE_OCR=false"

    if not _pytesseract_imported:
        return False, None, "pytesseract library not installed"

    # 1. Custom path from env
    if TESSERACT_CMD and os.path.exists(TESSERACT_CMD):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
        try:
            ver = pytesseract.get_tesseract_version()
            return True, TESSERACT_CMD, f"Tesseract v{ver} available"
        except Exception as e:
            return False, None, f"Tesseract configured at {TESSERACT_CMD} failed: {e}"

    # 2. Check system PATH
    path_cmd = shutil.which("tesseract")
    if path_cmd:
        try:
            pytesseract.pytesseract.tesseract_cmd = path_cmd
            ver = pytesseract.get_tesseract_version()
            return True, path_cmd, f"Tesseract v{ver} available"
        except Exception:
            pass

    # 3. Check common Windows paths
    for candidate in DEFAULT_WINDOWS_TESSERACT_PATHS:
        if os.path.exists(candidate):
            try:
                pytesseract.pytesseract.tesseract_cmd = candidate
                ver = pytesseract.get_tesseract_version()
                return True, candidate, f"Tesseract v{ver} available"
            except Exception:
                pass

    return (
        False,
        None,
        "Tesseract OCR binary not detected. Set TESSERACT_CMD in .env or install Tesseract (see README). Showing CV readability metrics.",
    )


def estimate_cv_readability(image: np.ndarray) -> Dict[str, Any]:
    """
    Heuristic computer-vision OCR readability estimator when Tesseract binary is not installed:
    - Stroke sharpness at text edges
    - Contrast dynamic range
    - Character connected component uniformity & estimated word count
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    h, w = gray.shape[:2]

    # Gradient stroke sharpness on text edge pixels (98.5th percentile)
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(gx**2 + gy**2)
    stroke_sharpness = float(np.percentile(grad_mag, 98.5))
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Contrast
    p5 = float(np.percentile(gray, 5))
    p95 = float(np.percentile(gray, 95))
    contrast_span = p95 - p5

    # Adaptive binarization character regularity
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)

    words_estimated = 0
    char_heights = []

    for i in range(1, min(num_labels, 1000)):
        ch_w = stats[i, cv2.CC_STAT_WIDTH]
        ch_h = stats[i, cv2.CC_STAT_HEIGHT]
        area = stats[i, cv2.CC_STAT_AREA]
        if 8 <= ch_h <= 100 and 4 <= ch_w <= 80 and area > 15:
            char_heights.append(ch_h)
            words_estimated += 1

    # Approximate words from character count (~5 chars per word)
    approx_words = max(0, words_estimated // 5)

    char_regularity = 50.0
    if len(char_heights) > 10:
        std_h = float(np.std(char_heights))
        mean_h = float(np.mean(char_heights))
        cv_ratio = std_h / max(1.0, mean_h)
        char_regularity = max(10.0, min(100.0, 100.0 - cv_ratio * 70.0))

    # Normalized score: sharpness + contrast + regularity
    sharpness_score = min(100.0, (stroke_sharpness / 160.0) * 100.0)
    contrast_score = min(100.0, (contrast_span / 180.0) * 100.0)
    score = (
        sharpness_score * 0.45
        + contrast_score * 0.35
        + char_regularity * 0.20
    )
    confidence = round(float(np.clip(score, 15.0, 98.0)), 1)

    # Generate readable lines simulation based on image content
    lines = []
    if approx_words > 0:
        lines.append("[CV Readability Analysis - Text Lines Detected]")
        lines.append(f"Estimated Words: {approx_words} | Stroke Sharpness: {stroke_sharpness:.1f} | Dynamic Range: {contrast_span:.0f}")
        lines.append(f"Character Uniformity Index: {char_regularity:.1f}%")
        lines.append("Note: Install Tesseract binary (see README) to view full word-by-word transcription.")
    else:
        lines.append("[Low or no text detected in document image]")

    return {
        "confidence": confidence,
        "word_count": approx_words,
        "text": "\n".join(lines),
        "engine": "CV Readability Estimator",
        "message": "Tesseract binary not installed. Estimated using computer-vision text metrics (never crashes).",
    }


def evaluate_ocr(image: np.ndarray) -> Dict[str, Any]:
    """
    Runs OCR on document image.
    Uses real Tesseract if available, otherwise falls back gracefully to CV readability estimation.
    Returns:
        {
            "confidence": float,  # mean word confidence (0-100)
            "word_count": int,    # word count
            "text": str,          # extracted text
            "engine": str,        # "Tesseract OCR" or "CV Readability Estimator"
            "message": str | None
        }
    """
    is_available, cmd_path, msg = get_tesseract_status()

    if is_available and _pytesseract_imported:
        try:
            # Word-level confidence extraction
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            confs: List[float] = []
            words: List[str] = []

            for i in range(len(data["text"])):
                w_text = data["text"][i].strip()
                w_conf = float(data["conf"][i])
                if w_text and w_conf > 0:
                    words.append(w_text)
                    confs.append(w_conf)

            mean_conf = round(float(np.mean(confs)), 1) if confs else 0.0
            word_count = len(words)
            text = pytesseract.image_to_string(image).strip()

            return {
                "confidence": mean_conf,
                "word_count": word_count,
                "text": text,
                "engine": "Tesseract OCR",
                "message": None,
            }
        except Exception as e:
            print(f"Pytesseract runtime exception: {e}. Falling back gracefully.")

    # Graceful fallback: Never crash
    fallback = estimate_cv_readability(image)
    fallback["message"] = msg
    return fallback
