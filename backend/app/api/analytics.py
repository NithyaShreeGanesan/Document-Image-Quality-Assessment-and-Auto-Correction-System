import json
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Assessment, Document, Feedback
from backend.app.schemas import AnalyticsSummaryResponse, AnalyticsTrendPoint, UserSatisfactionResponse

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Returns analytics KPIs:
    - Total documents
    - Pass / Needs Correction / Fail counts and pass rate
    - Average score before vs. after and average improvement
    - Most common defects with frequencies
    """
    total = db.query(Document).count()
    if total == 0:
        return AnalyticsSummaryResponse(
            total_documents=0,
            pass_count=0,
            needs_correction_count=0,
            fail_count=0,
            pass_rate=0.0,
            avg_score_before=0.0,
            avg_score_after=0.0,
            avg_improvement=0.0,
            most_common_defects=[],
        )

    # Classifications based on after stage (or before if after doesn't exist)
    assessments_after = db.query(Assessment).filter(Assessment.stage == "after").all()
    assessments_before = db.query(Assessment).filter(Assessment.stage == "before").all()

    pass_count = sum(1 for a in assessments_after if a.classification == "Pass")
    needs_corr_count = sum(1 for a in assessments_after if a.classification == "Needs Correction")
    fail_count = sum(1 for a in assessments_after if a.classification == "Fail")

    pass_rate = round((pass_count / total) * 100.0, 1) if total > 0 else 0.0

    scores_b = [a.overall_score for a in assessments_before]
    scores_a = [a.overall_score for a in assessments_after]

    avg_b = round(sum(scores_b) / len(scores_b), 1) if scores_b else 0.0
    avg_a = round(sum(scores_a) / len(scores_a), 1) if scores_a else 0.0
    avg_imp = round(avg_a - avg_b, 1)

    # Count defects across all 'before' assessments
    defect_counter = Counter()
    for a in assessments_before:
        if a.defects_json:
            try:
                defects = json.loads(a.defects_json)
                for d in defects:
                    if d.get("status") in ("warning", "critical"):
                        defect_counter[d.get("label", d.get("metric", "Unknown"))] += 1
            except Exception:
                pass

    most_common = [
        {"name": label, "count": count, "percentage": round((count / total) * 100.0, 1)}
        for label, count in defect_counter.most_common(6)
    ]

    # OCR calculations
    docs_all = db.query(Document).all()
    ocr_confs_b = [d.ocr_confidence_before for d in docs_all if d.ocr_confidence_before is not None]
    ocr_confs_a = [d.ocr_confidence_after for d in docs_all if d.ocr_confidence_after is not None]
    avg_ocr_b = round(sum(ocr_confs_b) / len(ocr_confs_b), 1) if ocr_confs_b else 0.0
    avg_ocr_a = round(sum(ocr_confs_a) / len(ocr_confs_a), 1) if ocr_confs_a else 0.0
    avg_ocr_gain = round(avg_ocr_a - avg_ocr_b, 1)

    words_rec_list = [
        max(0, (d.ocr_word_count_after or 0) - (d.ocr_word_count_before or 0))
        for d in docs_all
    ]
    tot_words_rec = sum(words_rec_list)

    return AnalyticsSummaryResponse(
        total_documents=total,
        pass_count=pass_count,
        needs_correction_count=needs_corr_count,
        fail_count=fail_count,
        pass_rate=pass_rate,
        avg_score_before=avg_b,
        avg_score_after=avg_a,
        avg_improvement=avg_imp,
        avg_ocr_confidence_before=avg_ocr_b,
        avg_ocr_confidence_after=avg_ocr_a,
        avg_ocr_confidence_gain=avg_ocr_gain,
        total_words_recovered=tot_words_rec,
        most_common_defects=most_common,
    )


@router.get("/trends", response_model=List[AnalyticsTrendPoint])
def get_analytics_trends(days: int = 14, db: Session = Depends(get_db)):
    """
    Returns daily quality trends: average score before/after and counts by status.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    docs = db.query(Document).filter(Document.created_at >= cutoff).order_by(Document.created_at).all()

    # Group by date YYYY-MM-DD
    grouped: Dict[str, Dict[str, Any]] = {}
    for d in docs:
        date_str = d.created_at.strftime("%Y-%m-%d")
        if date_str not in grouped:
            grouped[date_str] = {
                "date": date_str,
                "count": 0,
                "scores_before": [],
                "scores_after": [],
                "pass": 0,
                "needs_corr": 0,
                "fail": 0,
            }

        grouped[date_str]["count"] += 1
        b_rec = next((a for a in d.assessments if a.stage == "before"), None)
        a_rec = next((a for a in d.assessments if a.stage == "after"), None)

        if "ocr_b" not in grouped[date_str]:
            grouped[date_str]["ocr_b"] = []
            grouped[date_str]["ocr_a"] = []

        if d.ocr_confidence_before is not None:
            grouped[date_str]["ocr_b"].append(d.ocr_confidence_before)
        if d.ocr_confidence_after is not None:
            grouped[date_str]["ocr_a"].append(d.ocr_confidence_after)

        if b_rec:
            grouped[date_str]["scores_before"].append(b_rec.overall_score)
        if a_rec:
            grouped[date_str]["scores_after"].append(a_rec.overall_score)
            if a_rec.classification == "Pass":
                grouped[date_str]["pass"] += 1
            elif a_rec.classification == "Needs Correction":
                grouped[date_str]["needs_corr"] += 1
            else:
                grouped[date_str]["fail"] += 1

    trend_points: List[AnalyticsTrendPoint] = []
    for date_str in sorted(grouped.keys()):
        data = grouped[date_str]
        b_arr = data["scores_before"]
        a_arr = data["scores_after"]
        ob_arr = data.get("ocr_b", [])
        oa_arr = data.get("ocr_a", [])
        trend_points.append(
            AnalyticsTrendPoint(
                date=date_str,
                count=data["count"],
                avg_score_before=round(sum(b_arr) / len(b_arr), 1) if b_arr else 0.0,
                avg_score_after=round(sum(a_arr) / len(a_arr), 1) if a_arr else 0.0,
                avg_ocr_confidence_before=round(sum(ob_arr) / len(ob_arr), 1) if ob_arr else 0.0,
                avg_ocr_confidence_after=round(sum(oa_arr) / len(oa_arr), 1) if oa_arr else 0.0,
                pass_count=data["pass"],
                needs_correction_count=data["needs_corr"],
                fail_count=data["fail"],
            )
        )

    return trend_points


@router.get("/feedback", response_model=UserSatisfactionResponse)
def get_feedback_analytics(db: Session = Depends(get_db)):
    """
    Returns aggregate user satisfaction metrics:
    - thumbs_up count & percentage
    - thumbs_down count & percentage
    - satisfaction rate
    - most frequently disliked correction steps
    - recent feedback list
    """
    all_fb = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    total = len(all_fb)
    if total == 0:
        return UserSatisfactionResponse(
            total_feedback=0,
            thumbs_up_count=0,
            thumbs_down_count=0,
            satisfaction_rate=0.0,
            most_disliked_steps=[],
            recent_feedback=[],
        )

    up_count = sum(1 for f in all_fb if f.rating == "thumbs_up")
    down_count = sum(1 for f in all_fb if f.rating == "thumbs_down")
    satisfaction_rate = round((up_count / total) * 100.0, 1) if total > 0 else 0.0

    step_counter = Counter()
    for f in all_fb:
        if f.disliked_steps_json:
            try:
                steps = json.loads(f.disliked_steps_json)
                for s in steps:
                    step_counter[s] += 1
            except Exception:
                pass

    most_disliked = [
        {"step": step, "count": count, "percentage": round((count / max(1, down_count)) * 100.0, 1)}
        for step, count in step_counter.most_common()
    ]

    recent = []
    for f in all_fb[:10]:
        disliked = []
        if f.disliked_steps_json:
            try:
                disliked = json.loads(f.disliked_steps_json)
            except Exception:
                pass
        recent.append({
            "id": f.id,
            "document_id": f.document_id,
            "rating": f.rating,
            "comment": f.comment,
            "disliked_steps": disliked,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })

    return UserSatisfactionResponse(
        total_feedback=total,
        thumbs_up_count=up_count,
        thumbs_down_count=down_count,
        satisfaction_rate=satisfaction_rate,
        most_disliked_steps=most_disliked,
        recent_feedback=recent,
    )

