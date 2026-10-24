import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./docuquality.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_sqlite_migrations(target_engine):
    """
    Safely adds new columns to SQLite tables if they do not already exist,
    preserving all existing records and schema integrity.
    """
    with target_engine.connect() as conn:
        try:
            # Check existing columns in 'documents' table
            result = conn.execute(text("PRAGMA table_info(documents);")).fetchall()
            existing_cols = {row[1] for row in result}

            new_columns = [
                ("preset", "VARCHAR(50) DEFAULT 'general'"),
                ("ocr_word_count_before", "INTEGER DEFAULT 0"),
                ("ocr_word_count_after", "INTEGER DEFAULT 0"),
                ("ocr_engine", "VARCHAR(100)"),
                ("ocr_message", "VARCHAR(500)"),
                ("per_step_scores_json", "TEXT"),
            ]

            for col_name, col_type in new_columns:
                if col_name not in existing_cols and len(existing_cols) > 0:
                    conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type};"))
                    conn.commit()
        except Exception as e:
            print(f"Migration note (can be ignored on fresh DB): {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
