import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    documents = relationship("Document", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    page_no = Column(Integer, default=1)
    batch_id = Column(String(36), index=True, nullable=True)
    original_path = Column(String(500), nullable=False)
    corrected_path = Column(String(500), nullable=True)
    status = Column(String(30), default="processing")  # processing, pass, needs_correction, fail, error
    preset = Column(String(50), default="general", nullable=True)
    ocr_confidence_before = Column(Float, nullable=True)
    ocr_confidence_after = Column(Float, nullable=True)
    ocr_word_count_before = Column(Integer, default=0, nullable=True)
    ocr_word_count_after = Column(Integer, default=0, nullable=True)
    ocr_text_before = Column(Text, nullable=True)
    ocr_text_after = Column(Text, nullable=True)
    ocr_engine = Column(String(100), nullable=True)
    ocr_message = Column(String(500), nullable=True)
    per_step_scores_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="documents")
    assessments = relationship("Assessment", back_populates="document", cascade="all, delete-orphan")
    corrections = relationship("Correction", back_populates="document", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="document", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="document", cascade="all, delete-orphan")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(10), nullable=False)  # 'before' or 'after'
    overall_score = Column(Float, nullable=False)
    
    blur_score = Column(Float, nullable=False)
    blur_raw = Column(Float, nullable=False)
    blur_status = Column(String(20), default="good")

    skew_score = Column(Float, nullable=False)
    skew_angle = Column(Float, nullable=False)
    skew_status = Column(String(20), default="good")

    brightness_score = Column(Float, nullable=False)
    brightness_raw = Column(Float, nullable=False)
    brightness_status = Column(String(20), default="good")

    contrast_score = Column(Float, nullable=False)
    contrast_raw = Column(Float, nullable=False)
    contrast_status = Column(String(20), default="good")

    noise_score = Column(Float, nullable=False)
    noise_raw = Column(Float, nullable=False)
    noise_status = Column(String(20), default="good")

    resolution_score = Column(Float, nullable=False)
    resolution_dpi = Column(Float, nullable=False)
    resolution_status = Column(String(20), default="good")

    glare_score = Column(Float, nullable=True, default=100.0)
    glare_raw = Column(Float, nullable=True, default=0.0)
    cutoff_score = Column(Float, nullable=True, default=100.0)
    orientation_angle = Column(Integer, nullable=True, default=0)
    rescan_recommended = Column(Boolean, nullable=True, default=False)
    rescan_guidance_json = Column(Text, nullable=True)

    classification = Column(String(30), nullable=False)  # Pass, Needs Correction, Fail
    defects_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


    document = relationship("Document", back_populates="assessments")


class Correction(Base):
    __tablename__ = "corrections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    step_name = Column(String(50), nullable=False)  # deskew, illumination, denoise, sharpen, autocrop, binarization
    params_json = Column(Text, nullable=True)
    applied = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    description = Column(Text, nullable=True)

    document = relationship("Document", back_populates="corrections")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    message = Column(String(500), nullable=False)
    severity = Column(String(20), default="warning")  # warning, critical, info
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="alerts")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value_json = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    rating = Column(String(20), nullable=False)  # 'thumbs_up' or 'thumbs_down'
    comment = Column(Text, nullable=True)
    disliked_steps_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="feedback")
