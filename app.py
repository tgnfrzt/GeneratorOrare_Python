import os
import json
import webbrowser
import threading
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "orar.json")
ANDROID_ASSETS_FILE = os.path.join(r"D:\orarviewer", "app", "src", "main", "assets", "default_orar.json")

os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_TEMPLATE = {
    "academicConfig": {
        "startDate": "2024-09-28",
        "week1Parity": "impar",
        "manualWeekOverride": None,
        "isFrozen": False
    },
    "faculties": {
        "ACS": {
            "id": "ACS",
            "name": "Facultatea de Automatică și Calculatoare",
            "shortName": "ACS",
            "colorHex": "#3B82F6",
            "priority": 1
        },
        "FSA": {
            "id": "FSA",
            "name": "Facultatea de Științe Aplicate",
            "shortName": "FSA",
            "colorHex": "#10B981",
            "priority": 2
        },
        "OPT": {
            "id": "OPT",
            "name": "Materii Opționale",
            "shortName": "Opțional",
            "colorHex": "#F59E0B",
            "priority": 3
        }
    },
    "entries": []
}

LOCAL_DEFAULT_FILE = os.path.join(DATA_DIR, "default_orar.json")

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print("Eroare citire orar.json:", e)

    # Daca fisierul local nu exista inca, incarcam din default-ul local sau din Android assets
    for fallback_path in [LOCAL_DEFAULT_FILE, ANDROID_ASSETS_FILE]:
        if os.path.exists(fallback_path):
            try:
                with open(fallback_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    save_data(data)
                    return data
            except Exception as e:
                print(f"Eroare citire {fallback_path}:", e)

    return DEFAULT_TEMPLATE

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/schedule", methods=["GET"])
def get_schedule():
    return jsonify(load_data())

@app.route("/api/schedule", methods=["POST"])
def update_schedule():
    data = request.json
    if not data:
        return jsonify({"error": "Date invalide"}), 400
    save_data(data)
    return jsonify({"status": "success", "message": "Orar salvat cu succes"})

@app.route("/api/schedule/export_to_android", methods=["POST"])
def export_to_android():
    data = load_data()
    try:
        # Verificam daca proiectul Android exista local
        if not os.path.exists(r"D:\orarviewer"):
            return jsonify({
                "status": "info",
                "message": "Proiectul Android nu a fost găsit pe acest PC (D:\\orarviewer). Poți folosi butonul 'Descarcă JSON' pentru a lua fișierul orar.json!"
            })
        os.makedirs(os.path.dirname(ANDROID_ASSETS_FILE), exist_ok=True)
        with open(ANDROID_ASSETS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return jsonify({
            "status": "success",
            "message": f"Orarul a fost sincronizat cu succes în aplicația Android ({ANDROID_ASSETS_FILE})!"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/schedule/sync_cloud", methods=["POST"])
def sync_cloud():
    import urllib.request
    data = load_data()
    req_body = request.get_json(silent=True) or {}
    cloud_url = req_body.get("cloud_url") or "https://Zabala.pythonanywhere.com/api/orar"
    try:
        json_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            cloud_url,
            data=json_bytes,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "DualSchedule-PC-Generator"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return jsonify({
                "status": "success",
                "message": f"Orarul a fost sincronizat cu succes pe server ({cloud_url})! Deschide aplicația Android și apasă Sincronizează."
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Eroare conectare la serverul cloud ({cloud_url}): {str(e)}"
        }), 500

@app.route("/api/schedule/reset_default", methods=["POST"])
def reset_default():
    for fallback_path in [LOCAL_DEFAULT_FILE, ANDROID_ASSETS_FILE]:
        if os.path.exists(fallback_path):
            try:
                with open(fallback_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    save_data(data)
                    return jsonify({"status": "success", "data": data})
            except Exception as e:
                print(f"Eroare reset_default din {fallback_path}:", e)
    save_data(DEFAULT_TEMPLATE)
    return jsonify({"status": "success", "data": DEFAULT_TEMPLATE})

@app.route("/api/schedule/clear", methods=["POST"])
def clear_schedule():
    data = load_data()
    data["entries"] = []
    save_data(data)
    return jsonify({"status": "success", "data": data, "message": "Toate orele au fost șterse"})

from datetime import datetime, timedelta
from flask import Response

def generate_ics(data):
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DualSchedule//Orar Universitar RO//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Orar Dual (ACS & FSA)",
        "X-WR-TIMEZONE:Europe/Bucharest"
    ]
    
    # Gasim data de referinta Luni pentru saptamana 1
    # 28 Septembrie a fost Sambata in 2024, Luni incepea pe 30 Septembrie 2024
    base_monday = datetime(2024, 9, 30)
    
    entries = data.get("entries", [])
    for it in entries:
        day_offset = (it.get("dayOfWeek", 1) - 1)
        parity = it.get("parity", "toate").lower()
        
        # Daca e par, prima aparitie e in saptamana 2 (+7 zile)
        week_offset = 7 if parity == "par" else 0
        event_date = base_monday + timedelta(days=day_offset + week_offset)
        
        start_parts = [int(x) for x in it.get("startTime", "08:00").split(":")]
        end_parts = [int(x) for x in it.get("endTime", "10:00").split(":")]
        
        dt_start = event_date.replace(hour=start_parts[0], minute=start_parts[1], second=0)
        dt_end = event_date.replace(hour=end_parts[0], minute=end_parts[1], second=0)
        
        start_str = dt_start.strftime("%Y%m%dT%H%M%S")
        end_str = dt_end.strftime("%Y%m%dT%H%M%S")
        stamp_str = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        
        # Frecventa de repetare
        if parity == "toate":
            rrule = "FREQ=WEEKLY;INTERVAL=1;COUNT=14"
        else:
            rrule = "FREQ=WEEKLY;INTERVAL=2;COUNT=7"
            
        summary = f"[{it.get('faculty', 'ACS')}] {it.get('discipline', '')} ({it.get('type', '').upper()})"
        location = f"Sala {it.get('room', '')}" if it.get('room') else "Fără sală"
        description = f"Facultate: {it.get('faculty')} | Tip: {it.get('type')} | Paritate: {parity} | Notițe: {it.get('notes', '')}"
        
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{it.get('id', 'item')}_{start_str}@dualschedule.ro")
        lines.append(f"DTSTAMP:{stamp_str}")
        lines.append(f"DTSTART:{start_str}")
        lines.append(f"DTEND:{end_str}")
        lines.append(f"RRULE:{rrule}")
        lines.append(f"SUMMARY:{summary}")
        lines.append(f"LOCATION:{location}")
        lines.append(f"DESCRIPTION:{description}")
        lines.append("STATUS:CONFIRMED")
        lines.append("END:VEVENT")
        
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)

@app.route("/api/schedule/export_ics", methods=["GET"])
def export_ics():
    data = load_data()
    ics_text = generate_ics(data)
    return Response(
        ics_text,
        mimetype="text/calendar",
        headers={"Content-Disposition": "attachment; filename=orar_dual.ics"}
    )


def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000")

if __name__ == "__main__":
    # Deschide automat browserul la pornire
    threading.Timer(1.2, open_browser).start()
    app.run(host="127.0.0.1", port=5000, debug=False)
