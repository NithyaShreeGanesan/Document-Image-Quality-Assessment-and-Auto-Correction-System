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


def assess_document_image(image: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main Quality Assessment function.
    Evaluates 6 metrics, normalizes to 0-100, computes weighted overall score,
    and returns defect breakdown and classification (Pass, Needs Correction, Fail).
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

    defects = [blur_res, skew_res, brightness_res, contrast_res, noise_res, resolution_res]

    weights = config.get("weights", {
        "blur": 0.25,
        "skew": 0.15,
        "brightness": 0.15,
        "contrast": 0.15,
        "noise": 0.15,
        "resolution": 0.15,
    })

    total_weight = sum(weights.values()) or 1.0
    weighted_sum = (
        blur_res["sub_score"] * weights.get("blur", 0.25)
        + skew_res["sub_score"] * weights.get("skew", 0.15)
        + brightness_res["sub_score"] * weights.get("brightness", 0.15)
        + contrast_res["sub_score"] * weights.get("contrast", 0.15)
        + noise_res["sub_score"] * weights.get("noise", 0.15)
        + resolution_res["sub_score"] * weights.get("resolution", 0.15)
    )

    overall_score = round(weighted_sum / total_weight, 1)

    cls_cfg = config.get("classification", {})
    pass_thresh = cls_cfg.get("pass_score", 75.0)
    min_subscore_pass = cls_cfg.get("min_subscore_pass", 50.0)
    fail_thresh = cls_cfg.get("fail_score", 45.0)

    any_crit = any(d["sub_score"] < min_subscore_pass for d in defects)

    if overall_score >= pass_thresh and not any_crit:
        classification = "Pass"
    elif overall_score >= fail_thresh or any_crit:
        # If overall score is too low or severely degraded, check if below fail_thresh
        if overall_score < fail_thresh:
            classification = "Fail"
        else:
            classification = "Needs Correction"
    else:
        classification = "Fail"

    return {
        "overall_score": overall_score,
        "classification": classification,
        "blur": blur_res,
        "skew": skew_res,
        "brightness": brightness_res,
        "contrast": contrast_res,
        "noise": noise_res,
        "resolution": resolution_res,
        "defects": defects,
    }
