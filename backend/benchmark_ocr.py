import csv
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
WORKSPACE_DIR = BACKEND_DIR.parent
if str(WORKSPACE_DIR) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_DIR))

from app.config import load_config
from app.services.assessment import assess_document_image
from app.services.correction import auto_correct_document
from app.services.ocr_service import evaluate_ocr, get_tesseract_status
from app.services.storage import extract_pages_from_pdf, load_image_from_file

SAMPLE_DATA_DIR = WORKSPACE_DIR / "sample_data"
CSV_EXPORT_PATH = WORKSPACE_DIR / "ocr_benchmark_results.csv"
BACKEND_CSV_PATH = WORKSPACE_DIR / "backend" / "ocr_benchmark_results.csv"


def run_benchmark() -> List[Dict[str, Any]]:
    config = load_config()
    is_tess, tess_path, tess_msg = get_tesseract_status()

    print("=" * 80)
    print("DOCUQUALITY OCR ACCURACY & RESTORATION BENCHMARK")
    print(f"Tesseract Status: {'Available (' + str(tess_path) + ')' if is_tess else 'Fallback (CV Readability Estimator)'}")
    print(f"Sample Directory: {SAMPLE_DATA_DIR}")
    print("=" * 80)

    if not SAMPLE_DATA_DIR.exists():
        print(f"Error: Sample data directory {SAMPLE_DATA_DIR} does not exist.")
        return []

    results: List[Dict[str, Any]] = []
    files = sorted([f for f in SAMPLE_DATA_DIR.iterdir() if not f.name.startswith("temp_")])

    for f in files:
        ext = f.suffix.lower()
        if ext in (".png", ".jpg", ".jpeg", ".tif", ".tiff"):
            images_to_test = [(f.name, load_image_from_file(str(f)))]
        elif ext == ".pdf":
            extracted = extract_pages_from_pdf(str(f))
            images_to_test = [(f"{f.stem}_p{p_no}.png", img) for p_no, img, _ in extracted]
        else:
            continue

        for item_name, img in images_to_test:
            # 1. Assessment & OCR Before
            assess_before = assess_document_image(img, config)
            ocr_before = evaluate_ocr(img)

            # 2. Targeted Auto-Correction
            corrected_img, applied_corrections, assess_after = auto_correct_document(
                img,
                assess_before,
                config,
            )

            # 3. OCR After
            ocr_after = evaluate_ocr(corrected_img)

            score_before = assess_before["overall_score"]
            score_after = assess_after["overall_score"]
            score_delta = round(score_after - score_before, 1)

            conf_before = ocr_before["confidence"]
            conf_after = ocr_after["confidence"]
            conf_gain = round(conf_after - conf_before, 1)

            words_b = ocr_before.get("word_count", 0)
            words_a = ocr_after.get("word_count", 0)
            words_recovered = max(0, words_a - words_b)

            applied_step_names = [c["step_name"] for c in applied_corrections]

            results.append({
                "filename": item_name,
                "quality_score_before": score_before,
                "quality_score_after": score_after,
                "quality_delta": score_delta,
                "ocr_confidence_before": conf_before,
                "ocr_confidence_after": conf_after,
                "ocr_confidence_gain": conf_gain,
                "words_recovered": words_recovered,
                "words_before": words_b,
                "words_after": words_a,
                "applied_corrections": ", ".join(applied_step_names) if applied_step_names else "None",
                "ocr_engine": ocr_after.get("engine", "N/A"),
            })

    # Print formatted table
    header = (
        f"{'Filename':<32} | "
        f"{'Quality B->A':<14} | "
        f"{'Q-Delta':<8} | "
        f"{'OCR Conf B->A':<15} | "
        f"{'OCR Gain':<9} | "
        f"{'Words Rec':<10}"
    )
    print(header)
    print("-" * len(header))

    for r in results:
        q_str = f"{r['quality_score_before']:.1f} -> {r['quality_score_after']:.1f}"
        ocr_str = f"{r['ocr_confidence_before']:.1f}% -> {r['ocr_confidence_after']:.1f}%"
        print(
            f"{r['filename']:<32} | "
            f"{q_str:<14} | "
            f"{r['quality_delta']:<+8.1f} | "
            f"{ocr_str:<15} | "
            f"{r['ocr_confidence_gain']:<+9.1f} | "
            f"{r['words_recovered']:<10}"
        )

    # Export to CSV
    fieldnames = [
        "filename",
        "quality_score_before",
        "quality_score_after",
        "quality_delta",
        "ocr_confidence_before",
        "ocr_confidence_after",
        "ocr_confidence_gain",
        "words_recovered",
        "words_before",
        "words_after",
        "applied_corrections",
        "ocr_engine",
    ]

    for export_file in [CSV_EXPORT_PATH, BACKEND_CSV_PATH]:
        with open(export_file, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)
        print(f"\n[Exported CSV to: {export_file}]")

    return results


if __name__ == "__main__":
    run_benchmark()
