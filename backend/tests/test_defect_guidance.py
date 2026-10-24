import cv2
import numpy as np
import pytest
from backend.app.services.assessment import (
    assess_document_image,
    compute_cutoff_metric,
    compute_glare_metric,
    compute_orientation_metric,
    generate_rescan_guidance,
)
from backend.app.services.correction import auto_orient_document


@pytest.fixture
def clean_page():
    img = np.full((800, 600, 3), 242, dtype=np.uint8)
    # Add text lines in the middle with ample 60px margins
    for y in range(80, 700, 35):
        cv2.putText(img, "DocuQuality Archival Scan Test Line 12345", (60, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (25, 25, 25), 2)
    return img


def test_glare_detection(clean_page, default_cfg):
    # Clean page has no glare
    clean_res = compute_glare_metric(clean_page, default_cfg)
    assert clean_res["raw_value"] < 0.5
    assert clean_res["status"] == "good"

    # Add a severe specular glare hotspot
    glare_img = clean_page.copy()
    cv2.circle(glare_img, (300, 400), 90, (255, 255, 255), -1)

    glare_res = compute_glare_metric(glare_img, default_cfg)
    assert glare_res["raw_value"] > 1.5
    assert glare_res["status"] in ("warning", "critical")
    assert "glare" in glare_res["explanation"].lower()


def test_cutoff_detection(clean_page, default_cfg):
    gray_clean = cv2.cvtColor(clean_page, cv2.COLOR_BGR2GRAY)
    clean_cutoff = compute_cutoff_metric(gray_clean, default_cfg)
    assert clean_cutoff["raw_value"] == 0
    assert clean_cutoff["status"] == "good"

    # Create cutoff by drawing text/strokes directly cutting through border (within 5px)
    cutoff_img = gray_clean.copy()
    cutoff_img[0:4, 100:400] = 10  # touches top edge
    cutoff_img[100:400, 0:4] = 10  # touches left edge

    cutoff_res = compute_cutoff_metric(cutoff_img, default_cfg)
    assert cutoff_res["raw_value"] >= 2
    assert "top" in cutoff_res["touching_edges"]
    assert "left" in cutoff_res["touching_edges"]
    assert cutoff_res["status"] == "critical"


def test_orientation_detection_and_auto_orient(clean_page, default_cfg):
    # Upright page should be detected as 0 deg
    orient_upright = compute_orientation_metric(clean_page, default_cfg)
    assert orient_upright["rotation"] == 0
    assert orient_upright["status"] == "good"

    # Rotate 90 degrees clockwise
    rot_90 = cv2.rotate(clean_page, cv2.ROTATE_90_CLOCKWISE)
    orient_90 = compute_orientation_metric(rot_90, default_cfg)
    assert orient_90["rotation"] == 90
    assert orient_90["status"] == "critical"

    # Auto-orient should rotate it back to upright
    corrected_img, info = auto_orient_document(rot_90, 90)
    assert info["applied"] is True
    # Verify the corrected image is now upright
    orient_fixed = compute_orientation_metric(corrected_img, default_cfg)
    assert orient_fixed["rotation"] == 0


def test_rescan_guidance_generation(default_cfg):
    # Simulated critical defects
    defects = [
        {
            "metric": "blur",
            "label": "Sharpness",
            "sub_score": 35.0,
            "status": "critical",
            "explanation": "Severe blur",
        },
        {
            "metric": "glare",
            "label": "Glare",
            "sub_score": 40.0,
            "status": "critical",
            "explanation": "Flash reflection",
        },
        {
            "metric": "contrast",
            "label": "Contrast",
            "sub_score": 60.0,
            "status": "warning",
            "explanation": "Faint ink",
        },
    ]

    guidance = generate_rescan_guidance(defects, overall_score=42.0, classification="Fail")
    assert len(guidance) == 3
    # Critical should come first
    assert guidance[0]["severity"] == "critical"
    # Actionable tips must be populated
    tips = [g["tip"] for g in guidance]
    assert any("focus" in t.lower() or "steady" in t.lower() for t in tips)
    assert any("flash" in t.lower() or "angle" in t.lower() for t in tips)
