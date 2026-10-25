import io
import json
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Assessment, Correction, Document
from app.services.report_service import (
    generate_batch_report,
    generate_single_document_report,
)


@pytest.fixture
def memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    batch_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())

    doc = Document(
        id=doc_id,
        filename="invoice_sample_001.png",
        file_type="png",
        page_no=1,
        batch_id=batch_id,
        original_path="sample_data/sample_1_clean_invoice.png",
        corrected_path="sample_data/sample_1_clean_invoice.png",
        status="pass",
        preset="invoice",
        ocr_confidence_before=72.5,
        ocr_confidence_after=94.8,
        ocr_word_count_before=45,
        ocr_word_count_after=58,
        ocr_text_before="INVOICE #1024 Total $450",
        ocr_text_after="INVOICE #1024 Total $450.00 Paid in full",
        ocr_engine="Tesseract OCR",
    )
    session.add(doc)

    assess_b = Assessment(
        document_id=doc_id,
        stage="before",
        overall_score=68.5,
        blur_score=60.0,
        blur_raw=85.0,
        skew_score=70.0,
        skew_angle=2.1,
        brightness_score=80.0,
        brightness_raw=190.0,
        contrast_score=65.0,
        contrast_raw=38.0,
        noise_score=75.0,
        noise_raw=7.2,
        resolution_score=85.0,
        resolution_dpi=220.0,
        glare_score=95.0,
        cutoff_score=100.0,
        orientation_angle=0,
        classification="Needs Correction",
        rescan_recommended=False,
        rescan_guidance_json=json.dumps([
            {
                "defect": "blur",
                "severity": "warning",
                "title": "Slight Soft Focus",
                "tip": "Hold camera steady and increase lighting.",
            }
        ]),
        defects_json=json.dumps([
            {
                "metric": "blur",
                "label": "Sharpness",
                "raw_value": 85.0,
                "unit": "var",
                "sub_score": 60.0,
                "status": "warning",
                "explanation": "Mild softness detected",
            }
        ]),
    )
    session.add(assess_b)

    assess_a = Assessment(
        document_id=doc_id,
        stage="after",
        overall_score=88.2,
        blur_score=88.0,
        blur_raw=145.0,
        skew_score=98.0,
        skew_angle=0.1,
        brightness_score=92.0,
        brightness_raw=210.0,
        contrast_score=85.0,
        contrast_raw=52.0,
        noise_score=90.0,
        noise_raw=3.4,
        resolution_score=85.0,
        resolution_dpi=220.0,
        glare_score=95.0,
        cutoff_score=100.0,
        orientation_angle=0,
        classification="Pass",
        rescan_recommended=False,
    )
    session.add(assess_a)

    corr = Correction(
        document_id=doc_id,
        step_name="deskew",
        order=1,
        applied=True,
        description="Rotated 2.1 degrees counter-clockwise to level horizontal lines.",
    )
    session.add(corr)
    session.commit()

    yield session, doc_id, batch_id
    session.close()


def test_generate_single_document_report(memory_db):
    session, doc_id, _ = memory_db
    doc = session.query(Document).filter(Document.id == doc_id).first()
    assert doc is not None

    buf = generate_single_document_report(doc, session)
    assert isinstance(buf, io.BytesIO)
    content = buf.getvalue()
    # Must be valid non-empty PDF file starting with %PDF-
    assert len(content) > 1000
    assert content.startswith(b"%PDF-")


def test_generate_batch_report(memory_db):
    session, _, batch_id = memory_db
    buf = generate_batch_report(batch_id, session)
    assert isinstance(buf, io.BytesIO)
    content = buf.getvalue()
    assert len(content) > 1000
    assert content.startswith(b"%PDF-")
