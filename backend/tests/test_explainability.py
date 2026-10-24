import json
import pytest
import numpy as np
import cv2
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models import Document, Assessment, Correction
from backend.app.config import load_config
from backend.app.services.assessment import assess_document_image
from backend.app.services.correction import auto_correct_document
from backend.app.api.documents import _doc_to_detail
from backend.app.schemas import PerStepScoreItem


def _create_synthetic_document_with_defects() -> np.ndarray:
    """Creates a document image with multiple defects: skew (-4 deg) and low contrast."""
    img = np.ones((600, 800), dtype=np.uint8) * 250
    # Add text lines
    for y in range(80, 520, 45):
        cv2.putText(
            img,
            f"Official Standard Invoice Record Line Index #{y // 45}",
            (50, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (40,),
            2,
            cv2.LINE_AA,
        )

    # 1. Add skew tilt (-4.0 degrees)
    M = cv2.getRotationMatrix2D((400, 300), -4.0, 1.0)
    skewed = cv2.warpAffine(img, M, (800, 600), borderMode=cv2.BORDER_CONSTANT, borderValue=255)

    # 2. Add lighting/contrast defect (dark shadow gradient on left)
    shadow = np.linspace(80, 240, 800).astype(np.uint8)
    shadow_grid = np.tile(shadow, (600, 1))
    degraded = cv2.multiply(skewed.astype(float) / 255.0, shadow_grid.astype(float)).astype(np.uint8)

    return degraded


def test_per_step_score_delta_calculation():
    config = load_config()
    degraded = _create_synthetic_document_with_defects()

    # Initial assessment
    before_assess = assess_document_image(degraded, config)
    initial_score = before_assess["overall_score"]
    assert initial_score < 80.0

    # Auto correct
    corrected_img, applied_corrections, after_assess = auto_correct_document(
        image=degraded,
        assessment=before_assess,
        config=config,
    )

    assert len(applied_corrections) > 0

    # Verify each applied correction has pre_score, post_score, delta, and defect_addressed
    running_score = initial_score
    total_delta = 0.0

    for i, step in enumerate(applied_corrections):
        assert "step_name" in step
        assert "pre_score" in step
        assert "post_score" in step
        assert "delta" in step
        assert "defect_addressed" in step
        assert len(step["defect_addressed"]) > 0

        # Pre-score of current step should be approximately the previous step's post-score
        assert abs(step["pre_score"] - running_score) < 0.2
        expected_delta = round(step["post_score"] - step["pre_score"], 1)
        assert abs(step["delta"] - expected_delta) < 0.2

        total_delta += step["delta"]
        running_score = step["post_score"]

    # Final running score should equal the final after_assess overall_score
    final_score = after_assess["overall_score"]
    assert abs(running_score - final_score) < 0.2
    assert final_score > initial_score


def test_document_detail_per_step_scores_serialization():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    step_data = [
        {
            "step_name": "deskew",
            "order": 1,
            "pre_score": 52.0,
            "post_score": 64.5,
            "delta": 12.5,
            "defect_addressed": "Skew Alignment (-3.8°)",
            "description": "Rotated image by +3.80° to level document orientation",
        },
        {
            "step_name": "illumination",
            "order": 2,
            "pre_score": 64.5,
            "post_score": 79.0,
            "delta": 14.5,
            "defect_addressed": "Shadows & Uneven Lighting",
            "description": "Normalized illumination with CLAHE clip limit 2.0",
        },
        {
            "step_name": "denoise",
            "order": 3,
            "pre_score": 79.0,
            "post_score": 84.0,
            "delta": 5.0,
            "defect_addressed": "Sensor Noise / Grain (Sigma: 6.2)",
            "description": "Applied bilateral filter to eliminate background speckles",
        },
    ]

    doc = Document(
        id="explain-test-doc-001",
        filename="scanned_receipt.png",
        file_type=".png",
        original_path="dummy.png",
        corrected_path="dummy_corr.png",
        status="pass",
        preset="receipt",
        per_step_scores_json=json.dumps(step_data),
    )
    session.add(doc)
    session.commit()

    detail = _doc_to_detail(doc)
    assert detail.per_step_scores is not None
    assert len(detail.per_step_scores) == 3

    assert detail.per_step_scores[0].step_name == "deskew"
    assert detail.per_step_scores[0].delta == 12.5
    assert detail.per_step_scores[0].defect_addressed == "Skew Alignment (-3.8°)"

    assert detail.per_step_scores[1].step_name == "illumination"
    assert detail.per_step_scores[1].delta == 14.5

    assert detail.per_step_scores[2].step_name == "denoise"
    assert detail.per_step_scores[2].delta == 5.0
