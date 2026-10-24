import json
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from backend.app.config import load_config, save_config
from backend.app.database import get_db
from backend.app.models import Setting
from backend.app.schemas import ApplySuggestionRequest, SettingsUpdateRequest, SuggestionItem
from backend.app.services.suggestions import apply_suggestion, generate_setting_suggestions

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """Returns current active system configuration, metric weights, thresholds, and correction defaults."""
    cfg = load_config()

    # Check if DB has overrides
    db_settings = db.query(Setting).all()
    for s in db_settings:
        try:
            cfg[s.key] = json.loads(s.value_json)
        except Exception:
            pass

    return cfg


@router.put("")
def update_settings(req: SettingsUpdateRequest, db: Session = Depends(get_db)):
    """
    Updates metric weights, threshold boundaries, classification scores,
    and correction defaults. Persists to both config.yaml and the database.
    """
    cfg = load_config()

    if req.weights:
        cfg["weights"] = {**cfg.get("weights", {}), **req.weights}
        _upsert_db_setting(db, "weights", cfg["weights"])

    if req.thresholds:
        cfg["thresholds"] = {**cfg.get("thresholds", {}), **req.thresholds}
        _upsert_db_setting(db, "thresholds", cfg["thresholds"])

    if req.classification:
        cfg["classification"] = {**cfg.get("classification", {}), **req.classification}
        _upsert_db_setting(db, "classification", cfg["classification"])

    if req.corrections:
        cfg["corrections"] = {**cfg.get("corrections", {}), **req.corrections}
        _upsert_db_setting(db, "corrections", cfg["corrections"])

    db.commit()
    save_config(cfg)

    return {"message": "Settings updated successfully", "settings": cfg}


@router.get("/presets")
def get_presets(db: Session = Depends(get_db)):
    """Returns all document-type presets and their configured weights/thresholds."""
    from backend.app.services.presets import BUILTIN_PRESETS

    presets_list = []
    for pid, pdata in BUILTIN_PRESETS.items():
        item = {**pdata}
        # Check if DB has overrides
        db_s = db.query(Setting).filter(Setting.key == f"preset_{pid}").first()
        if db_s:
            try:
                overrides = json.loads(db_s.value_json)
                item = {**item, **overrides}
            except Exception:
                pass
        presets_list.append(item)
    return presets_list


@router.put("/presets/{preset_id}")
def update_preset(preset_id: str, updates: Dict[str, Any], db: Session = Depends(get_db)):
    """Updates a specific document-type preset configuration."""
    from backend.app.services.presets import BUILTIN_PRESETS

    pid = preset_id.lower().strip()
    if pid not in BUILTIN_PRESETS:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")

    target = {**BUILTIN_PRESETS[pid]}
    db_s = db.query(Setting).filter(Setting.key == f"preset_{pid}").first()
    if db_s:
        try:
            target = {**target, **json.loads(db_s.value_json)}
        except Exception:
            pass

    # Merge updates
    if "weights" in updates:
        target["weights"] = {**target.get("weights", {}), **updates["weights"]}
    if "classification" in updates:
        target["classification"] = {**target.get("classification", {}), **updates["classification"]}
    if "corrections" in updates:
        target["corrections"] = {**target.get("corrections", {}), **updates["corrections"]}

    _upsert_db_setting(db, f"preset_{pid}", target)
    db.commit()

    # Also update in-memory BUILTIN_PRESETS for immediate usage in current process
    BUILTIN_PRESETS[pid] = target

    return {"message": f"Preset '{pid}' updated successfully", "preset": target}


def _upsert_db_setting(db: Session, key: str, value: Any):
    s = db.query(Setting).filter(Setting.key == key).first()
    if not s:
        s = Setting(key=key, value_json=json.dumps(value))
        db.add(s)
    else:
        s.value_json = json.dumps(value)


@router.get("/suggestions", response_model=List[SuggestionItem])
def get_adaptive_suggestions(db: Session = Depends(get_db)):
    """
    Returns automated parameter recommendations and calibrations based on
    analyzing user ratings, negative feedback comments, and document failure rates.
    """
    return generate_setting_suggestions(db)


@router.post("/suggestions/apply")
def apply_adaptive_suggestion(req: ApplySuggestionRequest, db: Session = Depends(get_db)):
    """
    Applies a recommended calibration parameter set to config or document preset.
    """
    try:
        res = apply_suggestion(
            suggestion_id=req.suggestion_id,
            parameters=req.parameters,
            target_type=req.target_type,
            preset_id=req.preset_id,
            db=db,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


