import math
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np

# Built-in Presets Definition
BUILTIN_PRESETS: Dict[str, Dict[str, Any]] = {
    "general": {
        "id": "general",
        "label": "General Document",
        "description": "Balanced default configuration suitable for standard letters, memos, and office documents.",
        "icon": "FileText",
        "weights": {
            "blur": 0.25,
            "skew": 0.15,
            "brightness": 0.15,
            "contrast": 0.15,
            "noise": 0.15,
            "resolution": 0.15,
        },
        "classification": {
            "pass_score": 75.0,
            "min_subscore_pass": 50.0,
            "fail_score": 45.0,
        },
        "corrections": {
            "deskew_enabled": True,
            "illumination_enabled": True,
            "denoise_enabled": True,
            "sharpen_enabled": True,
            "autocrop_enabled": True,
            "ocr_binarization": False,
        },
    },
    "invoice": {
        "id": "invoice",
        "label": "Invoice & Billing Statement",
        "description": "Optimized for structured tables, numbers, and letterhead alignment.",
        "icon": "Receipt",
        "weights": {
            "blur": 0.25,
            "skew": 0.20,
            "brightness": 0.15,
            "contrast": 0.15,
            "noise": 0.10,
            "resolution": 0.15,
        },
        "classification": {
            "pass_score": 75.0,
            "min_subscore_pass": 50.0,
            "fail_score": 45.0,
        },
        "corrections": {
            "deskew_enabled": True,
            "illumination_enabled": True,
            "denoise_enabled": True,
            "sharpen_enabled": True,
            "autocrop_enabled": False,
            "ocr_binarization": False,
        },
    },
    "receipt": {
        "id": "receipt",
        "label": "Receipt (Thermal / POS)",
        "description": "High contrast emphasis with aggressive binarization for thermal paper and crumpled slips.",
        "icon": "ShoppingBag",
        "weights": {
            "contrast": 0.30,
            "blur": 0.20,
            "brightness": 0.20,
            "skew": 0.15,
            "noise": 0.05,
            "resolution": 0.10,
        },
        "classification": {
            "pass_score": 70.0,
            "min_subscore_pass": 45.0,
            "fail_score": 40.0,
        },
        "corrections": {
            "deskew_enabled": True,
            "illumination_enabled": True,
            "denoise_enabled": False,
            "sharpen_enabled": True,
            "autocrop_enabled": True,
            "ocr_binarization": True,
        },
    },
    "id_card": {
        "id": "id_card",
        "label": "ID Card / Passport / License",
        "description": "Maximum resolution and microtext sharpness; preserves photo/hologram by avoiding binarization.",
        "icon": "CreditCard",
        "weights": {
            "resolution": 0.30,
            "blur": 0.30,
            "contrast": 0.15,
            "brightness": 0.10,
            "skew": 0.10,
            "noise": 0.05,
        },
        "classification": {
            "pass_score": 80.0,
            "min_subscore_pass": 55.0,
            "fail_score": 50.0,
        },
        "corrections": {
            "deskew_enabled": True,
            "illumination_enabled": True,
            "denoise_enabled": True,
            "sharpen_enabled": True,
            "autocrop_enabled": True,
            "ocr_binarization": False,
        },
    },
    "book_page": {
        "id": "book_page",
        "label": "Book Page / Bound Volume",
        "description": "Higher skew & gutter illumination tolerance; perspective crop removes binding margins.",
        "icon": "BookOpen",
        "weights": {
            "skew": 0.25,
            "brightness": 0.25,
            "blur": 0.20,
            "contrast": 0.15,
            "noise": 0.05,
            "resolution": 0.10,
        },
        "classification": {
            "pass_score": 72.0,
            "min_subscore_pass": 45.0,
            "fail_score": 42.0,
        },
        "corrections": {
            "deskew_enabled": True,
            "illumination_enabled": True,
            "denoise_enabled": False,
            "sharpen_enabled": True,
            "autocrop_enabled": True,
            "ocr_binarization": False,
        },
    },
    "handwritten_note": {
        "id": "handwritten_note",
        "label": "Handwritten Note / Form",
        "description": "Tuned for organic ink lines; prevents over-deskewing or over-sharpening natural penmanship.",
        "icon": "PenTool",
        "weights": {
            "contrast": 0.30,
            "brightness": 0.20,
            "blur": 0.15,
            "noise": 0.15,
            "resolution": 0.10,
            "skew": 0.10,
        },
        "classification": {
            "pass_score": 68.0,
            "min_subscore_pass": 45.0,
            "fail_score": 40.0,
        },
        "corrections": {
            "deskew_enabled": False,
            "illumination_enabled": True,
            "denoise_enabled": True,
            "sharpen_enabled": True,
            "autocrop_enabled": False,
            "ocr_binarization": False,
        },
    },
}


def detect_document_preset(image: np.ndarray) -> str:
    """
    Heuristic classifier to automatically identify document preset based on:
    - Aspect ratio (height vs width)
    - Color saturation & photo region detection
    - Text stroke regularity and density
    """
    h, w = image.shape[:2]
    aspect_ratio = float(w) / float(max(1, h))

    # 1. Receipt detection: extremely tall and narrow (e.g. height > 2.2 * width)
    if aspect_ratio < 0.46 or (h > 1000 and aspect_ratio < 0.55):
        return "receipt"

    # 2. ID Card detection:
    # Standard ISO/IEC 7810 ID-1 card is 85.60 × 53.98 mm (aspect ~ 1.586 landscape or 0.63 portrait)
    # Cards typically have a saturated color portrait/photo region
    is_landscape_card = 1.45 <= aspect_ratio <= 1.75
    is_portrait_card = 0.55 <= aspect_ratio <= 0.70

    if len(image.shape) == 3 and (is_landscape_card or is_portrait_card):
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        # Check if there is a localized high-color patch (photo ID, state emblem)
        high_sat_ratio = float(np.sum(sat > 70)) / float(max(1, h * w))
        if 0.05 <= high_sat_ratio <= 0.45:
            return "id_card"

    # 3. Book Page vs Invoice vs Handwritten Note:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    # Detect edges
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80, minLineLength=int(w * 0.2), maxLineGap=10)

    # Invoices almost always have multiple horizontal table gridlines / rules
    if lines is not None and len(lines) >= 8:
        horizontal_rules = 0
        for line in lines:
            pts = np.asarray(line).reshape(-1)
            if len(pts) >= 4:
                dx = abs(pts[2] - pts[0])
                dy = abs(pts[3] - pts[1])
                if dx > dy * 3:
                    horizontal_rules += 1
        if horizontal_rules >= 5:
            return "invoice"

    # 4. Book Page: check gutter shadow gradient (strong illumination drop-off on left or right edge)
    left_strip_mean = float(np.mean(gray[:, : int(w * 0.12)]))
    center_mean = float(np.mean(gray[:, int(w * 0.35) : int(w * 0.65)]))
    right_strip_mean = float(np.mean(gray[:, int(w * 0.88) :]))

    gutter_contrast = center_mean - min(left_strip_mean, right_strip_mean)
    if gutter_contrast > 40.0 and 1.15 <= (max(h, w) / max(1, min(h, w))) <= 1.6:
        return "book_page"

    # Default fallback
    return "general"


def apply_preset_to_config(preset_name: str, base_config: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    Resolves preset configuration. If 'auto', detects automatically from sample or falls back.
    Merges preset weights, classification thresholds, and correction toggles.
    """
    key = (preset_name or "general").lower().strip()
    preset = BUILTIN_PRESETS.get(key, BUILTIN_PRESETS["general"])

    merged = {**base_config}
    if "weights" in preset:
        merged["weights"] = {**merged.get("weights", {}), **preset["weights"]}
    if "classification" in preset:
        merged["classification"] = {**merged.get("classification", {}), **preset["classification"]}
    if "corrections" in preset:
        merged["corrections"] = {**merged.get("corrections", {}), **preset["corrections"]}

    return key, merged
