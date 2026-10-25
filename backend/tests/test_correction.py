import cv2
import numpy as np
from app.services.assessment import assess_document_image
from app.services.correction import (
    auto_correct_document,
    correct_illumination,
    denoise_document,
    deskew_image,
    sharpen_document,
)


def test_deskew_correction(skewed_doc_img, default_cfg):
    assess_before = assess_document_image(skewed_doc_img, default_cfg)
    angle = assess_before["skew"]["raw_value"]
    corrected, info = deskew_image(skewed_doc_img, angle)

    assert info["applied"] is True
    assess_after = assess_document_image(corrected, default_cfg)
    assert abs(assess_after["skew"]["abs_angle"]) < abs(assess_before["skew"]["abs_angle"])
    assert assess_after["skew"]["sub_score"] >= assess_before["skew"]["sub_score"]


def test_denoise_correction(noisy_doc_img, default_cfg):
    assess_before = assess_document_image(noisy_doc_img, default_cfg)
    corrected, info = denoise_document(noisy_doc_img, assess_before["noise"]["raw_value"])

    assert info["applied"] is True
    assess_after = assess_document_image(corrected, default_cfg)
    # Corrected image must have lower noise sigma
    assert assess_after["noise"]["raw_value"] < assess_before["noise"]["raw_value"]
    assert assess_after["noise"]["sub_score"] > assess_before["noise"]["sub_score"]


def test_sharpen_correction(blurred_doc_img, default_cfg):
    assess_before = assess_document_image(blurred_doc_img, default_cfg)
    corrected, info = sharpen_document(blurred_doc_img, assess_before["blur"]["raw_value"])

    assert info["applied"] is True
    assess_after = assess_document_image(corrected, default_cfg)
    assert assess_after["blur"]["raw_value"] > assess_before["blur"]["raw_value"]
    assert assess_after["blur"]["sub_score"] > assess_before["blur"]["sub_score"]


def test_illumination_correction(dark_shadowed_doc_img, default_cfg):
    assess_before = assess_document_image(dark_shadowed_doc_img, default_cfg)
    corrected, info = correct_illumination(
        dark_shadowed_doc_img,
        clip_limit=2.0,
        mean_val=assess_before["brightness"]["raw_value"],
        block_spread=assess_before["brightness"]["block_spread"],
    )

    assert info["applied"] is True
    assess_after = assess_document_image(corrected, default_cfg)
    # Brightness should be higher and closer to ideal
    assert assess_after["brightness"]["raw_value"] > assess_before["brightness"]["raw_value"]
    assert assess_after["brightness"]["sub_score"] >= assess_before["brightness"]["sub_score"]


def test_end_to_end_auto_correction_improvement(skewed_doc_img, default_cfg):
    assess_before = assess_document_image(skewed_doc_img, default_cfg)
    corrected_img, applied_corrections, assess_after = auto_correct_document(
        skewed_doc_img,
        assess_before,
        default_cfg,
    )

    assert len(applied_corrections) > 0
    # Assert that corrected images score higher than the originals
    assert assess_after["overall_score"] >= assess_before["overall_score"]
    assert assess_after["improvement_delta"] >= 0.0
