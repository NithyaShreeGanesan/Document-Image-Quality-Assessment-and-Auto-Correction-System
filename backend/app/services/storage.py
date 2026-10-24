import io
import os
from pathlib import Path
from typing import List, Optional, Tuple
import zipfile
import cv2
import pymupdf as fitz
import numpy as np
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
ORIGINALS_DIR = UPLOAD_DIR / "originals"
CORRECTED_DIR = UPLOAD_DIR / "corrected"

for d in [UPLOAD_DIR, ORIGINALS_DIR, CORRECTED_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def save_uploaded_bytes(file_bytes: bytes, filename: str, doc_id: str) -> str:
    """Saves raw uploaded file to originals directory."""
    ext = Path(filename).suffix.lower()
    dest_path = ORIGINALS_DIR / f"{doc_id}_orig{ext}"
    with open(dest_path, "wb") as f:
        f.write(file_bytes)
    return str(dest_path)


def load_image_from_file(file_path: str) -> np.ndarray:
    """Loads an image into BGR numpy array using cv2 or PIL."""
    # Handle Windows paths and unicode safely
    img = cv2.imdecode(np.fromfile(file_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is not None:
        return img
    # Fallback to PIL
    pil_img = Image.open(file_path).convert("RGB")
    rgb = np.array(pil_img)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def extract_pages_from_pdf(pdf_path: str, dpi: int = 200) -> List[Tuple[int, np.ndarray, str]]:
    """
    Renders each page of a multi-page PDF into a BGR numpy image.
    Returns list of (page_number, image_array, saved_page_path).
    """
    doc = fitz.open(pdf_path)
    pages: List[Tuple[int, np.ndarray, str]] = []

    # Render matrix for target DPI (standard PDF is 72 dpi)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)

    base_name = Path(pdf_path).stem

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_data = pix.tobytes("png")
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        page_file = ORIGINALS_DIR / f"{base_name}_page_{page_idx + 1}.png"
        cv2.imwrite(str(page_file), img)
        pages.append((page_idx + 1, img, str(page_file)))

    doc.close()
    return pages


def save_corrected_image(image: np.ndarray, doc_id: str, orig_filename: str) -> str:
    """Saves corrected image as PNG to preserve visual quality."""
    dest_path = CORRECTED_DIR / f"{doc_id}_corrected.png"
    # cv2.imencode + tofile for Windows Unicode safety
    _, buf = cv2.imencode(".png", image)
    buf.tofile(str(dest_path))
    return str(dest_path)


def create_corrected_pdf_from_images(image_paths: List[str], output_pdf_path: str) -> str:
    """Combines multiple corrected page images into a single clean PDF."""
    doc = fitz.open()
    for img_path in image_paths:
        img = fitz.open(img_path)
        rect = img[0].rect
        pdf_bytes = img.convert_to_pdf()
        img.close()
        img_pdf = fitz.open("pdf", pdf_bytes)
        page = doc.new_page(width=rect.width, height=rect.height)
        page.show_pdf_page(rect, img_pdf, 0)
        img_pdf.close()

    doc.save(output_pdf_path)
    doc.close()
    return output_pdf_path


def create_zip_archive(files_to_zip: List[Tuple[str, str]]) -> io.BytesIO:
    """
    Creates an in-memory ZIP archive from a list of (real_file_path, arcname_in_zip).
    """
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for real_path, arcname in files_to_zip:
            if os.path.exists(real_path):
                zf.write(real_path, arcname)
    zip_buffer.seek(0)
    return zip_buffer
