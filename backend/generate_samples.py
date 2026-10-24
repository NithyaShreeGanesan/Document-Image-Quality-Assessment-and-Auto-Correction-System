import os
from pathlib import Path
import cv2
import pymupdf as fitz
import numpy as np

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "sample_data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def draw_invoice(w=1000, h=1400) -> np.ndarray:
    """Generates a realistic commercial invoice layout."""
    img = np.ones((h, w, 3), dtype=np.uint8) * 255

    # Outer border
    cv2.rectangle(img, (50, 50), (w - 50, h - 50), (220, 220, 220), 2)

    # Company Header
    cv2.rectangle(img, (50, 50), (w - 50, 180), (245, 247, 250), -1)
    cv2.line(img, (50, 180), (w - 50, 180), (200, 205, 215), 2)
    cv2.putText(img, "GLOBAL LOGISTICS & SUPPLY CHAIN LTD.", (80, 110), cv2.FONT_HERSHEY_DUPLEX, 0.9, (20, 30, 45), 2)
    cv2.putText(img, "Tax ID: 84-2938102 | Phone: +1 (800) 555-0199 | invoices@globallogistics.com", (80, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (90, 100, 115), 1)

    # Invoice Details Section
    cv2.putText(img, "COMMERCIAL INVOICE", (80, 240), cv2.FONT_HERSHEY_DUPLEX, 0.8, (30, 41, 59), 2)
    cv2.putText(img, "Invoice No: INV-2026-8819", (80, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(img, "Date: October 24, 2026", (80, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(img, "Payment Terms: Net 30 Days", (80, 325), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)

    cv2.putText(img, "BILL TO:", (w - 420, 240), cv2.FONT_HERSHEY_DUPLEX, 0.6, (30, 41, 59), 2)
    cv2.putText(img, "Apex Technologies Enterprise Corp.", (w - 420, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(img, "450 Industrial Parkway, Suite 800", (w - 420, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(img, "San Francisco, CA 94107", (w - 420, 325), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)

    # Table Header
    y_table = 380
    cv2.rectangle(img, (80, y_table), (w - 80, y_table + 45), (30, 41, 59), -1)
    cv2.putText(img, "Item / Description", (95, y_table + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
    cv2.putText(img, "Qty", (580, y_table + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
    cv2.putText(img, "Unit Price", (690, y_table + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
    cv2.putText(img, "Total (USD)", (830, y_table + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    items = [
        ("Cloud Infrastructure OCR Processing License (Annual)", "1", "$2,400.00", "$2,400.00"),
        ("High-Speed Edge Scanner API Integration Kit", "2", "$850.00", "$1,700.00"),
        ("Automated Quality Assessment Pipeline Setup", "1", "$1,200.00", "$1,200.00"),
        ("Tier-1 SLA Support & Priority Ticket Dispatch", "12", "$150.00", "$1,800.00"),
        ("Document Image Enhancement Calibration", "1", "$500.00", "$500.00"),
    ]

    curr_y = y_table + 45
    for idx, (desc, qty, price, total) in enumerate(items):
        bg_col = (250, 250, 252) if idx % 2 == 1 else (255, 255, 255)
        cv2.rectangle(img, (80, curr_y), (w - 80, curr_y + 45), bg_col, -1)
        cv2.line(img, (80, curr_y + 45), (w - 80, curr_y + 45), (225, 225, 230), 1)

        cv2.putText(img, desc, (95, curr_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (40, 40, 40), 1)
        cv2.putText(img, qty, (590, curr_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (40, 40, 40), 1)
        cv2.putText(img, price, (695, curr_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (40, 40, 40), 1)
        cv2.putText(img, total, (840, curr_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (40, 40, 40), 1)
        curr_y += 45

    # Vertical borders
    cv2.line(img, (560, y_table), (560, curr_y), (225, 225, 230), 1)
    cv2.line(img, (670, y_table), (670, curr_y), (225, 225, 230), 1)
    cv2.line(img, (810, y_table), (810, curr_y), (225, 225, 230), 1)
    cv2.rectangle(img, (80, y_table), (w - 80, curr_y), (200, 200, 205), 1)

    # Totals block
    curr_y += 30
    cv2.rectangle(img, (w - 420, curr_y), (w - 80, curr_y + 130), (245, 247, 250), -1)
    cv2.rectangle(img, (w - 420, curr_y), (w - 80, curr_y + 130), (210, 215, 225), 1)

    cv2.putText(img, "Subtotal:", (w - 400, curr_y + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 80), 1)
    cv2.putText(img, "$7,600.00", (w - 180, curr_y + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 40, 40), 1)

    cv2.putText(img, "Estimated Tax (8.25%):", (w - 400, curr_y + 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 80), 1)
    cv2.putText(img, "$627.00", (w - 180, curr_y + 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 40, 40), 1)

    cv2.line(img, (w - 410, curr_y + 85), (w - 90, curr_y + 85), (200, 200, 205), 1)
    cv2.putText(img, "TOTAL DUE:", (w - 400, curr_y + 115), cv2.FONT_HERSHEY_DUPLEX, 0.58, (20, 20, 20), 2)
    cv2.putText(img, "$8,227.00", (w - 190, curr_y + 115), cv2.FONT_HERSHEY_DUPLEX, 0.58, (15, 100, 50), 2)

    # Footer
    cv2.putText(img, "Thank you for your business. Please remit payment within 30 days of receipt.", (80, h - 90), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1)
    cv2.putText(img, "Authorized Signature: _______________________      Date: _____________", (80, h - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (70, 70, 70), 1)

    return img


def draw_contract_page(w=1000, h=1400) -> np.ndarray:
    """Generates a legal contract / non-disclosure agreement layout."""
    img = np.ones((h, w, 3), dtype=np.uint8) * 255

    cv2.putText(img, "MUTUAL NON-DISCLOSURE AGREEMENT", (120, 100), cv2.FONT_HERSHEY_DUPLEX, 0.85, (20, 20, 20), 2)
    cv2.line(img, (120, 120), (w - 120, 120), (50, 50, 50), 2)

    paras = [
        "This Mutual Non-Disclosure Agreement ('Agreement') is entered into as of the Effective Date by and between the parties identified below.",
        "1. Purpose. The parties wish to explore a potential business relationship concerning document quality assessment, computer vision APIs, and automated processing pipelines.",
        "2. Confidential Information. 'Confidential Information' refers to any proprietary information, technical data, trade secrets, software code, models, or know-how disclosed by either party.",
        "3. Non-Disclosure Obligations. Each receiving party agrees to treat all Confidential Information with the same degree of care it accords to its own confidential materials, but no less than reasonable care.",
        "4. Permitted Disclosures. Confidential Information may only be disclosed to employees, contractors, and legal advisors who have a strict need to know.",
        "5. Term and Termination. This Agreement shall govern all communications between the parties for a period of five (5) years from the Effective Date.",
        "6. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to conflict of laws principles.",
        "IN WITNESS WHEREOF, the duly authorized representatives of the parties have executed this Agreement below.",
    ]

    y = 170
    for p in paras:
        words = p.split()
        line = ""
        for word in words:
            test_line = line + word + " "
            if len(test_line) * 9 > (w - 240):
                cv2.putText(img, line.strip(), (120, y), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (30, 30, 30), 1)
                y += 28
                line = word + " "
            else:
                line = test_line
        if line:
            cv2.putText(img, line.strip(), (120, y), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (30, 30, 30), 1)
            y += 45

    # Signature blocks
    y = h - 220
    cv2.line(img, (120, y), (420, y), (60, 60, 60), 1)
    cv2.putText(img, "Disclosing Party Signature", (120, y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)
    cv2.putText(img, "Name: Jane Doe, Chief Technology Officer", (120, y + 48), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (100, 100, 100), 1)

    cv2.line(img, (w - 420, y), (w - 120, y), (60, 60, 60), 1)
    cv2.putText(img, "Receiving Party Signature", (w - 420, y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)
    cv2.putText(img, "Name: John Smith, VP Engineering", (w - 420, y + 48), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (100, 100, 100), 1)

    return img


def generate_all_samples():
    print("Generating synthetic demo documents in sample_data/...")

    clean_invoice = draw_invoice()
    clean_contract = draw_contract_page()

    # 1. Clean Perfect Scan
    cv2.imwrite(str(OUTPUT_DIR / "sample_1_clean_invoice.png"), clean_invoice)

    # 2. Skewed Invoice (tilted ~4.8 degrees)
    h, w = clean_invoice.shape[:2]
    M_skew = cv2.getRotationMatrix2D((w // 2, h // 2), 4.8, 1.0)
    skewed_invoice = cv2.warpAffine(clean_invoice, M_skew, (w, h), borderValue=(255, 255, 255))
    cv2.imwrite(str(OUTPUT_DIR / "sample_2_skewed_invoice.png"), skewed_invoice)

    # 3. Motion & Lens Blurred Contract
    blurred_contract = cv2.GaussianBlur(clean_contract, (19, 19), 6.5)
    cv2.imwrite(str(OUTPUT_DIR / "sample_3_blurred_contract.png"), blurred_contract)

    # 4. Shadowed Invoice (mobile phone camera shadow cast on paper)
    shadowed_invoice = clean_invoice.copy().astype(np.float32)
    x = np.linspace(0.35, 1.0, w)
    y = np.linspace(0.40, 1.0, h)
    xx, yy = np.meshgrid(x, y)
    shadow_map = (xx * yy)[:, :, np.newaxis]
    shadowed_invoice = (shadowed_invoice * shadow_map).clip(0, 255).astype(np.uint8)
    cv2.imwrite(str(OUTPUT_DIR / "sample_4_shadowed_invoice.png"), shadowed_invoice)

    # 5. Heavy Sensor Noise / Grain
    noise = np.random.normal(0, 32, clean_contract.shape).astype(np.float32)
    noisy_contract = np.clip(clean_contract.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    cv2.imwrite(str(OUTPUT_DIR / "sample_5_noisy_contract.png"), noisy_contract)

    # 6. Severely Degraded Document (triggers "Fail" status < 45, re-scan flag and alert)
    degraded = skewed_invoice.copy().astype(np.float32)
    degraded = (degraded * shadow_map * 0.7).clip(0, 255)
    degraded = cv2.GaussianBlur(degraded.astype(np.uint8), (17, 17), 5.5)
    heavy_noise = np.random.normal(0, 35, degraded.shape).astype(np.float32)
    degraded = np.clip(degraded.astype(np.float32) + heavy_noise, 0, 255).astype(np.uint8)
    cv2.imwrite(str(OUTPUT_DIR / "sample_6_severely_degraded_fail.png"), degraded)

    # 7. Multi-page PDF (Page 1 = Invoice, Page 2 = Contract)
    pdf_doc = fitz.open()

    for img_arr, name in [(skewed_invoice, "p1"), (blurred_contract, "p2")]:
        tmp_png = OUTPUT_DIR / f"temp_{name}.png"
        cv2.imwrite(str(tmp_png), img_arr)
        img_page = fitz.open(str(tmp_png))
        rect = img_page[0].rect
        pdf_bytes = img_page.convert_to_pdf()
        img_page.close()
        img_pdf = fitz.open("pdf", pdf_bytes)
        page = pdf_doc.new_page(width=rect.width, height=rect.height)
        page.show_pdf_page(rect, img_pdf, 0)
        img_pdf.close()
        if os.path.exists(tmp_png):
            os.remove(tmp_png)

    pdf_path = OUTPUT_DIR / "sample_7_multipage_packet.pdf"
    pdf_doc.save(str(pdf_path))
    pdf_doc.close()

    print(f"Sample documents successfully generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    generate_all_samples()
