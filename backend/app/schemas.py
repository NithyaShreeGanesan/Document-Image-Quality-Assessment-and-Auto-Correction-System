import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DefectItem(BaseModel):
    metric: str
    label: str
    raw_value: float
    unit: str
    sub_score: float
    status: str  # good, warning, critical
    explanation: str
    extra: Optional[Dict[str, Any]] = None


class AssessmentResponse(BaseModel):
    stage: str
    overall_score: float
    classification: str
    blur_score: float
    blur_raw: float
    blur_status: str
    skew_score: float
    skew_angle: float
    skew_status: str
    brightness_score: float
    brightness_raw: float
    brightness_status: str
    contrast_score: float
    contrast_raw: float
    contrast_status: str
    noise_score: float
    noise_raw: float
    noise_status: str
    resolution_score: float
    resolution_dpi: float
    resolution_status: str
    defects: List[DefectItem] = []
    improvement_delta: Optional[float] = None


class CorrectionItem(BaseModel):
    step_name: str
    order: int
    params: Optional[Dict[str, Any]] = None
    applied: bool = True
    description: Optional[str] = None


class DocumentDetailResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    page_no: int
    batch_id: Optional[str] = None
    status: str
    preset: Optional[str] = "general"
    created_at: datetime.datetime
    original_url: str
    corrected_url: Optional[str] = None
    before_assessment: Optional[AssessmentResponse] = None
    after_assessment: Optional[AssessmentResponse] = None
    applied_corrections: List[CorrectionItem] = []
    ocr_confidence_before: Optional[float] = None
    ocr_confidence_after: Optional[float] = None
    ocr_word_count_before: Optional[int] = 0
    ocr_word_count_after: Optional[int] = 0
    ocr_words_recovered: Optional[int] = 0
    ocr_text_before: Optional[str] = None
    ocr_text_after: Optional[str] = None
    ocr_engine: Optional[str] = None
    ocr_message: Optional[str] = None


class DocumentSummaryResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    page_no: int
    batch_id: Optional[str] = None
    status: str
    created_at: datetime.datetime
    thumbnail_url: str
    score_before: Optional[float] = None
    score_after: Optional[float] = None
    improvement: Optional[float] = None
    classification: Optional[str] = None
    top_defects: List[str] = []


class PaginatedDocumentsResponse(BaseModel):
    items: List[DocumentSummaryResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class ReprocessRequest(BaseModel):
    deskew: bool = True
    illumination: bool = True
    denoise: bool = True
    sharpen: bool = True
    autocrop: bool = False
    binarize: bool = False
    clahe_clip_limit: Optional[float] = 2.0
    force_deskew: Optional[bool] = False
    force_illumination: Optional[bool] = False
    force_denoise: Optional[bool] = False
    force_sharpen: Optional[bool] = False


class AlertResponse(BaseModel):
    id: int
    document_id: Optional[str] = None
    message: str
    severity: str
    read: bool
    created_at: datetime.datetime
    filename: Optional[str] = None


class AnalyticsSummaryResponse(BaseModel):
    total_documents: int
    pass_count: int
    needs_correction_count: int
    fail_count: int
    pass_rate: float
    avg_score_before: float
    avg_score_after: float
    avg_improvement: float
    avg_ocr_confidence_before: float = 0.0
    avg_ocr_confidence_after: float = 0.0
    avg_ocr_confidence_gain: float = 0.0
    total_words_recovered: int = 0
    most_common_defects: List[Dict[str, Any]]


class AnalyticsTrendPoint(BaseModel):
    date: str
    count: int
    avg_score_before: float
    avg_score_after: float
    avg_ocr_confidence_before: float = 0.0
    avg_ocr_confidence_after: float = 0.0
    pass_count: int
    needs_correction_count: int
    fail_count: int


class SettingsUpdateRequest(BaseModel):
    weights: Optional[Dict[str, float]] = None
    thresholds: Optional[Dict[str, Any]] = None
    classification: Optional[Dict[str, float]] = None
    corrections: Optional[Dict[str, Any]] = None
