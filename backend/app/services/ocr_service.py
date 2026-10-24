import os
from typing import Optional, Tuple
import cv2
import numpy as np

ENABLE_OCR = os.getenv("ENABLE_OCR_TESSERACT", "false").lower() in ("true", "1", "yes")

_pytesseract_available = False
if ENABLE_OCR:
    try:
        import pytesseract
        _pytesseract_available = True
    except ImportError:
        _pytesseract_available = False


def estimate_ocr_readiness_score(image: np.ndarray) -> float:
    """
    Fast heuristic OCR-readiness score (0-100) computed from computer-vision metrics:
    - Text edge gradient sharpness
    - Stroke contrast vs local background
    - Binarization legibility (connected components aspect ratio & size regularity)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    h, w = gray.shape[:2]

    # Gradient sharpness at text strokes
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(gx**2 + gy**2)
    stroke_sharpness = float(np.percentile(grad_mag, 90))

    # Dynamic contrast
    p5 = float(np.percentile(gray, 5))
    p95 = float(np.percentile(gray, 95))
    contrast_span = p95 - p5

    # Adaptive binarization character regularity
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)

    # Filter component sizes typical for characters
    char_heights = []
    for i in range(1, min(num_labels, 500)):
        ch_w = stats[i, cv2.CC_STAT_WIDTH]
        ch_h = stats[i, cv2.CC_STAT_HEIGHT]
        area = stats[i, cv2.CC_STAT_AREA]
        if 8 <= ch_h <= 100 and 4 <= ch_w <= 80 and area > 15:
            char_heights.append(ch_h)

    char_regularity = 50.0
    if len(char_heights) > 10:
        std_h = float(np.std(char_heights))
        mean_h = float(np.mean(char_heights))
        cv_ratio = std_h / max(1.0, mean_h)
        char_regularity = max(10.0, min(100.0, 100.0 - cv_ratio * 70.0))

    # Combine metrics
    score = (
        min(100.0, stroke_sharpness * 0.9) * 0.40
        + min(100.0, (contrast_span / 180.0) * 100.0) * 0.35
        + char_regularity * 0.25
    )

    return round(float(np.clip(score, 10.0, 99.0)), 1)


def evaluate_ocr(image: np.ndarray) -> Tuple[float, Optional[str]]:
    """
    Returns (confidence_percentage, recognized_text_snippet).
    Uses pytesseract if enabled and available, else uses CV heuristic OCR readiness.
    """
    if _pytesseract_available:
        try:
            import pytesseract
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            confs = [float(c) for c in data["conf"] if float(c) > 0]
            avg_conf = float(np.mean(confs)) if confs else 0.0
            text = pytesseract.image_to_string(image)
            clean_text = text.strip()[:300] if text else None
            return round(avg_conf, 1), clean_text
        except Exception as e:
            print(f"Pytesseract error: {e}. Falling back to OCR readiness estimator.")

    # Computer-vision OCR readiness score
    score = estimate_ocr_readiness_score(image)
    return score, None
