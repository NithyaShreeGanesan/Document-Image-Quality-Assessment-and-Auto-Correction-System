import sys
from pathlib import Path

_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import cv2
import numpy as np
import pytest
from app.config import DEFAULT_CONFIG


def create_base_document(width=800, height=1100) -> np.ndarray:
    """Creates a clean synthetic document image with headers, paragraphs, and tables."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 255

    # Document border / margins
    cv2.rectangle(img, (40, 40), (width - 40, height - 40), (220, 220, 220), 1)

    # Title header
    cv2.putText(img, "INVOICE & QUALITY ASSESSMENT REPORT", (60, 100), cv2.FONT_HERSHEY_DUPLEX, 0.8, (20, 20, 20), 2)
    cv2.putText(img, "DocuQuality Systems Inc. - Document Reference #DQ-9042", (60, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)
    cv2.line(img, (60, 150), (width - 60, 150), (50, 50, 50), 2)

    # Text blocks (paragraphs)
    lines = [
        "1. Executive Summary: Automated document quality analysis ensures high OCR fidelity.",
        "2. Optical Character Recognition (OCR) systems require high contrast and crisp character edges.",
        "3. Document skew and motion blur can degrade text classification accuracy by over 30%.",
        "4. Non-uniform lighting and shadows pose severe challenges for thresholding algorithms.",
        "5. Itemized Breakdown: Subtotal $1,450.00 | Processing Fee $25.00 | Total Balance $1,475.00.",
        "6. Verification: Digital signature verified. Approved for auto-archiving.",
        "7. Notes: Scanned using mobile sensor capture with 300 DPI target resolution.",
        "8. Compliance: Meets ISO-19005 archiving standards for electronic record management.",
    ]

    y = 200
    for line in lines:
        cv2.putText(img, line, (60, y), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (25, 25, 25), 1)
        y += 40

    # Draw a sample table grid
    cv2.rectangle(img, (60, y + 20), (width - 60, y + 220), (100, 100, 100), 1)
    cv2.line(img, (60, y + 60), (width - 60, y + 60), (100, 100, 100), 1)
    cv2.line(img, (250, y + 20), (250, y + 220), (100, 100, 100), 1)
    cv2.line(img, (500, y + 20), (500, y + 220), (100, 100, 100), 1)

    cv2.putText(img, "Metric Specification", (70, y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)
    cv2.putText(img, "Target Standard", (260, y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)
    cv2.putText(img, "Observed Status", (510, y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)

    return img


@pytest.fixture
def clean_doc_img():
    return create_base_document()


@pytest.fixture
def blurred_doc_img():
    base = create_base_document()
    return cv2.GaussianBlur(base, (15, 15), 5.0)


@pytest.fixture
def skewed_doc_img():
    base = create_base_document()
    angle = 6.0  # 6 degrees tilt
    h, w = base.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    return cv2.warpAffine(base, M, (w, h), borderValue=(255, 255, 255))


@pytest.fixture
def dark_shadowed_doc_img():
    base = create_base_document()
    h, w = base.shape[:2]
    # Create diagonal shadow gradient
    x = np.linspace(0.3, 0.9, w)
    y = np.linspace(0.3, 0.9, h)
    xx, yy = np.meshgrid(x, y)
    gradient = (xx * yy)[:, :, np.newaxis]
    dark = (base.astype(np.float32) * gradient).clip(0, 255).astype(np.uint8)
    return dark


@pytest.fixture
def noisy_doc_img():
    base = create_base_document()
    noise = np.random.normal(0, 25, base.shape).astype(np.float32)
    noisy = np.clip(base.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return noisy


@pytest.fixture
def default_cfg():
    return DEFAULT_CONFIG.copy()
