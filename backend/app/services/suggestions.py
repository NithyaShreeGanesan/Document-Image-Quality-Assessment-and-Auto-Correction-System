import json
from collections import Counter
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.config import load_config, save_config
from backend.app.models import Assessment, Document, Feedback, Setting
from backend.app.services.presets import BUILTIN_PRESETS


def generate_setting_suggestions(db: Session) -> List[Dict[str, Any]]:
    """
    Analyzes accumulated user feedback, failure rates, defect frequencies,
    and low-scoring documents to generate adaptive calibration suggestions.
    """
    suggestions: List[Dict[str, Any]] = []

    # 1. Fetch data
    feedbacks = db.query(Feedback).all()
    docs = db.query(Document).all()
    assessments_after = db.query(Assessment).filter(Assessment.stage == "after").all()
    assessments_before = db.query(Assessment).filter(Assessment.stage == "before").all()

    total_fb = len(feedbacks)
    negative_fb = [f for f in feedbacks if f.rating == "thumbs_down"]
    total_docs = len(docs)

    # Disliked steps tally
    disliked_counter = Counter()
    comments = []
    for f in negative_fb:
        if f.comment:
            comments.append(f.comment.lower())
        if f.disliked_steps_json:
            try:
                for step in json.loads(f.disliked_steps_json):
                    disliked_counter[step] += 1
            except Exception:
                pass

    # Check current config
    cfg = load_config()
    cur_clahe = cfg.get("corrections", {}).get("clahe_clip_limit", 2.0)
    cur_denoise_factor = cfg.get("corrections", {}).get("denoise_strength_factor", 1.0)
    cur_blur_thresh = cfg.get("thresholds", {}).get("blur", {}).get("laplacian_critical", 50.0)
    cur_pass_score = cfg.get("classification", {}).get("pass_score", 80.0)

    # Suggestion 1: CLAHE / Contrast tuning if contrast or binarization was disliked
    contrast_dislikes = disliked_counter.get("illumination", 0) + disliked_counter.get("binarize", 0) + disliked_counter.get("binarization", 0)
    has_contrast_comment = any(
        any(k in c for k in ["contrast", "harsh", "aggressive", "black", "dark", "stamp"])
        for c in comments
    )
    if (contrast_dislikes > 0 or has_contrast_comment or (total_fb > 0 and len(negative_fb) / total_fb > 0.2)) and cur_clahe > 1.5:
        suggestions.append({
            "id": "clahe_clip_limit_tune",
            "title": "Calibrate CLAHE Contrast Limit",
            "category": "contrast",
            "severity": "recommended",
            "impact": "Softens excessive local contrast and prevents text halo artifacts",
            "description": f"User feedback flagged aggressive illumination/binarization. Lower CLAHE clip limit from {cur_clahe} to 1.5 to preserve subtle gradients without over-amplifying noise.",
            "target_type": "config",
            "parameters": {
                "corrections": {"clahe_clip_limit": 1.5}
            },
            "reason": f"{contrast_dislikes} negative feedback tag(s) on illumination/binarization",
        })

    # Suggestion 2: Denoise over-smoothing tuning
    denoise_dislikes = disliked_counter.get("denoise", 0)
    has_smoothing_comment = any(
        any(k in c for k in ["smooth", "blur", "smear", "fuzzy", "soft"])
        for c in comments
    )
    if (denoise_dislikes > 0 or has_smoothing_comment) and cur_denoise_factor > 0.7:
        suggestions.append({
            "id": "denoise_strength_tune",
            "title": "Reduce Denoise Filtering Strength",
            "category": "denoise",
            "severity": "recommended",
            "impact": "Preserves thin strokes, fine serif fonts, and official stamp details",
            "description": f"Feedback reported text smoothing or fuzzy strokes. Decreasing denoise strength factor from {cur_denoise_factor} to 0.7 prevents edge degradation during bilateral filtering.",
            "target_type": "config",
            "parameters": {
                "corrections": {"denoise_strength_factor": 0.7}
            },
            "reason": f"{denoise_dislikes} negative feedback tag(s) citing over-smoothed text",
        })

    # Suggestion 3: Receipt Preset contrast & binarization tuning
    receipt_docs = [d for d in docs if d.preset == "receipt"]
    receipt_negative = [
        f for f in negative_fb
        if any(d.id == f.document_id for d in receipt_docs)
    ]
    receipt_preset = BUILTIN_PRESETS.get("receipt", {})
    if len(receipt_negative) > 0 or (len(receipt_docs) >= 2 and any(d.status in ("fail", "needs_correction") for d in receipt_docs)):
        suggestions.append({
            "id": "receipt_preset_tune",
            "title": "Optimize Receipt Preset Thresholds",
            "category": "preset",
            "severity": "optimization",
            "impact": "Improves thermal paper character recovery and suppresses receipt creases",
            "description": "Faint thermal receipt scans benefit from higher contrast sensitivity (weight 0.25) and targeted illumination enhancement.",
            "target_type": "preset",
            "preset_id": "receipt",
            "parameters": {
                "weights": {"contrast": 0.25, "brightness": 0.20, "noise": 0.15},
                "corrections": {"illumination_enabled": True, "ocr_binarization": True}
            },
            "reason": f"Low quality or negative feedback detected on {len(receipt_docs)} processed receipt(s)",
        })

    # Suggestion 4: Relax blur threshold for mobile captures if blur is dominant defect
    blur_defects_count = 0
    for a in assessments_before:
        if a.blur_status in ("warning", "critical"):
            blur_defects_count += 1
    if total_docs > 0 and (blur_defects_count / total_docs >= 0.3) and cur_blur_thresh >= 50.0:
        suggestions.append({
            "id": "blur_threshold_relax",
            "title": "Calibrate Mobile Capture Blur Tolerance",
            "category": "threshold",
            "severity": "optimization",
            "impact": "Decreases false-positive blur rejections on hand-held mobile document photos",
            "description": f"{round((blur_defects_count / total_docs) * 100)}% of uploads trigger blur warnings. Relaxing Laplacian critical threshold from {cur_blur_thresh} to 40.0 reduces unnecessary rescan flags on legible mobile photos.",
            "target_type": "config",
            "parameters": {
                "thresholds": {"blur": {"laplacian_critical": 40.0}}
            },
            "reason": f"{blur_defects_count} document(s) flagged with blur defect warnings",
        })

    # Suggestion 5: Classification pass score calibration if pass rate is low
    pass_count = sum(1 for a in assessments_after if a.classification == "Pass")
    if total_docs >= 3 and (pass_count / total_docs < 0.6) and cur_pass_score > 75.0:
        suggestions.append({
            "id": "classification_threshold_calibrate",
            "title": "Calibrate Quality Pass Threshold",
            "category": "classification",
            "severity": "recommended",
            "impact": "Aligns delivery standards with real-world document ingestion workflows",
            "description": f"Current overall pass rate is {round((pass_count / total_docs) * 100)}%. Calibrating pass threshold from {cur_pass_score} to 75.0 allows satisfactorily restored documents to proceed without manual operator triage.",
            "target_type": "config",
            "parameters": {
                "classification": {"pass_score": 75.0, "min_subscore_pass": 45.0}
            },
            "reason": f"Only {pass_count} of {total_docs} document(s) met current {cur_pass_score} pass threshold",
        })

    # Suggestion 6: Always offer ID Card preset sharpening optimization if ID cards exist
    id_docs = [d for d in docs if d.preset == "id_card"]
    if len(id_docs) > 0:
        suggestions.append({
            "id": "id_card_sharpen_tune",
            "title": "Boost ID Card Fine Text Sharpness",
            "category": "preset",
            "severity": "optimization",
            "impact": "Maximizes OCR accuracy on tiny date-of-birth and ID number micro-print",
            "description": "ID cards feature microprint and security patterns. Increasing sharpen weighting to 0.25 and forcing sharpening ensures high OCR legibility.",
            "target_type": "preset",
            "preset_id": "id_card",
            "parameters": {
                "weights": {"blur": 0.25, "resolution": 0.25},
                "corrections": {"sharpen_enabled": True}
            },
            "reason": f"Active ID card scans detected in archive ({len(id_docs)} files)",
        })

    # Fallback default suggestions if archive is fresh or has few feedbacks
    if len(suggestions) == 0:
        suggestions.append({
            "id": "clahe_clip_limit_tune",
            "title": "Calibrate CLAHE Contrast Limit",
            "category": "contrast",
            "severity": "recommended",
            "impact": "Softens excessive local contrast and prevents text halo artifacts",
            "description": "Standardize CLAHE contrast limit to 1.8 for balanced illumination correction across diverse lighting environments.",
            "target_type": "config",
            "parameters": {
                "corrections": {"clahe_clip_limit": 1.8}
            },
            "reason": "Proactive calibration for enhanced OCR readability",
        })
        suggestions.append({
            "id": "blur_threshold_relax",
            "title": "Calibrate Mobile Capture Blur Tolerance",
            "category": "threshold",
            "severity": "optimization",
            "impact": "Decreases false-positive blur rejections on hand-held mobile document photos",
            "description": "Adjust Laplacian critical threshold from 50.0 to 45.0 to accommodate smartphone lens focus falloff.",
            "target_type": "config",
            "parameters": {
                "thresholds": {"blur": {"laplacian_critical": 45.0}}
            },
            "reason": "Optimized mobile capture profile",
        })

    return suggestions


def apply_suggestion(
    suggestion_id: str,
    parameters: Dict[str, Any],
    target_type: str,
    preset_id: Optional[str],
    db: Session,
) -> Dict[str, Any]:
    """
    Applies the suggested adjustments to the system configuration or presets,
    persisting to disk and SQLite settings table.
    """
    if target_type == "preset" and preset_id:
        pid = preset_id.lower().strip()
        if pid not in BUILTIN_PRESETS:
            raise ValueError(f"Preset '{preset_id}' not found")

        target = {**BUILTIN_PRESETS[pid]}
        db_s = db.query(Setting).filter(Setting.key == f"preset_{pid}").first()
        if db_s:
            try:
                target = {**target, **json.loads(db_s.value_json)}
            except Exception:
                pass

        for key, val in parameters.items():
            if isinstance(val, dict) and isinstance(target.get(key), dict):
                target[key] = {**target[key], **val}
            else:
                target[key] = val

        if not db_s:
            db_s = Setting(key=f"preset_{pid}", value_json=json.dumps(target))
            db.add(db_s)
        else:
            db_s.value_json = json.dumps(target)

        db.commit()
        BUILTIN_PRESETS[pid] = target
        return {
            "status": "applied",
            "suggestion_id": suggestion_id,
            "target": f"preset_{pid}",
            "updated_preset": target,
        }

    # Otherwise config
    cfg = load_config()
    for section, val in parameters.items():
        if isinstance(val, dict) and isinstance(cfg.get(section), dict):
            cfg[section] = {**cfg[section], **val}
        else:
            cfg[section] = val

        db_s = db.query(Setting).filter(Setting.key == section).first()
        if not db_s:
            db_s = Setting(key=section, value_json=json.dumps(cfg[section]))
            db.add(db_s)
        else:
            db_s.value_json = json.dumps(cfg[section])

    db.commit()
    save_config(cfg)

    return {
        "status": "applied",
        "suggestion_id": suggestion_id,
        "target": "config",
        "updated_config": cfg,
    }
