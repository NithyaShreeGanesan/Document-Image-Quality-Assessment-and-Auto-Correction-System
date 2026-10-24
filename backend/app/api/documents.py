import json
import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Alert, Assessment, Correction, Document
from backend.app.schemas import (
    AssessmentResponse,
    CorrectionItem,
    DefectItem,
    DocumentDetailResponse,
    DocumentSummaryResponse,
    PaginatedDocumentsResponse,
    ReprocessRequest,
)
from backend.app.services.pipeline import process_single_image, process_upload_file
from backend.app.services.storage import create_zip_archive

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".pdf"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def _doc_to_detail(doc: Document) -> DocumentDetailResponse:
    before_rec = next((a for a in doc.assessments if a.stage == "before"), None)
    after_rec = next((a for a in doc.assessments if a.stage == "after"), None)

    def _rec_to_assess(rec: Assessment, is_after: bool = False) -> Optional[AssessmentResponse]:
        if not rec:
            return None
        defects = []
        if rec.defects_json:
            try:
                defects_raw = json.loads(rec.defects_json)
                defects = [DefectItem(**d) for d in defects_raw]
            except Exception:
                pass
        delta = None
        if is_after and before_rec:
            delta = round(rec.overall_score - before_rec.overall_score, 1)

        return AssessmentResponse(
            stage=rec.stage,
            overall_score=rec.overall_score,
            classification=rec.classification,
            blur_score=rec.blur_score,
            blur_raw=rec.blur_raw,
            blur_status=rec.blur_status,
            skew_score=rec.skew_score,
            skew_angle=rec.skew_angle,
            skew_status=rec.skew_status,
            brightness_score=rec.brightness_score,
            brightness_raw=rec.brightness_raw,
            brightness_status=rec.brightness_status,
            contrast_score=rec.contrast_score,
            contrast_raw=rec.contrast_raw,
            contrast_status=rec.contrast_status,
            noise_score=rec.noise_score,
            noise_raw=rec.noise_raw,
            noise_status=rec.noise_status,
            resolution_score=rec.resolution_score,
            resolution_dpi=rec.resolution_dpi,
            resolution_status=rec.resolution_status,
            defects=defects,
            improvement_delta=delta,
        )

    corrections = []
    for c in sorted(doc.corrections, key=lambda x: x.order):
        params = {}
        if c.params_json:
            try:
                params = json.loads(c.params_json)
            except Exception:
                pass
        corrections.append(
            CorrectionItem(
                step_name=c.step_name,
                order=c.order,
                params=params,
                applied=c.applied,
                description=c.description,
            )
        )

    base_url = "/api/documents"
    orig_url = f"{base_url}/{doc.id}/download?variant=original"
    cnt_b = doc.ocr_word_count_before or 0
    cnt_a = doc.ocr_word_count_after or 0
    words_rec = max(0, cnt_a - cnt_b)

    return DocumentDetailResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        page_no=doc.page_no,
        batch_id=doc.batch_id,
        status=doc.status,
        preset=doc.preset or "general",
        created_at=doc.created_at,
        original_url=orig_url,
        corrected_url=corr_url,
        before_assessment=_rec_to_assess(before_rec, False),
        after_assessment=_rec_to_assess(after_rec, True),
        applied_corrections=corrections,
        ocr_confidence_before=doc.ocr_confidence_before,
        ocr_confidence_after=doc.ocr_confidence_after,
        ocr_word_count_before=cnt_b,
        ocr_word_count_after=cnt_a,
        ocr_words_recovered=words_rec,
        ocr_text_before=doc.ocr_text_before,
        ocr_text_after=doc.ocr_text_after,
        ocr_engine=doc.ocr_engine,
        ocr_message=doc.ocr_message,
    )


@router.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """
    Accepts single or batch upload (up to 50 files, max 25MB each).
    Validates file format and size, returns document and batch IDs.
    """
    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 files allowed per upload batch.")

    batch_id = str(uuid.uuid4())
    created_doc_ids: List[str] = []

    for upload_file in files:
        ext = Path(upload_file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format for '{upload_file.filename}'. Allowed: JPEG, PNG, TIFF, PDF.",
            )

        content = await upload_file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File '{upload_file.filename}' exceeds maximum allowed size of 25 MB.",
            )

        # Process file synchronously or via pipeline
        # Processing synchronously ensures immediate readiness; for batches, it processes each sequentially
        try:
            ids = process_upload_file(db, content, upload_file.filename, batch_id=batch_id)
            created_doc_ids.extend(ids)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process '{upload_file.filename}': {str(e)}")

@router.get("/samples/list")
def list_demo_samples():
    """Lists pre-generated synthetic degraded documents available for demo testing."""
    samples_dir = Path(__file__).resolve().parent.parent.parent.parent / "sample_data"
    samples = []
    if samples_dir.exists():
        for f in sorted(samples_dir.iterdir()):
            if f.suffix.lower() in ALLOWED_EXTENSIONS and not f.name.startswith("temp_"):
                samples.append({
                    "filename": f.name,
                    "label": f.stem.replace("_", " ").title(),
                    "size": f.stat().st_size,
                })
    return samples


@router.post("/samples/process/{filename}")
def process_demo_sample(filename: str, db: Session = Depends(get_db)):
    """Processes a pre-generated synthetic degraded document directly from sample_data/."""
    samples_dir = Path(__file__).resolve().parent.parent.parent.parent / "sample_data"
    target_file = samples_dir / filename
    if not target_file.exists():
        raise HTTPException(status_code=404, detail="Sample file not found")

    with open(target_file, "rb") as f:
        content = f.read()

    batch_id = str(uuid.uuid4())
    doc_ids = process_upload_file(db, content, filename, batch_id=batch_id)
    return {
        "batch_id": batch_id,
        "document_ids": doc_ids,
        "count": len(doc_ids),
        "message": f"Successfully processed sample {filename}",
    }


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """Returns full details, before/after assessments, defects, and correction list."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _doc_to_detail(doc)


@router.get("", response_model=PaginatedDocumentsResponse)
def list_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    search: Optional[str] = None,
    batch_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lists documents with pagination, status filtering, score range, and search."""
    query = db.query(Document)

    if batch_id:
        query = query.filter(Document.batch_id == batch_id)

    if status and status != "all":
        query = query.filter(Document.status.ilike(f"%{status}%"))

    if search:
        query = query.filter(Document.filename.ilike(f"%{search}%"))

    # Join with assessment to filter by score if requested
    if min_score is not None or max_score is not None:
        query = query.join(Assessment, Document.id == Assessment.document_id).filter(Assessment.stage == "before")
        if min_score is not None:
            query = query.filter(Assessment.overall_score >= min_score)
        if max_score is not None:
            query = query.filter(Assessment.overall_score <= max_score)

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit
    docs = query.order_by(desc(Document.created_at)).offset(offset).limit(limit).all()

    items = []
    for d in docs:
        b_rec = next((a for a in d.assessments if a.stage == "before"), None)
        a_rec = next((a for a in d.assessments if a.stage == "after"), None)

        top_defects = []
        if b_rec and b_rec.defects_json:
            try:
                raw_d = json.loads(b_rec.defects_json)
                top_defects = [item["label"] for item in raw_d if item.get("status") in ("warning", "critical")][:3]
            except Exception:
                pass

        score_b = b_rec.overall_score if b_rec else None
        score_a = a_rec.overall_score if a_rec else None
        improvement = round(score_a - score_b, 1) if (score_a is not None and score_b is not None) else None

        items.append(
            DocumentSummaryResponse(
                id=d.id,
                filename=d.filename,
                file_type=d.file_type,
                page_no=d.page_no,
                batch_id=d.batch_id,
                status=d.status,
                created_at=d.created_at,
                thumbnail_url=f"/api/documents/{d.id}/download?variant=corrected" if d.corrected_path else f"/api/documents/{d.id}/download?variant=original",
                score_before=score_b,
                score_after=score_a,
                improvement=improvement,
                classification=b_rec.classification if b_rec else d.status.title(),
                top_defects=top_defects,
            )
        )

    return PaginatedDocumentsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    variant: str = Query("corrected", pattern="^(corrected|original|zip)$"),
    db: Session = Depends(get_db),
):
    """
    Downloads document file:
    - variant=corrected (default): clean corrected image/PDF
    - variant=original: untouched original upload
    - variant=zip: ZIP archive containing both original and corrected files
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if variant == "original":
        if not os.path.exists(doc.original_path):
            raise HTTPException(status_code=404, detail="Original file not found on disk")
        return FileResponse(
            doc.original_path,
            filename=f"original_{doc.filename}",
            media_type="application/octet-stream",
        )

    elif variant == "corrected":
        target = doc.corrected_path if (doc.corrected_path and os.path.exists(doc.corrected_path)) else doc.original_path
        if not os.path.exists(target):
            raise HTTPException(status_code=404, detail="Corrected file not found on disk")
        ext = Path(target).suffix
        clean_name = f"corrected_{Path(doc.filename).stem}{ext}"
        return FileResponse(target, filename=clean_name, media_type="image/png" if ext == ".png" else "application/octet-stream")

    elif variant == "zip":
        files_to_zip = []
        if os.path.exists(doc.original_path):
            files_to_zip.append((doc.original_path, f"original_{doc.filename}"))
        if doc.corrected_path and os.path.exists(doc.corrected_path):
            ext = Path(doc.corrected_path).suffix
            files_to_zip.append((doc.corrected_path, f"corrected_{Path(doc.filename).stem}{ext}"))

        zip_buf = create_zip_archive(files_to_zip)
        return Response(
            content=zip_buf.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=docuquality_{doc.id}.zip"},
        )


@router.get("/batch/{batch_id}/zip")
def download_batch_zip(batch_id: str, db: Session = Depends(get_db)):
    """Downloads all corrected documents in a batch as a single ZIP archive."""
    docs = db.query(Document).filter(Document.batch_id == batch_id).all()
    if not docs:
        raise HTTPException(status_code=404, detail="No documents found for this batch")

    files_to_zip = []
    for d in docs:
        if d.corrected_path and os.path.exists(d.corrected_path):
            ext = Path(d.corrected_path).suffix
            files_to_zip.append((d.corrected_path, f"{Path(d.filename).stem}_corrected{ext}"))
        elif os.path.exists(d.original_path):
            files_to_zip.append((d.original_path, f"{d.filename}"))

    zip_buf = create_zip_archive(files_to_zip)
    return Response(
        content=zip_buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=batch_{batch_id}.zip"},
    )


@router.post("/{doc_id}/reprocess", response_model=DocumentDetailResponse)
def reprocess_document(
    doc_id: str,
    req: ReprocessRequest,
    db: Session = Depends(get_db),
):
    """Reprocesses an existing document with user-customized correction toggles and strengths."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    custom_options = {
        "deskew": req.deskew,
        "illumination": req.illumination,
        "denoise": req.denoise,
        "sharpen": req.sharpen,
        "autocrop": req.autocrop,
        "binarize": req.binarize,
        "clahe_clip_limit": req.clahe_clip_limit,
        "force_deskew": req.force_deskew,
        "force_illumination": req.force_illumination,
        "force_denoise": req.force_denoise,
        "force_sharpen": req.force_sharpen,
    }

    updated_doc = process_single_image(
        db=db,
        doc_id=doc.id,
        filename=doc.filename,
        image_path=doc.original_path,
        file_type=doc.file_type,
        page_no=doc.page_no,
        batch_id=doc.batch_id,
        custom_options=custom_options,
    )

    return _doc_to_detail(updated_doc)


@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """Deletes a document, its database records, and disk files."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete physical files
    try:
        if os.path.exists(doc.original_path):
            os.remove(doc.original_path)
        if doc.corrected_path and os.path.exists(doc.corrected_path):
            os.remove(doc.corrected_path)
    except Exception as e:
        print(f"Warning: Failed to delete disk files for {doc_id}: {e}")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully", "id": doc_id}
