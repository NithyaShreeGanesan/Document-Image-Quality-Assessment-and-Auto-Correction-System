import math
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from backend.app.services.assessment import assess_document_image


def auto_orient_document(image: np.ndarray, orientation_deg: int) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Auto-orients rotated documents (90, 180, 270 deg) to upright orientation.
    """
    if orientation_deg == 90:
        # Rotated 90 deg clockwise -> rotate 90 counter-clockwise to restore upright
        corrected = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
        applied = True
    elif orientation_deg == 180:
        # Upside down -> rotate 180
        corrected = cv2.rotate(image, cv2.ROTATE_180)
        applied = True
    elif orientation_deg == 270:
        # Rotated 270 deg clockwise -> rotate 90 clockwise to restore upright
        corrected = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        applied = True
    else:
        return image, {"applied": False, "reason": "Already upright"}

    return corrected, {
        "applied": applied,
        "orientation_deg": orientation_deg,
        "description": f"Auto-oriented document by rotating {360 - orientation_deg}° to upright orientation",
    }


def deskew_image(image: np.ndarray, angle: float) -> Tuple[np.ndarray, Dict[str, Any]]:

    """
    Rotates image by the detected skew angle with white border fill.
    Positive angle is rotated counter-clockwise to correct clockwise tilt.
    """
    if abs(angle) < 0.2:
        return image, {"applied": False, "reason": "Skew angle too small"}

    h, w = image.shape[:2]
    center = (w // 2, h // 2)

    # Rotation matrix (note: -angle because cv2.getRotationMatrix2D rotates counter-clockwise for positive angles)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)

    # Compute new bounding dimensions so corners are not clipped
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))

    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]

    # White border fill
    border_value = (255, 255, 255) if len(image.shape) == 3 else 255
    rotated = cv2.warpAffine(
        image,
        M,
        (new_w, new_h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=border_value,
    )

    return rotated, {
        "applied": True,
        "angle": round(angle, 2),
        "fill_color": "white",
        "description": f"Rotated image by {angle:+.2f}° to level document orientation",
    }


def correct_illumination(
    image: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: int = 8,
    mean_val: float = 128.0,
    block_spread: float = 0.0,
    glare_pct: float = 0.0,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Fixes lighting, shadows, glare, and contrast via CLAHE on L channel,
    Gaussian background division normalization for shadow removal, highlight compression, and gamma correction.
    """
    is_color = len(image.shape) == 3
    if is_color:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        target = l_channel
    else:
        target = image.copy()

    # Step A: Glare attenuation / specular highlight compression
    if glare_pct > 0.3:
        glare_mask = target >= 246
        if np.any(glare_mask):
            target = target.copy()
            target[glare_mask] = np.clip(232 + (target[glare_mask].astype(np.float32) - 246) * 0.45, 0, 255).astype(np.uint8)

    # Step B: Shadow removal / background division normalization if uneven
    if block_spread > 25.0:
        # Estimate background illumination with large Gaussian blur
        ksize = 51 if max(target.shape) > 500 else 25
        bg = cv2.GaussianBlur(target, (ksize, ksize), 0)
        # Avoid division by zero
        bg = np.maximum(bg, 1)
        # Normalized division
        normalized = (target.astype(np.float32) / bg.astype(np.float32)) * 240.0
        target = np.clip(normalized, 0, 255).astype(np.uint8)

    # Step C: CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
    target = clahe.apply(target)

    # Step D: Adaptive Gamma correction for under/over-exposure
    curr_mean = float(np.mean(target))
    gamma = 1.0
    if curr_mean < 110.0:
        gamma = max(0.55, curr_mean / 150.0)  # brighten dark images
    elif curr_mean > 210.0:
        gamma = min(1.45, curr_mean / 170.0)  # darken washed-out images

    if abs(gamma - 1.0) > 0.05:
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
        target = cv2.LUT(target, table)

    # Reassemble image
    if is_color:
        merged_lab = cv2.merge([target, a_channel, b_channel])
        corrected = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)
    else:
        corrected = target

    return corrected, {
        "applied": True,
        "clip_limit": clip_limit,
        "gamma": round(gamma, 2),
        "shadow_removal": block_spread > 25.0,
        "glare_attenuation": glare_pct > 0.3,
        "description": "Normalized illumination, attenuated glare highlights, cleared shadows, and tuned dynamic range with CLAHE",
    }



def denoise_document(image: np.ndarray, noise_sigma: float) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Applies Non-Local Means Denoising with filter strength scaled to noise sigma.
    """
    is_color = len(image.shape) == 3
    # Strength h scaled to sigma: minimum 4, max 16
    h_strength = max(3, min(16, int(noise_sigma * 0.8 + 2)))

    if is_color:
        denoised = cv2.fastNlMeansDenoisingColored(
            image,
            None,
            h=h_strength,
            hColor=h_strength,
            templateWindowSize=7,
            searchWindowSize=21,
        )
    else:
        denoised = cv2.fastNlMeansDenoising(
            image,
            None,
            h=h_strength,
            templateWindowSize=7,
            searchWindowSize=21,
        )

    return denoised, {
        "applied": True,
        "strength_h": h_strength,
        "noise_sigma": round(noise_sigma, 2),
        "description": f"Applied fast Non-Local Means denoising (strength h={h_strength})",
    }


def sharpen_document(image: np.ndarray, blur_var: float) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Applies Unsharp Masking with strength scaled to blur severity, preventing halos.
    """
    # Moderate alpha between 0.6 and 1.8
    if blur_var < 40.0:
        alpha = 1.6
        sigma = 1.8
    elif blur_var < 100.0:
        alpha = 1.2
        sigma = 1.5
    else:
        alpha = 0.7
        sigma = 1.2

    blurred = cv2.GaussianBlur(image, (0, 0), sigmaX=sigma, sigmaY=sigma)
    sharpened = cv2.addWeighted(image, 1.0 + alpha, blurred, -alpha, 0)

    return sharpened, {
        "applied": True,
        "alpha": alpha,
        "sigma": sigma,
        "description": f"Applied unsharp masking filter (strength={alpha:.1f}) to recover character edge sharpness",
    }


def order_points(pts: np.ndarray) -> np.ndarray:
    """Orders 4 coordinates: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def autocrop_document(image: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Detects document boundary contour and performs four-point perspective crop,
    discarding background clutter. Falls back to original if no strong contour found.
    """
    orig_h, orig_w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    # Blur and edge detection
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 200)

    # Dilate edges to close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edges, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    # Sort contours by area descending
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    doc_contour = None
    min_area = (orig_w * orig_h) * 0.35  # Must cover at least 35% of image

    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            doc_contour = approx
            break

    if doc_contour is None:
        return image, {"applied": False, "reason": "No dominant 4-corner document contour detected"}

    pts = doc_contour.reshape(4, 2)
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Width of the new image
    width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    max_w = max(int(width_a), int(width_b))

    # Height of the new image
    height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    max_h = max(int(height_a), int(height_b))

    if max_w < orig_w * 0.5 or max_h < orig_h * 0.5:
        return image, {"applied": False, "reason": "Contour too small to represent document"}

    dst = np.array([
        [0, 0],
        [max_w - 1, 0],
        [max_w - 1, max_h - 1],
        [0, max_h - 1],
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (max_w, max_h), flags=cv2.INTER_CUBIC)

    return warped, {
        "applied": True,
        "width": max_w,
        "height": max_h,
        "description": f"Perspective corrected and auto-cropped to document boundary ({max_w}x{max_h})",
    }


def binarize_document(image: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Applies adaptive binarization for OCR optimization, converting to high-contrast monochrome.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    # Clean with mild median blur
    clean_gray = cv2.medianBlur(gray, 3)
    binary = cv2.adaptiveThreshold(
        clean_gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        25,
        11,
    )
    # Convert back to 3-channel BGR for consistent downstream handling
    bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    return bgr, {
        "applied": True,
        "method": "Adaptive Gaussian Thresholding",
        "description": "Converted to high-contrast monochrome binarization for optimal OCR accuracy",
    }


def auto_correct_document(
    image: np.ndarray,
    assessment: Dict[str, Any],
    config: Dict[str, Any],
    custom_options: Optional[Dict[str, Any]] = None,
) -> Tuple[np.ndarray, List[Dict[str, Any]], Dict[str, Any]]:
    """
    Applies targeted corrections in prescribed sequence based on assessment defects
    or custom user settings:
    1. Deskew
    2. Illumination / exposure fix
    3. Denoise
    4. Sharpen
    5. Auto-crop
    6. Optional Binarization

    Returns:
        (corrected_image, applied_corrections_list, after_assessment)
    """
    opts = custom_options or {}
    defaults = config.get("corrections", {})

    # Toggles: user override takes precedence, else check defect status
    deskew_enabled = opts.get("deskew", defaults.get("deskew_enabled", True))
    illum_enabled = opts.get("illumination", defaults.get("illumination_enabled", True))
    denoise_enabled = opts.get("denoise", defaults.get("denoise_enabled", True))
    sharpen_enabled = opts.get("sharpen", defaults.get("sharpen_enabled", True))
    crop_enabled = opts.get("autocrop", defaults.get("autocrop_enabled", False))
    binarize_enabled = opts.get("binarize", defaults.get("ocr_binarization", False))

    curr_img = image.copy()
    applied_corrections: List[Dict[str, Any]] = []
    current_score = float(assessment.get("overall_score", 0.0))
    last_assessment = None

    # Helper to evaluate step score delta
    def _record_step(name: str, order: int, info: Dict[str, Any], defect: str, severity: str):
        nonlocal current_score, last_assessment
        step_assess = assess_document_image(curr_img, config)
        step_post = float(step_assess.get("overall_score", 0.0))
        delta = round(step_post - current_score, 1)
        applied_corrections.append({
            "step_name": name,
            "order": order,
            "params": info,
            "description": info.get("description", ""),
            "pre_score": round(current_score, 1),
            "post_score": round(step_post, 1),
            "delta": delta,
            "defect_addressed": defect,
            "defect_severity": severity,
        })
        current_score = step_post
        last_assessment = step_assess

    # 0. Auto-Orientation (rotate 90, 180, 270 deg before deskewing)
    orient_data = assessment.get("orientation", {})
    rot_deg = int(orient_data.get("rotation", 0))
    orient_enabled = opts.get("auto_orient", defaults.get("auto_orient_enabled", True))
    if orient_enabled and rot_deg in (90, 180, 270):
        curr_img, info = auto_orient_document(curr_img, rot_deg)
        if info.get("applied"):
            _record_step(
                "auto_orient",
                0,
                info,
                f"Page Inversion / {rot_deg}° Orientation",
                "critical",
            )
            # Re-estimate skew on upright image for fine-tuning
            from backend.app.services.assessment import compute_skew_metric
            gray_upright = cv2.cvtColor(curr_img, cv2.COLOR_BGR2GRAY) if len(curr_img.shape) == 3 else curr_img
            upright_skew = compute_skew_metric(gray_upright, config)
            skew_angle = float(upright_skew.get("raw_value", 0.0))
        else:
            skew_data = assessment.get("skew", {})
            skew_angle = float(skew_data.get("raw_value", 0.0))
    else:
        skew_data = assessment.get("skew", {})
        skew_angle = float(skew_data.get("raw_value", 0.0))

    # 1. Deskew
    skew_data = assessment.get("skew", {})
    skew_needed = deskew_enabled and (
        abs(skew_angle) >= 0.8 or opts.get("force_deskew", False) or skew_data.get("status") in ["warning", "critical"]
    )
    if skew_needed:
        curr_img, info = deskew_image(curr_img, skew_angle)
        if info.get("applied"):
            _record_step(
                "deskew",
                1,
                info,
                f"Skew Alignment ({skew_angle:+.2f}°)",
                skew_data.get("status", "warning"),
            )

    # 2. Illumination, glare, & exposure
    bright_data = assessment.get("brightness", {})
    contrast_data = assessment.get("contrast", {})
    glare_data = assessment.get("glare", {})
    glare_pct = float(glare_data.get("raw_value", 0.0))
    illum_needed = illum_enabled and (
        bright_data.get("status") in ["warning", "critical"]
        or contrast_data.get("status") in ["warning", "critical"]
        or bright_data.get("block_spread", 0.0) > 25.0
        or glare_pct >= 0.5
        or opts.get("force_illumination", False)
    )
    if illum_needed:
        clip = float(opts.get("clahe_clip_limit", defaults.get("clahe_clip_limit", 2.0)))
        curr_img, info = correct_illumination(
            curr_img,
            clip_limit=clip,
            mean_val=bright_data.get("raw_value", 128.0),
            block_spread=bright_data.get("block_spread", 0.0),
            glare_pct=glare_pct,
        )
        if info.get("applied"):
            if glare_pct >= 0.5:
                defect_desc = f"Glare & Specular Highlight ({glare_pct:.1f}%)"
            elif bright_data.get("block_spread", 0.0) > 25.0:
                defect_desc = f"Shadows & Uneven Lighting (Spread: {bright_data.get('block_spread', 0):.1f})"
            elif contrast_data.get("status") in ["warning", "critical"]:
                defect_desc = "Low Dynamic Contrast Range"
            else:
                defect_desc = "Non-Uniform Document Illumination"
            sev = bright_data.get("status") if bright_data.get("status") != "good" else contrast_data.get("status", "warning")
            _record_step("illumination", 2, info, defect_desc, sev)

    # 3. Denoise
    noise_data = assessment.get("noise", {})
    noise_sigma = float(noise_data.get("raw_value", 0.0))
    denoise_needed = denoise_enabled and (
        noise_data.get("status") in ["warning", "critical"]
        or noise_sigma >= 5.0
        or opts.get("force_denoise", False)
    )
    if denoise_needed:
        curr_img, info = denoise_document(curr_img, noise_sigma)
        if info.get("applied"):
            _record_step(
                "denoise",
                3,
                info,
                f"Sensor Noise / Grain (Sigma: {noise_sigma:.1f})",
                noise_data.get("status", "warning"),
            )

    # 4. Sharpen
    blur_data = assessment.get("blur", {})
    blur_var = float(blur_data.get("raw_value", 200.0))
    sharpen_needed = sharpen_enabled and (
        blur_data.get("status") in ["warning", "critical"]
        or blur_var < 110.0
        or opts.get("force_sharpen", False)
    )
    if sharpen_needed:
        curr_img, info = sharpen_document(curr_img, blur_var)
        if info.get("applied"):
            _record_step(
                "sharpen",
                4,
                info,
                f"Blur & Soft Character Edges (Var: {blur_var:.1f})",
                blur_data.get("status", "warning"),
            )

    # 5. Auto-crop
    if crop_enabled:
        curr_img, info = autocrop_document(curr_img)
        if info.get("applied"):
            _record_step(
                "autocrop",
                5,
                info,
                "Extraneous Dark Margins & Border Noise",
                "warning",
            )

    # 6. OCR-optimized Binarization
    if binarize_enabled:
        curr_img, info = binarize_document(curr_img)
        if info.get("applied"):
            _record_step(
                "binarization",
                6,
                info,
                "Low-Contrast Background / Faint Characters",
                "warning",
            )

    # Use last step assessment or assess if no steps applied
    after_assessment = last_assessment if last_assessment is not None else assess_document_image(curr_img, config)
    before_score = assessment.get("overall_score", 0.0)
    after_score = after_assessment.get("overall_score", 0.0)
    after_assessment["improvement_delta"] = round(after_score - before_score, 1)

    return curr_img, applied_corrections, after_assessment
