from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import pytesseract
import re
import io
import os
import json
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename

# set tesseract path if needed (windows only)
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

app = Flask(__name__)
CORS(app)

# create folders for uploads and json outputs
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# basic regex for finding money and dates
money_regex = re.compile(r"\$?\s*\d{1,6}\s*[.,]\s*\d{2}")
date_regexes = [
    re.compile(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"),
    re.compile(r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})"),
]


def parse_text(text: str):
    # split lines and clean up
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    items = []
    tax = None
    total = None
    subtotal = None
    service_charge = None
    merchant = ""
    date = ""

    # try to get merchant from top few lines
    for top in lines[:5]:
        if re.search(r"[A-Za-z]{3,}", top) and not re.search(r"(subtotal|total|tax|cashier|change)", top, re.I):
            merchant = re.sub(r"[^A-Za-z0-9 &'\-\.]", "", top).strip()
            if len(merchant) > 2:
                break

    # try to find a date
    for ln in lines:
        for rx in date_regexes:
            m = rx.search(ln)
            if m:
                date = m.group(1)
                break
        if date:
            break

    # parse each line for item or totals
    for ln in lines:
        clean_line = re.sub(r"[|•“”]", "", ln).strip()
        clean_line = re.sub(r"\s+([.,])\s*", r"\1", clean_line)
        lower = clean_line.lower()
        m = money_regex.search(clean_line)
        if not m:
            continue

        amount = float(m.group().replace("$", "").replace(",", "").replace(" ", ""))

        # if any(k in lower for k in ["subtotal", "subtot"]):
        #     continue
        # if "tax" in lower:
        #     tax = amount
        #     continue
        # if any(k in lower for k in ["total", "balance", "amount due", "grand total"]) and "sub" not in lower:
        #     total = amount
        #     continue

        if any(keyword in lower for keyword in ["subtotal", "subtot", "tax", "total", "fee", "charge", "surcharge", "balance"]):
            if "tax" in lower:
                tax = amount
            elif any(k in lower for k in ["total", "balance", "amount due", "amount owed", "grand total", "amt"]):
                #ensure it's not subtotal
                if "sub" not in lower:
                    total = amount
            #don't add category values as item
            continue


        name_part = clean_line[:m.start()].strip(" -:")
        qty = 1
        qm = re.match(r"(\d+)\s+(.*)", name_part)
        if qm:
            qty = int(qm.group(1))
            name_part = qm.group(2)

        if 2 <= len(name_part) <= 80:
            items.append({
                "qty": qty,
                "description": name_part.strip(),
                "amount": round(amount, 2)
            })

    subtotal = round(sum(i["amount"] for i in items), 2)
    #service_charge = round((total or 0) - subtotal - (tax or 0), 2) if total is not None else None
    
    #calculate service charges not including tax
    if total is not None:
        service_charge = round(total - subtotal - (tax or 0.0), 2)
    else:
        service_charge = None

    # set defaults if missing
    if not merchant:
        merchant = "unknown merchant"

    # format date to mm/dd/yyyy
    if date:
        for fmt in ("%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d", "%m-%d-%Y", "%m-%d-%y"):
            try:
                dt = datetime.strptime(date.replace("/", "-"), fmt)
                date = dt.strftime("%m/%d/%Y")
                break
            except ValueError:
                continue
    else:
        date = datetime.now().strftime("%m/%d/%Y")

    parsed = {
        "merchant": merchant,
        "date": date,
        "total": f"{(total or subtotal):.2f}",
        "items": [{"name": i["description"], "price": f"{i['amount']:.2f}", "qty": int(i.get("qty", 1))} for i in items[:50]],
        "_raw": {"subtotal": subtotal, "tax": tax, "service_charge": service_charge},
        "subtotal": f"{subtotal:.2f}",
        "tax": f"{(tax if tax is not None else 0.0):.2f}",
        "service_charge": f"{(service_charge if service_charge is not None else 0.0):.2f}"
    }
    return parsed


@app.route("/ocr", methods=["POST"])
def ocr():
    # endpoint for image upload and ocr
    try:
        if "file" not in request.files:
            return jsonify({"error": "no file uploaded"}), 400

        file = request.files["file"]
        if file.mimetype and not file.mimetype.startswith("image/"):
            return jsonify({"error": "unsupported file type"}), 400

        # save uploaded image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = secure_filename(file.filename or f"receipt_{timestamp}.jpg")
        img_path = UPLOAD_DIR / f"{timestamp}_{safe_name}"
        file_bytes = file.read()
        img_path.write_bytes(file_bytes)

        # open image
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        gray = image.convert("L")

        # run ocr
        text = pytesseract.image_to_string(gray)
        parsed = parse_text(text)

        # build json data
        saved_obj = {
            "ocr_type": "receipts",
            "file_name": img_path.name,
            "saved_image_path": str(img_path),
            "saved_at": datetime.now().isoformat(),
            "receipts": [
                {
                    "merchant": parsed["merchant"],
                    "date": parsed["date"],
                    "items": [{"qty": int(it.get("qty", 1)), "description": it["name"], "amount": float(it["price"])} for it in parsed["items"]],
                    "subtotal": parsed["_raw"]["subtotal"],
                    "tax": parsed["_raw"]["tax"],
                    "service_charge": parsed["_raw"]["service_charge"],
                    "total": float(parsed["total"]),
                }
            ]
        }

        # save json file
        json_path = OUTPUT_DIR / f"{timestamp}_{Path(safe_name).stem}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(saved_obj, f, ensure_ascii=False, indent=2)

        # return parsed data
        response = {
            **parsed,
            "saved_json_path": str(json_path),
            "saved_image_path": str(img_path)
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
