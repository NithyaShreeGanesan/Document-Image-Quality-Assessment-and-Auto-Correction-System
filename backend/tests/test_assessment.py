import cv2
import numpy as np
from app.services.assessment import (
    assess_document_image,
    compute_blur_metric,
    compute_brightness_metric,
    compute_contrast_metric,
    compute_noise_metric,
    compute_resolution_metric,
    compute_skew_metric,
)


def test_clean_document_assessment(clean_doc_img, default_cfg):
    result = assess_document_image(clean_doc_img, default_cfg)
    assert result["overall_score"] >= 75.0
    assert result["classification"] in ("Pass", "Needs Correction")
    assert result["blur"]["status"] == "good"
    assert result["noise"]["sub_score"] >= 70.0


def test_blurred_document_assessment(clean_doc_img, blurred_doc_img, default_cfg):
    clean_blur = compute_blur_metric(cv2.cvtColor(clean_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)
    degraded_blur = compute_blur_metric(cv2.cvtColor(blurred_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)

    # Blurred image must have lower Laplacian variance and lower sub-score
    assert degraded_blur["raw_value"] < clean_blur["raw_value"]
    assert degraded_blur["sub_score"] < clean_blur["sub_score"]
    assert degraded_blur["status"] in ("warning", "critical")


def test_skewed_document_assessment(clean_doc_img, skewed_doc_img, default_cfg):
    clean_skew = compute_skew_metric(cv2.cvtColor(clean_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)
    degraded_skew = compute_skew_metric(cv2.cvtColor(skewed_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)

    assert abs(degraded_skew["abs_angle"]) > abs(clean_skew["abs_angle"])
    assert degraded_skew["sub_score"] < clean_skew["sub_score"]


def test_dark_shadowed_document_assessment(clean_doc_img, dark_shadowed_doc_img, default_cfg):
    clean_bright = compute_brightness_metric(cv2.cvtColor(clean_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)
    degraded_bright = compute_brightness_metric(cv2.cvtColor(dark_shadowed_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)

    assert degraded_bright["raw_value"] < clean_bright["raw_value"]
    assert degraded_bright["sub_score"] < clean_bright["sub_score"]
    # Block spread or variance should be high on shadowed image
    assert degraded_bright["block_spread"] > 10.0


def test_noisy_document_assessment(clean_doc_img, noisy_doc_img, default_cfg):
    clean_noise = compute_noise_metric(cv2.cvtColor(clean_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)
    degraded_noise = compute_noise_metric(cv2.cvtColor(noisy_doc_img, cv2.COLOR_BGR2GRAY), default_cfg)

    assert degraded_noise["raw_value"] > clean_noise["raw_value"]
    assert degraded_noise["sub_score"] < clean_noise["sub_score"]
    assert degraded_noise["status"] in ("warning", "critical")


def test_resolution_metric(clean_doc_img, default_cfg):
    res_high = compute_resolution_metric(clean_doc_img, default_cfg)
    small_img = cv2.resize(clean_doc_img, (300, 400))
    res_low = compute_resolution_metric(small_img, default_cfg)

    assert res_high["raw_value"] > res_low["raw_value"]
    assert res_high["sub_score"] > res_low["sub_score"]
    assert res_low["status"] in ("warning", "critical")
