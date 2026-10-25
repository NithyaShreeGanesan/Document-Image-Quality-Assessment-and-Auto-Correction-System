import cv2
import numpy as np
import pytest
from app.services.ocr_service import evaluate_ocr, get_tesseract_status


def test_ocr_evaluation_on_synthetic_document(clean_doc_img):
    result = evaluate_ocr(clean_doc_img)
    assert isinstance(result, dict)
    assert "confidence" in result
    assert "word_count" in result
    assert "text" in result
    assert "engine" in result
    assert 0.0 <= result["confidence"] <= 100.0
    assert result["word_count"] >= 0
    assert isinstance(result["text"], str)


def test_ocr_degradation_comparison(clean_doc_img, blurred_doc_img):
    ocr_clean = evaluate_ocr(clean_doc_img)
    ocr_blurred = evaluate_ocr(blurred_doc_img)

    # Blurred document must have lower or equal confidence than clean document
    assert ocr_clean["confidence"] >= ocr_blurred["confidence"]


def test_ocr_graceful_status():
    is_avail, cmd_path, msg = get_tesseract_status()
    assert isinstance(is_avail, bool)
    assert isinstance(msg, str)
