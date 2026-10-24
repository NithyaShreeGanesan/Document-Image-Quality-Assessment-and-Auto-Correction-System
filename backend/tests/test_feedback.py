import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models import Document, Assessment, Correction, Feedback, Setting
from backend.app.services.suggestions import generate_setting_suggestions, apply_suggestion
from backend.app.api.documents import submit_document_feedback, get_document_feedback, _doc_to_detail
from backend.app.api.analytics import get_feedback_analytics
from backend.app.schemas import FeedbackSubmitRequest, ApplySuggestionRequest
from backend.app.api.settings import apply_adaptive_suggestion, get_adaptive_suggestions


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    # Seed document
    doc = Document(
        id="fb-test-doc-001",
        filename="contract_scan.png",
        file_type=".png",
        original_path="dummy_orig.png",
        corrected_path="dummy_corr.png",
        status="pass",
        preset="receipt",
    )
    session.add(doc)
    session.commit()

    yield session
    session.close()


def test_submit_and_retrieve_feedback(test_db):
    doc_id = "fb-test-doc-001"

    # 1. Submit positive feedback
    req1 = FeedbackSubmitRequest(
        rating="thumbs_up",
        comment="Great clean text!",
        disliked_steps=[],
    )
    res1 = submit_document_feedback(doc_id=doc_id, req=req1, db=test_db)
    assert res1.rating == "thumbs_up"
    assert res1.comment == "Great clean text!"
    assert res1.disliked_steps == []

    # Verify retrieval
    res_get = get_document_feedback(doc_id=doc_id, db=test_db)
    assert res_get is not None
    assert res_get.rating == "thumbs_up"

    # 2. Update with negative feedback and disliked steps
    req2 = FeedbackSubmitRequest(
        rating="thumbs_down",
        comment="contrast too aggressive, halos around stamps",
        disliked_steps=["illumination", "binarization"],
    )
    res2 = submit_document_feedback(doc_id=doc_id, req=req2, db=test_db)
    assert res2.rating == "thumbs_down"
    assert "illumination" in res2.disliked_steps
    assert "binarization" in res2.disliked_steps

    # Verify DocumentDetail includes feedback
    doc = test_db.query(Document).filter(Document.id == doc_id).first()
    detail = _doc_to_detail(doc)
    assert detail.feedback is not None
    assert detail.feedback.rating == "thumbs_down"
    assert "illumination" in detail.feedback.disliked_steps


def test_feedback_analytics_calculation(test_db):
    doc1 = test_db.query(Document).filter(Document.id == "fb-test-doc-001").first()

    # Add second and third documents
    doc2 = Document(id="fb-test-002", filename="receipt_1.jpg", file_type=".jpg", original_path="d2.jpg", status="pass")
    doc3 = Document(id="fb-test-003", filename="invoice_2.jpg", file_type=".jpg", original_path="d3.jpg", status="fail")
    test_db.add_all([doc2, doc3])
    test_db.commit()

    # Add feedbacks
    fb1 = Feedback(document_id=doc1.id, rating="thumbs_up", comment="Perfect")
    fb2 = Feedback(document_id=doc2.id, rating="thumbs_down", comment="Over-smoothed text", disliked_steps_json=json.dumps(["denoise"]))
    fb3 = Feedback(document_id=doc3.id, rating="thumbs_down", comment="Harsh binarization", disliked_steps_json=json.dumps(["binarization", "denoise"]))
    test_db.add_all([fb1, fb2, fb3])
    test_db.commit()

    analytics = get_feedback_analytics(db=test_db)
    assert analytics.total_feedback == 3
    assert analytics.thumbs_up_count == 1
    assert analytics.thumbs_down_count == 2
    assert analytics.satisfaction_rate == 33.3  # 1 / 3 = 33.3%

    # Check most disliked steps
    disliked_map = {item["step"]: item["count"] for item in analytics.most_disliked_steps}
    assert disliked_map.get("denoise") == 2
    assert disliked_map.get("binarization") == 1


def test_adaptive_suggestions_engine_and_apply(test_db):
    # Add feedback complaining about contrast & binarization
    doc = test_db.query(Document).filter(Document.id == "fb-test-doc-001").first()
    fb = Feedback(
        document_id=doc.id,
        rating="thumbs_down",
        comment="contrast too aggressive, heavy black borders",
        disliked_steps_json=json.dumps(["illumination", "binarization"]),
    )
    test_db.add(fb)
    test_db.commit()

    # Generate suggestions
    suggestions = generate_setting_suggestions(db=test_db)
    assert len(suggestions) > 0

    suggestion_ids = [s["id"] for s in suggestions]
    assert "clahe_clip_limit_tune" in suggestion_ids or "receipt_preset_tune" in suggestion_ids

    # Find CLAHE suggestion and apply it
    clahe_sugg = next((s for s in suggestions if s["id"] == "clahe_clip_limit_tune"), None)
    if clahe_sugg:
        req = ApplySuggestionRequest(
            suggestion_id=clahe_sugg["id"],
            parameters=clahe_sugg["parameters"],
            target_type=clahe_sugg["target_type"],
            preset_id=clahe_sugg.get("preset_id"),
        )
        res = apply_adaptive_suggestion(req=req, db=test_db)
        assert res["status"] == "applied"
        assert res["suggestion_id"] == "clahe_clip_limit_tune"

        # Check DB Setting
        s = test_db.query(Setting).filter(Setting.key == "corrections").first()
        assert s is not None
        saved_val = json.loads(s.value_json)
        assert saved_val.get("clahe_clip_limit") == 1.5
