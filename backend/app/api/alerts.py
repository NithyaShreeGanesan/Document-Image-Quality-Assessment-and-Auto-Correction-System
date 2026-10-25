from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, Document
from app.schemas import AlertResponse

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertResponse])
def get_alerts(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Returns alerts for low-quality uploads or critical processing events."""
    query = db.query(Alert)
    if unread_only:
        query = query.filter(Alert.read == False)

    alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()

    results = []
    for a in alerts:
        fname = a.document.filename if a.document else None
        results.append(
            AlertResponse(
                id=a.id,
                document_id=a.document_id,
                message=a.message,
                severity=a.severity,
                read=a.read,
                created_at=a.created_at,
                filename=fname,
            )
        )
    return results


@router.put("/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    """Marks a single alert as read."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.read = True
    db.commit()
    return {"message": "Alert marked as read", "id": alert_id}


@router.put("/mark-all-read")
def mark_all_alerts_read(db: Session = Depends(get_db)):
    """Marks all alerts as read."""
    db.query(Alert).filter(Alert.read == False).update({Alert.read: True})
    db.commit()
    return {"message": "All alerts marked as read"}
