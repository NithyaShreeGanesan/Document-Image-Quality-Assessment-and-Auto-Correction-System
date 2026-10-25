import math
from typing import Any, Dict, List, Tuple
import cv2
import numpy as np


def compute_blur_metric(gray: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes blur via Variance of Laplacian and Tenengrad (Sobel gradient magnitude).
    Low variance indicates blurriness.
    """
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    tenengrad = float(np.mean(gx**2 + gy**2))

    thresh = config.get("thresholds", {}).get("blur", {})
    lap_good = thresh.get("laplacian_good", 120.0)
    lap_crit = thresh.get("laplacian_critical", 40.0)

    # Sigmoidal / piece-wise normalization (0-100)
    if laplacian_var >= lap_good:
        sub_score = min(100.0, 90.0 + 10.0 * min(1.0, (laplacian_var - lap_good) / 200.0))
        status = "good"
        explanation = f"Sharp and clear text (Laplacian var {laplacian_var:.1f})"
    elif laplacian_var >= lap_crit:
        ratio = (laplacian_var - lap_crit) / (lap_good - lap_crit)
        sub_score = 50.0 + ratio * 39.0
        status = "warning"
        explanation = f"Mild blur or softness detected (Laplacian var {laplacian_var:.1f})"
    else:
        sub_score = max(5.0, (laplacian_var / max(1.0, lap_crit)) * 48.0)
        status = "critical"
        explanation = f"Severe blur detected - text edges are indistinct (Laplacian var {laplacian_var:.1f})"

    return {
        "metric": "blur",
        "label": "Sharpness / Blur",
        "raw_value": round(laplacian_var, 1),
        "tenengrad": round(tenengrad, 1),
        "unit": "var",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_skew_metric(gray: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Estimates skew angle in degrees using Hough line transform and text-pixel mask.
    Angles are reported between -45 and +45 degrees.
    """
    h, w = gray.shape[:2]

    # Threshold to find text regions
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Detect lines using HoughLinesP
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80, minLineLength=max(30, int(w * 0.15)), maxLineGap=15)

    angles: List[float] = []
    if lines is not None and len(lines) > 0:
        for line in lines:
            pts = np.asarray(line).reshape(-1)
            if len(pts) < 4:
                continue
            x1, y1, x2, y2 = int(pts[0]), int(pts[1]), int(pts[2]), int(pts[3])
            dx = x2 - x1
            dy = y2 - y1
            if dx == 0:
                continue
            angle_rad = math.atan2(dy, dx)
            angle_deg = math.degrees(angle_rad)
            # Focus on near-horizontal text lines (-45 to 45 deg)
            if -45.0 <= angle_deg <= 45.0:
                angles.append(angle_deg)

    if len(angles) >= 3:
        estimated_angle = float(np.median(angles))
    else:
        # Fallback to minAreaRect on non-zero text pixels
        coords = np.column_stack(np.where(binary > 0))
        if len(coords) > 100:
            # Subsample for speed if very large
            if len(coords) > 10000:
                indices = np.random.choice(len(coords), 10000, replace=False)
                coords = coords[indices]
            rect = cv2.minAreaRect(coords)
            angle = rect[-1]
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            estimated_angle = float(angle)
        else:
            estimated_angle = 0.0

    # Clean up minor noise
    if abs(estimated_angle) < 0.3:
        estimated_angle = 0.0

    abs_angle = abs(estimated_angle)
    thresh = config.get("thresholds", {}).get("skew", {})
    good_ang = thresh.get("angle_good", 1.0)
    crit_ang = thresh.get("angle_critical", 5.0)

    if abs_angle <= good_ang:
        sub_score = 100.0 - (abs_angle / good_ang) * 10.0
        status = "good"
        direction = "clockwise" if estimated_angle > 0 else "counter-clockwise"
        explanation = "Properly aligned document" if abs_angle == 0 else f"Near perfect alignment ({abs_angle:.1f}° tilt)"
    elif abs_angle <= crit_ang:
        ratio = (abs_angle - good_ang) / (crit_ang - good_ang)
        sub_score = 89.0 - ratio * 39.0
        status = "warning"
        direction = "clockwise" if estimated_angle > 0 else "counter-clockwise"
        explanation = f"Noticeable tilt: {abs_angle:.1f}° {direction}"
    else:
        sub_score = max(5.0, 48.0 - min(40.0, (abs_angle - crit_ang) * 4.0))
        status = "critical"
        direction = "clockwise" if estimated_angle > 0 else "counter-clockwise"
        explanation = f"Severe skew: document tilted {abs_angle:.1f}° {direction}"

    return {
        "metric": "skew",
        "label": "Orientation & Skew",
        "raw_value": round(estimated_angle, 2),
        "abs_angle": round(abs_angle, 2),
        "unit": "deg",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_brightness_metric(gray: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes average brightness and uneven illumination / shadow variance.
    Ideal range is 120-180. Penalizes < 85 (dark) and > 215 (washed out).
    """
    mean_val = float(np.mean(gray))
    h, w = gray.shape[:2]

    # Block-wise illumination uniformity (4x4 grid)
    grid_rows, grid_cols = 4, 4
    block_h, block_w = h // grid_rows, w // grid_cols
    block_means = []

    if block_h > 4 and block_w > 4:
        for r in range(grid_rows):
            for c in range(grid_cols):
                patch = gray[r * block_h : (r + 1) * block_h, c * block_w : (c + 1) * block_w]
                block_means.append(float(np.mean(patch)))
        block_std = float(np.std(block_means))
        block_range = float(np.max(block_means) - np.min(block_means))
    else:
        block_std = 0.0
        block_range = 0.0

    thresh = config.get("thresholds", {}).get("brightness", {})
    min_mean = thresh.get("min_mean", 80.0)
    max_mean = thresh.get("max_mean", 248.0)
    shadow_limit = thresh.get("shadow_block_diff_limit", 35.0)

    # Documents naturally have white paper background (mean ~ 180-245)
    if min_mean <= mean_val <= max_mean:
        dist_from_sweet_spot = abs(mean_val - 215.0) / 135.0
        exposure_score = 100.0 - (dist_from_sweet_spot * 15.0)
    elif mean_val < min_mean:
        exposure_score = max(10.0, (mean_val / max(1.0, min_mean)) * 60.0)
    else:
        # Over 248 is blown out pure white
        exposure_score = max(10.0, ((255.0 - mean_val) / 7.0) * 60.0)

    # Shadow / unevenness penalty
    shadow_penalty = 0.0
    if block_range > shadow_limit:
        shadow_penalty = min(55.0, (block_range - shadow_limit) * 0.8)

    sub_score = max(5.0, min(100.0, exposure_score - shadow_penalty))

    if sub_score >= 80.0:
        status = "good"
        explanation = f"Even lighting and balanced exposure (Mean {mean_val:.1f}/255)"
    elif sub_score >= 50.0:
        status = "warning"
        if block_range > shadow_limit:
            explanation = f"Uneven illumination or shadows present across page (Spread {block_range:.1f})"
        elif mean_val < min_mean:
            explanation = f"Slightly underexposed / dark document (Mean {mean_val:.1f}/255)"
        else:
            explanation = f"Slightly overexposed / washed out (Mean {mean_val:.1f}/255)"
    else:
        status = "critical"
        if mean_val < min_mean:
            explanation = f"Severely underexposed / very dark (Mean {mean_val:.1f}/255)"
        elif mean_val > max_mean:
            explanation = f"Severely washed out / overexposed (Mean {mean_val:.1f}/255)"
        else:
            explanation = f"Severe lighting gradient or heavy shadows blocking text (Spread {block_range:.1f})"

    return {
        "metric": "brightness",
        "label": "Brightness & Lighting",
        "raw_value": round(mean_val, 1),
        "block_variance": round(block_std, 1),
        "block_spread": round(block_range, 1),
        "unit": "val",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_contrast_metric(gray: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes contrast via intensity standard deviation and 5th-95th percentile dynamic range.
    """
    std_val = float(np.std(gray))
    p5 = float(np.percentile(gray, 5))
    p95 = float(np.percentile(gray, 95))
    dyn_range = p95 - p5

    thresh = config.get("thresholds", {}).get("contrast", {})
    std_good = thresh.get("std_good", 45.0)
    std_crit = thresh.get("std_critical", 20.0)

    if std_val >= std_good and dyn_range >= 130.0:
        sub_score = min(100.0, 85.0 + 15.0 * min(1.0, (std_val - std_good) / 30.0))
        status = "good"
        explanation = f"High contrast with crisp text separation (Std {std_val:.1f}, Range {dyn_range:.0f})"
    elif std_val >= std_crit and dyn_range >= 70.0:
        ratio = (std_val - std_crit) / (std_good - std_crit)
        sub_score = 50.0 + ratio * 34.0
        status = "warning"
        explanation = f"Moderate contrast; faint or washed-out ink (Std {std_val:.1f}, Range {dyn_range:.0f})"
    else:
        sub_score = max(5.0, (std_val / max(1.0, std_crit)) * 48.0)
        status = "critical"
        explanation = f"Low contrast; text blends into background (Std {std_val:.1f}, Range {dyn_range:.0f})"

    return {
        "metric": "contrast",
        "label": "Dynamic Range & Contrast",
        "raw_value": round(std_val, 1),
        "dynamic_range": round(dyn_range, 1),
        "unit": "std",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_noise_metric(gray: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Estimates noise sigma via Immerkaer fast noise variance estimation
    along with median filter residual.
    """
    h, w = gray.shape[:2]

    # Immerkaer kernel
    kernel = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], dtype=np.float64)

    if h > 10 and w > 10:
        filtered = cv2.filter2D(gray.astype(np.float64), -1, kernel)
        immerkaer_sigma = float(np.sum(np.abs(filtered)) * np.sqrt(0.5 * np.pi) / (6.0 * (w - 2) * (h - 2)))
    else:
        immerkaer_sigma = 0.0

    # Also compute median filter difference
    med = cv2.medianBlur(gray, 3)
    diff = np.abs(gray.astype(np.float64) - med.astype(np.float64))
    median_sigma = float(np.mean(diff))

    # Blended noise estimate
    noise_sigma = 0.6 * immerkaer_sigma + 0.4 * median_sigma

    thresh = config.get("thresholds", {}).get("noise", {})
    sigma_good = thresh.get("sigma_good", 5.0)
    sigma_crit = thresh.get("sigma_critical", 18.0)

    if noise_sigma <= sigma_good:
        sub_score = 100.0 - (noise_sigma / sigma_good) * 10.0
        status = "good"
        explanation = f"Clean image with negligible noise (Sigma {noise_sigma:.2f})"
    elif noise_sigma <= sigma_crit:
        ratio = (noise_sigma - sigma_good) / (sigma_crit - sigma_good)
        sub_score = 89.0 - ratio * 39.0
        status = "warning"
        explanation = f"Moderate sensor grain or compression artifacts (Sigma {noise_sigma:.2f})"
    else:
        sub_score = max(5.0, 49.0 - min(44.0, (noise_sigma - sigma_crit) * 3.0))
        status = "critical"
        explanation = f"Heavy salt-and-pepper noise or sensor artifacts (Sigma {noise_sigma:.2f})"

    return {
        "metric": "noise",
        "label": "Noise & Grain",
        "raw_value": round(noise_sigma, 2),
        "unit": "sigma",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_resolution_metric(image: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes resolution subscore based on dimensions and estimated DPI (A4 standard width: 8.27 in).
    Ideal is >= 300 DPI. < 150 DPI is low.
    """
    h, w = image.shape[:2]
    min_dim = min(h, w)

    assumed_width_inches = config.get("thresholds", {}).get("resolution", {}).get("assumed_width_inches", 8.27)
    estimated_dpi = float(min_dim / assumed_width_inches)

    thresh = config.get("thresholds", {}).get("resolution", {})
    min_dpi = thresh.get("min_dpi", 150.0)
    ideal_dpi = thresh.get("ideal_dpi", 300.0)

    if estimated_dpi >= ideal_dpi:
        sub_score = min(100.0, 90.0 + 10.0 * min(1.0, (estimated_dpi - ideal_dpi) / 300.0))
        status = "good"
        explanation = f"High resolution OCR-ready ({w}x{h} px, ~{int(estimated_dpi)} DPI)"
    elif estimated_dpi >= min_dpi:
        ratio = (estimated_dpi - min_dpi) / (ideal_dpi - min_dpi)
        sub_score = 50.0 + ratio * 39.0
        status = "warning"
        explanation = f"Acceptable resolution but below optimal 300 DPI (~{int(estimated_dpi)} DPI)"
    else:
        sub_score = max(10.0, (estimated_dpi / min_dpi) * 48.0)
        status = "critical"
        explanation = f"Low resolution: text character glyphs may lack detail (~{int(estimated_dpi)} DPI)"

    return {
        "metric": "resolution",
        "label": "Resolution & DPI",
        "raw_value": round(estimated_dpi, 1),
        "width": w,
        "height": h,
        "unit": "DPI",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_glare_metric(image: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detects specular glare / lighting hotspots caused by camera flash or bright point lights.
    Identifies high-intensity saturated regions (> 248) with low local gradient variance.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    h, w = gray.shape[:2]
    total_pixels = max(1, h * w)

    # Hotspot mask: bright pixels >= 248
    hot_mask = (gray >= 248).astype(np.uint8)

    # Local texture/gradient check: glare has smooth/clipped variance
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = np.sqrt(gx**2 + gy**2)
    # Glare regions have low gradient magnitude (saturated flat white)
    glare_candidates = np.logical_and(hot_mask == 1, grad_mag < 15.0).astype(np.uint8) * 255

    # Filter out tiny noise dots with morphological opening
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    glare_clean = cv2.morphologyEx(glare_candidates, cv2.MORPH_OPEN, kernel)

    # Connected components to find significant hotspot blobs
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(glare_clean)
    min_blob_area = max(25, int(total_pixels * 0.0005))  # at least 0.05% of page
    glare_pixel_count = 0

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_blob_area:
            glare_pixel_count += area

    glare_pct = (glare_pixel_count / total_pixels) * 100.0

    if glare_pct < 0.2:
        sub_score = 100.0 - (glare_pct * 25.0)
        status = "good"
        explanation = "No specular glare or lighting hotspots detected"
    elif glare_pct < 1.5:
        sub_score = 85.0 - ((glare_pct - 0.2) / 1.3) * 35.0
        status = "warning"
        explanation = f"Moderate glare hotspot detected ({glare_pct:.1f}% area) - possible flash reflection"
    else:
        sub_score = max(5.0, 50.0 - min(45.0, (glare_pct - 1.5) * 10.0))
        status = "critical"
        explanation = f"Severe glare reflection ({glare_pct:.1f}% area) obscuring document text"

    return {
        "metric": "glare",
        "label": "Glare & Hotspots",
        "raw_value": round(glare_pct, 2),
        "unit": "%",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_cutoff_metric(gray: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detects page-edge cut-off: checks if text or document boundaries touch within 5px of the image edge.
    """
    h, w = gray.shape[:2]
    # Invert binary Otsu: text/strokes become foreground 255
    _, binary_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    border_thickness = min(5, max(1, min(h, w) // 10))
    touching_edges: List[str] = []

    # Check top, bottom, left, right border bands
    top_strip = binary_inv[0:border_thickness, :]
    bottom_strip = binary_inv[-border_thickness:, :]
    left_strip = binary_inv[:, 0:border_thickness]
    right_strip = binary_inv[:, -border_thickness:]

    # Density threshold in border band (e.g. text or line cutting through border)
    threshold_density = 0.025

    if (np.sum(top_strip > 0) / top_strip.size) > threshold_density:
        touching_edges.append("top")
    if (np.sum(bottom_strip > 0) / bottom_strip.size) > threshold_density:
        touching_edges.append("bottom")
    if (np.sum(left_strip > 0) / left_strip.size) > threshold_density:
        touching_edges.append("left")
    if (np.sum(right_strip > 0) / right_strip.size) > threshold_density:
        touching_edges.append("right")

    num_cut = len(touching_edges)
    if num_cut == 0:
        sub_score = 100.0
        status = "good"
        explanation = "Document margins intact with no page-edge cut-off"
    elif num_cut == 1:
        sub_score = 68.0
        status = "warning"
        explanation = f"Potential content cut-off touching {touching_edges[0]} edge"
    else:
        sub_score = max(10.0, 45.0 - (num_cut - 2) * 15.0)
        status = "critical"
        explanation = f"Severe page-edge cut-off touching {', '.join(touching_edges)} edges"

    return {
        "metric": "cutoff",
        "label": "Page-Edge Framing",
        "raw_value": float(num_cut),
        "unit": "edges",
        "touching_edges": touching_edges,
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def compute_orientation_metric(image: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detects 0, 90, 180, or 270 degree rotation.
    Uses Tesseract OSD if available, with robust CV projection profile ratio fallback.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    h, w = gray.shape[:2]

    detected_rotation = 0
    method = "contour_aspect"

    # Try Tesseract OSD if tesseract is enabled and working
    try:
        from app.services.ocr_service import get_tesseract_status
        import pytesseract

        status = get_tesseract_status()
        if status.get("tesseract_available"):
            osd = pytesseract.image_to_osd(gray, output_type=pytesseract.Output.DICT)
            rot = int(osd.get("rotate", 0))
            conf = float(osd.get("orientation_conf", 0.0))
            if conf >= 2.0 and rot in (0, 90, 180, 270):
                detected_rotation = rot
                confidence = round(conf, 1)
                method = "tesseract_osd"
    except Exception:
        pass

    if method == "contour_aspect":
        # Morphological word/line contour aspect ratio
        _, bin_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
        dilated = cv2.dilate(bin_inv, kernel, iterations=1)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        horizontal_count = 0
        vertical_count = 0
        for c in contours:
            x, y, cw, ch = cv2.boundingRect(c)
            if cw > 18 and ch > 5:
                if cw > ch * 1.3:
                    horizontal_count += 1
                elif ch > cw * 1.3:
                    vertical_count += 1

        if vertical_count > horizontal_count * 1.5 and vertical_count >= 2:
            detected_rotation = 90
            confidence = round(vertical_count / max(1, horizontal_count), 2)
        else:
            detected_rotation = 0
            confidence = round(horizontal_count / max(1, vertical_count), 2)

    if detected_rotation == 0:
        sub_score = 100.0
        status = "good"
        explanation = "Document is right-side up (0° orientation)"
    else:
        sub_score = 25.0
        status = "critical"
        explanation = f"Wrong orientation: document is rotated {detected_rotation}°"

    return {
        "metric": "orientation",
        "label": "Document Orientation",
        "raw_value": float(detected_rotation),
        "rotation": detected_rotation,
        "confidence": confidence,
        "unit": "deg",
        "sub_score": round(sub_score, 1),
        "status": status,
        "explanation": explanation,
    }


def generate_rescan_guidance(
    defects: List[Dict[str, Any]],
    overall_score: float = 100.0,
    classification: str = "Pass",
) -> List[Dict[str, Any]]:
    """
    Generates plain-language, actionable guidance tips to help users get a better capture/scan.
    """
    guidance: List[Dict[str, Any]] = []

    guidance_map = {
        "blur": {
            "title": "Blur & Soft Focus",
            "tip": "Hold camera steady; tap screen to focus; increase ambient light.",
        },
        "contrast": {
            "title": "Low Contrast & Faint Text",
            "tip": "Avoid colored backgrounds; ensure even lighting.",
        },
        "glare": {
            "title": "Glare & Flash Reflection",
            "tip": "Angle the phone away from direct light or turn off flash.",
        },
        "skew": {
            "title": "Document Tilt & Skew",
            "tip": "Align the document edges with the camera frame.",
        },
        "brightness": {
            "title": "Shadows & Uneven Lighting",
            "tip": "Position light source in front or to the side, not behind.",
        },
        "resolution": {
            "title": "Low Resolution / Far Distance",
            "tip": "Move camera closer to the document.",
        },
        "cutoff": {
            "title": "Page Margins Clipped",
            "tip": "Keep entire page inside frame with a 1-inch border around all edges.",
        },
        "orientation": {
            "title": "Wrong Orientation",
            "tip": "Rotate the document so text reads right-side up.",
        },
    }

    for d in defects:
        m = d.get("metric")
        status = d.get("status")
        if status in ("warning", "critical") and m in guidance_map:
            guidance.append({
                "defect": m,
                "label": d.get("label", m.capitalize()),
                "severity": status,
                "title": guidance_map[m]["title"],
                "tip": guidance_map[m]["tip"],
                "explanation": d.get("explanation", ""),
            })

    # Prioritize critical issues first
    guidance.sort(key=lambda x: 0 if x["severity"] == "critical" else 1)
    return guidance


def assess_document_image(image: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main Quality Assessment function.
    Evaluates comprehensive metrics, normalizes to 0-100, computes weighted overall score,
    and returns defect breakdown, rescan guidance, and classification (Pass, Needs Correction, Fail).
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    blur_res = compute_blur_metric(gray, config)
    skew_res = compute_skew_metric(gray, config)
    brightness_res = compute_brightness_metric(gray, config)
    contrast_res = compute_contrast_metric(gray, config)
    noise_res = compute_noise_metric(gray, config)
    resolution_res = compute_resolution_metric(image, config)
    glare_res = compute_glare_metric(image, config)
    cutoff_res = compute_cutoff_metric(gray, config)
    orientation_res = compute_orientation_metric(image, config)

    defects = [
        blur_res,
        skew_res,
        brightness_res,
        contrast_res,
        noise_res,
        resolution_res,
        glare_res,
        cutoff_res,
        orientation_res,
    ]

    weights = config.get("weights", {
        "blur": 0.25,
        "skew": 0.15,
        "brightness": 0.15,
        "contrast": 0.15,
        "noise": 0.15,
        "resolution": 0.15,
    })

    total_weight = 0.0
    weighted_sum = 0.0
    for d in defects:
        m = d["metric"]
        w = float(weights.get(m, 0.0))
        if w > 0:
            weighted_sum += d["sub_score"] * w
            total_weight += w

    if total_weight > 0:
        overall_score = round(weighted_sum / total_weight, 1)
    else:
        overall_score = 50.0

    cls_cfg = config.get("classification", {})
    pass_thresh = cls_cfg.get("pass_score", 75.0)
    min_subscore_pass = cls_cfg.get("min_subscore_pass", 50.0)
    fail_thresh = cls_cfg.get("fail_score", 45.0)

    any_crit = any(d["sub_score"] < min_subscore_pass for d in defects)

    if overall_score >= pass_thresh and not any_crit:
        classification = "Pass"
    elif overall_score >= fail_thresh or any_crit:
        if overall_score < fail_thresh:
            classification = "Fail"
        else:
            classification = "Needs Correction"
    else:
        classification = "Fail"

    guidance = generate_rescan_guidance(defects, overall_score, classification)
    rescan_recommended = (classification == "Fail") or any(g["severity"] == "critical" for g in guidance)

    return {
        "overall_score": overall_score,
        "classification": classification,
        "rescan_recommended": rescan_recommended,
        "rescan_guidance": guidance,
        "blur": blur_res,
        "skew": skew_res,
        "brightness": brightness_res,
        "contrast": contrast_res,
        "noise": noise_res,
        "resolution": resolution_res,
        "glare": glare_res,
        "cutoff": cutoff_res,
        "orientation": orientation_res,
        "defects": defects,
    }

