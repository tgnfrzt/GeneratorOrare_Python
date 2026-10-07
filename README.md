# ⚡ DualSchedule Builder — Timetable Generator & Conflict Resolver

[![Language](https://img.shields.io/badge/Language-Python%203.10+-3776AB.svg?style=flat&logo=python)](https://www.python.org/)
[![Backend](https://img.shields.io/badge/Backend-Flask-000000.svg?style=flat&logo=flask)](https://flask.palletsprojects.com/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%2F%20CSS3%20%2F%20Vanilla%20JS-E34F26.svg?style=flat)](https://developer.mozilla.org/en-US/)
[![AI Assisted](https://img.shields.io/badge/Developed%20with-AI%20Assistance%20(Antigravity%20%2F%20Gemini)-FF6F00.svg?style=flat)](https://deepmind.google/)

**DualSchedule Builder** este o aplicație web desktop concepută special pentru studenții înscriși simultan la **două facultăți** (ex: *Automatică și Calculatoare - ACS* + *Științe Aplicate - FSA*). 

Aplicația oferă o interfață rapidă de introducere a cursurilor, detectează automat suprapunerile de ore, evidențiază ferestrele libere din orar pentru relocarea laboratoarelor și sincronizează rezultatul cu ecosistemul mobil (Android) și calendarele externe.

---

## ✨ Funcționalități Cheie

### 1. ⚡ Introducere Rapidă a Orelor
- **Selecție Facultate „Sticky”**: Alegi o singură dată facultatea (ACS / FSA / Opționale), iar câmpul rămâne presetat pentru introducerea în serie.
- **Auto-Advance prin Tastatură**: La salvarea unei ore (<kbd>Enter</kbd>), formularul avansează automat la următorul slot orar din zi.

### 2. ⚠️ Detectare și Rezolvare a Conflictelor
- Când două activități sunt programate în același interval (ex: curs FSA suprapus cu laborator ACS), slotul este evidențiat cu alertă vizuală.
- Algoritmul prioritizează automat activitățile cu prezență obligatorie (Laboratoare/Seminarii față de Cursuri) și permite inversarea priorității cu un singur click.

### 3. 🟢 Mod Interactiv de Identificare a Ferestrelor Libere
- Toate intervalele disponibile sunt marcate vizual cu `🟢 Liber`.
- Făcând click pe un slot liber, formularul se pre-completează automat cu acea zi și oră pentru a muta cu ușurință o activitate cu o altă grupă.

### 4. 📤 Export & Sincronizare Multi-Platformă
- **Sincronizare Cloud PythonAnywhere**: Trimitere 1-click a orarului către serverul centralizat (`/api/orar`).
- **Export & Import JSON**: Încărcare și descărcare directă a fișierelor `orar.json` din calculator.
- **Export iCalendar (.ics)**: Generează un fișier de calendar standard compatibil cu Google Calendar, Outlook și Apple Calendar, cu calcul automat al recurenței pe 14 săptămâni și parității.
- **Sincronizare Locală Android**: Exportă direct în folderul `assets/` al proiectului Android de pe același calculator.

---

## 🤖 Mențiune privind Dezvoltarea cu Asistență AI (AI Disclosure)

> Acest proiect a fost conceput, structurat și dezvoltat în regim de **pair-programming asistat de Inteligență Artificială** (Google DeepMind Antigravity / Gemini).
> 
> **Rolul AI-ului în proiect:**
> - Generarea arhitecturii serverului Flask și a API-ului REST.
> - Scrierea logicii de generare a evenimentelor recurente conform specificației RFC 5545 (iCalendar `.ics`).
> - Implementarea scriptului de sincronizare automată prin API-ul PythonAnywhere (`deploy_pa.py`).
> - Crearea interfeței web responsive Dark Theme în HTML5/CSS3.
> 
> **Rolul uman:**
> - Formularea cerințelor operaționale pentru gestionarea orarului dublu.
> - Testarea fluxurilor de utilizare și direcționarea modului de relocare a orelor.

---

## 🚀 Rulare și Utilizare

### Metoda 1: Rulare Rapidă (Fără setări manuale)
1. Descarcă sau clonează depozitul:
   ```bash
   git clone https://github.com/tgnfrzt/GeneratorOrare_Python.git
   ```
2. Fă dublu-click pe **`start.bat`**.
3. Scriptul va verifica existența Python, va instala automat pachetele necesare (`Flask`, `flask-cors`) și va deschide browserul la adresa:
   `http://127.0.0.1:5000`

### Metoda 2: Rulare Manuală din Consolă
```bash
# Instalare dependențe
pip install -r requirements.txt

# Pornire server
python app.py
```

---

## 📁 Structură Proiect

```
D:/orar-generator/
├── app.py                  # Server Flask & rute REST API
├── requirements.txt        # Dependențe Python
├── start.bat               # Script automat de lansare pentru Windows
├── data/
│   ├── orar.json           # Orarul curent salvat
│   └── default_orar.json   # Șablon orar de rezervă
├── templates/
│   └── index.html          # Interfață web modernă
└── static/
    ├── css/style.css       # Stiluri Dark Theme & Print
    └── js/app.js           # Logică interactivă client
```

---

## 📄 Licență
Acest proiect este licențiat sub licența MIT.
