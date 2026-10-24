import cv2
import numpy as np
import pytest
from backend.app.services.presets import (
    BUILTIN_PRESETS,
    apply_preset_to_config,
    detect_document_preset,
)


def test_builtin_presets_structure():
    assert "general" in BUILTIN_PRESETS
    assert "invoice" in BUILTIN_PRESETS
    assert "receipt" in BUILTIN_PRESETS
    assert "id_card" in BUILTIN_PRESETS
    assert "book_page" in BUILTIN_PRESETS
    assert "handwritten_note" in BUILTIN_PRESETS

    for pid, p in BUILTIN_PRESETS.items():
        assert "weights" in p
        assert "classification" in p
        assert "corrections" in p
        # Check that receipt has binarization enabled
        if pid == "receipt":
            assert p["corrections"]["ocr_binarization"] is True
        # Check that ID card has binarization disabled to protect photo
        if pid == "id_card":
            assert p["corrections"]["ocr_binarization"] is False
            assert p["weights"]["resolution"] >= 0.25


def test_apply_preset_to_config():
    base_cfg = {
        "weights": {"blur": 0.25, "skew": 0.15, "brightness": 0.15},
        "classification": {"pass_score": 75.0},
        "corrections": {"deskew_enabled": True},
    }

    # Apply receipt preset
    pid, merged = apply_preset_to_config("receipt", base_cfg)
    assert pid == "receipt"
    assert merged["corrections"]["ocr_binarization"] is True
    assert merged["classification"]["pass_score"] == 70.0


def test_detect_receipt_preset():
    # Long narrow image typical of POS thermal receipts (e.g. 1200 high x 350 wide -> aspect ratio ~ 0.29)
    receipt_img = np.full((1200, 350, 3), 245, dtype=np.uint8)
    detected = detect_document_preset(receipt_img)
    assert detected == "receipt"


def test_detect_id_card_preset():
    # Standard ID-1 card aspect ratio (85.6mm x 53.98mm ~ 1.586 landscape)
    # Width 856, Height 540
    card_img = np.full((540, 856, 3), 235, dtype=np.uint8)
    # Add a colorful photo ID patch (high saturation in HSV)
    card_img[100:350, 60:300] = [60, 180, 240]  # vibrant BGR colors

    detected = detect_document_preset(card_img)
    assert detected == "id_card"


def test_detect_invoice_preset():
    # Standard A4/Letter invoice with multiple horizontal grid lines
    inv_img = np.full((800, 600, 3), 250, dtype=np.uint8)
    # Draw horizontal table grid lines
    for y in range(200, 650, 45):
        cv2.line(inv_img, (50, y), (550, y), (30, 30, 30), 2)
    detected = detect_document_preset(inv_img)
    assert detected == "invoice"
