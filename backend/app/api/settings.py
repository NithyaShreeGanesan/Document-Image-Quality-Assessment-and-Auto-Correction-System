import json
from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.config import load_config, save_config
from backend.app.database import get_db
from backend.app.models import Setting
from backend.app.schemas import SettingsUpdateRequest

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


def _upsert_db_setting(db: Session, key: str, value: Any):
    s = db.query(Setting).filter(Setting.key == key).first()
    if not s:
        s = Setting(key=key, value_json=json.dumps(value))
        db.add(s)
    else:
        s.value_json = json.dumps(value)
