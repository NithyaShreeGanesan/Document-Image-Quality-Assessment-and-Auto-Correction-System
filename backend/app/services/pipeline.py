import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
import cv2
from sqlalchemy.orm import Session

from backend.app.config import load_config
from backend.app.models import Alert, Assessment, Correction, Document
from backend.app.services.assessment import assess_document_image
from backend.app.services.correction import auto_correct_document
from backend.app.services.ocr_service import evaluate_ocr
from backend.app.services.storage import (
    create_corrected_pdf_from_images,
    extract_pages_from_pdf,
    load_image_from_file,
    save_corrected_image,
    save_uploaded_bytes,
)


def process_single_image(
    db: Session,
    doc_id: str,
    filename: str,
    image_path: str,
    file_type: str,
    page_no: int = 1,
    batch_id: Optional[str] = None,
    custom_options: Optional[Dict[str, Any]] = None,
) -> Document:
    """
    Executes full quality pipeline on a single image file:
    Assess -> Alert (if Fail) -> Auto-Correct -> Assess -> Deliver
    """
    config = load_config()

    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        doc = Document(
            id=doc_id,
            filename=filename,
            file_type=file_type,
            page_no=page_no,
            batch_id=batch_id,
            original_path=image_path,
            status="processing",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

    try:
        image = load_image_from_file(image_path)

        # 1. Initial Assessment
        before_assess = assess_document_image(image, config)
        ocr_conf_before, ocr_text_before = evaluate_ocr(image)

        # Remove any existing assessments / corrections if reprocessing
        db.query(Assessment).filter(Assessment.document_id == doc_id).delete()
        db.query(Correction).filter(Correction.document_id == doc_id).delete()

        # Save Before Assessment record
        assess_before_rec = Assessment(
            document_id=doc_id,
            stage="before",
            overall_score=before_assess["overall_score"],
            blur_score=before_assess["blur"]["sub_score"],
            blur_raw=before_assess["blur"]["raw_value"],
            blur_status=before_assess["blur"]["status"],
            skew_score=before_assess["skew"]["sub_score"],
            skew_angle=before_assess["skew"]["raw_value"],
            skew_status=before_assess["skew"]["status"],
            brightness_score=before_assess["brightness"]["sub_score"],
            brightness_raw=before_assess["brightness"]["raw_value"],
            brightness_status=before_assess["brightness"]["status"],
            contrast_score=before_assess["contrast"]["sub_score"],
            contrast_raw=before_assess["contrast"]["raw_value"],
            contrast_status=before_assess["contrast"]["status"],
            noise_score=before_assess["noise"]["sub_score"],
            noise_raw=before_assess["noise"]["raw_value"],
            noise_status=before_assess["noise"]["status"],
            resolution_score=before_assess["resolution"]["sub_score"],
            resolution_dpi=before_assess["resolution"]["raw_value"],
            resolution_status=before_assess["resolution"]["status"],
            classification=before_assess["classification"],
            defects_json=json.dumps(before_assess["defects"]),
        )
        db.add(assess_before_rec)

        # Create alert if initial quality is Fail (score < 45) or any critical defect detected
        has_critical = any(d.get("status") == "critical" for d in before_assess.get("defects", []))
        if before_assess["classification"] == "Fail" or has_critical:
            alert = Alert(
                document_id=doc_id,
                message=f"Low-quality scan detected: '{filename}' scored {before_assess['overall_score']}/100 ({before_assess['classification']}). Flagged for re-scan review.",
                severity="critical" if before_assess["classification"] == "Fail" else "warning",
            )
            db.add(alert)

        # 2. Auto-Correction Engine
        corrected_img, applied_corrections, after_assess = auto_correct_document(
            image,
            before_assess,
            config,
            custom_options=custom_options,
        )

        # Save corrected image file
        corrected_path = save_corrected_image(corrected_img, doc_id, filename)
        ocr_conf_after, ocr_text_after = evaluate_ocr(corrected_img)

        # Save Applied Corrections in DB
        for corr in applied_corrections:
            c_rec = Correction(
                document_id=doc_id,
                step_name=corr["step_name"],
                params_json=json.dumps(corr.get("params", {})),
                applied=True,
                order=corr["order"],
                description=corr.get("description", ""),
            )
            db.add(c_rec)

        # Save After Assessment record
        assess_after_rec = Assessment(
            document_id=doc_id,
            stage="after",
            overall_score=after_assess["overall_score"],
            blur_score=after_assess["blur"]["sub_score"],
            blur_raw=after_assess["blur"]["raw_value"],
            blur_status=after_assess["blur"]["status"],
            skew_score=after_assess["skew"]["sub_score"],
            skew_angle=after_assess["skew"]["raw_value"],
            skew_status=after_assess["skew"]["status"],
            brightness_score=after_assess["brightness"]["sub_score"],
            brightness_raw=after_assess["brightness"]["raw_value"],
            brightness_status=after_assess["brightness"]["status"],
            contrast_score=after_assess["contrast"]["sub_score"],
            contrast_raw=after_assess["contrast"]["raw_value"],
            contrast_status=after_assess["contrast"]["status"],
            noise_score=after_assess["noise"]["sub_score"],
            noise_raw=after_assess["noise"]["raw_value"],
            noise_status=after_assess["noise"]["status"],
            resolution_score=after_assess["resolution"]["sub_score"],
            resolution_dpi=after_assess["resolution"]["raw_value"],
            resolution_status=after_assess["resolution"]["status"],
            classification=after_assess["classification"],
            defects_json=json.dumps(after_assess["defects"]),
        )
        db.add(assess_after_rec)

        # Update Document record
        doc.corrected_path = corrected_path
        doc.status = after_assess["classification"].lower().replace(" ", "_")
        doc.ocr_confidence_before = ocr_conf_before
        doc.ocr_confidence_after = ocr_conf_after
        doc.ocr_text_before = ocr_text_before
        doc.ocr_text_after = ocr_text_after

        db.commit()
        db.refresh(doc)
        return doc

    except Exception as e:
        db.rollback()
        print(f"Error processing document {doc_id}: {e}")
        doc.status = "error"
        db.commit()
        raise e


def process_upload_file(
    db: Session,
    file_bytes: bytes,
    filename: str,
    batch_id: Optional[str] = None,
) -> List[str]:
    """
    Handles uploaded file (single image or multi-page PDF).
    Returns list of document IDs created.
    """
    ext = Path(filename).suffix.lower()
    doc_ids: List[str] = []

    if ext == ".pdf":
        temp_id = str(uuid.uuid4())
        pdf_path = save_uploaded_bytes(file_bytes, filename, temp_id)
        pages = extract_pages_from_pdf(pdf_path)

        common_batch = batch_id or str(uuid.uuid4())
        corrected_page_paths: List[str] = []

        for page_no, img, page_path in pages:
            page_doc_id = str(uuid.uuid4())
            page_filename = f"{Path(filename).stem}_p{page_no}.png"
            doc = process_single_image(
                db=db,
                doc_id=page_doc_id,
                filename=page_filename,
                image_path=page_path,
                file_type="pdf_page",
                page_no=page_no,
                batch_id=common_batch,
            )
            doc_ids.append(page_doc_id)
            if doc.corrected_path:
                corrected_page_paths.append(doc.corrected_path)

        # If multiple pages, generate combined corrected PDF as well
        if len(corrected_page_paths) > 1:
            combined_pdf_path = Path(pdf_path).parent.parent / "corrected" / f"{temp_id}_corrected.pdf"
            create_corrected_pdf_from_images(corrected_page_paths, str(combined_pdf_path))

    else:
        doc_id = str(uuid.uuid4())
        image_path = save_uploaded_bytes(file_bytes, filename, doc_id)
        file_type = ext.lstrip(".")
        process_single_image(
            db=db,
            doc_id=doc_id,
            filename=filename,
            image_path=image_path,
            file_type=file_type,
            page_no=1,
            batch_id=batch_id,
        )
        doc_ids.append(doc_id)

    return doc_ids
