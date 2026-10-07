// Constante Orar
const TIME_SLOTS = [
    { start: "08:00", end: "10:00" },
    { start: "10:00", end: "12:00" },
    { start: "12:00", end: "14:00" },
    { start: "14:00", end: "16:00" },
    { start: "16:00", end: "18:00" },
    { start: "18:00", end: "20:00" }
];

const DAYS = [
    { id: 1, name: "Luni" },
    { id: 2, name: "Marți" },
    { id: 3, name: "Miercuri" },
    { id: 4, name: "Joi" },
    { id: 5, name: "Vineri" }
];

// Stare Aplicatie
let scheduleData = {
    academicConfig: {
        startDate: "2024-09-28",
        week1Parity: "impar",
        manualWeekOverride: null,
        isFrozen: false
    },
    faculties: {},
    entries: []
};

let currentView = "par"; // "par" | "impar" | "toate"
let activeFaculty = "ACS"; // Sticky faculty
let activeDay = 1;
let activeTimeSlot = { start: "08:00", end: "10:00" };
let activeType = "laborator";
let activeParity = "toate";
let editingItemId = null;

// Initializare
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    fetchSchedule();
});

// Incarcare Date
async function fetchSchedule() {
    try {
        const res = await fetch("/api/schedule");
        if (res.ok) {
            scheduleData = await res.json();
            updateStats();
            renderGrid();
        }
    } catch (e) {
        showToast("Eroare la conectarea cu serverul", true);
    }
}

// Salvare pe server
async function saveScheduleToServer() {
    try {
        const res = await fetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scheduleData)
        });
        if (res.ok) {
            updateStats();
            renderGrid();
        }
    } catch (e) {
        showToast("Eroare la salvare", true);
    }
}

// Configurare Evenimente
function initEventListeners() {
    // 1. Selector Facultate (Sticky)
    document.querySelectorAll(".faculty-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".faculty-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeFaculty = btn.dataset.faculty;
        });
    });

    // 2. Selector Zi
    document.querySelectorAll("#dayPicker .pill-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#dayPicker .pill-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeDay = parseInt(btn.dataset.day);
        });
    });

    // 3. Selector Interval Orar
    document.querySelectorAll("#timeSlotPicker .time-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#timeSlotPicker .time-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeTimeSlot = { start: btn.dataset.start, end: btn.dataset.end };
        });
    });

    // 4. Selector Tip Activitate (C/S/L/Sport/Opt)
    document.querySelectorAll("#typePicker .type-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#typePicker .type-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeType = btn.dataset.type;

            // Auto-check la prezenta obligatorie daca e laborator sau seminar
            const mandatoryCheckbox = document.getElementById("mandatoryCheck");
            if (activeType === "laborator" || activeType === "seminar") {
                mandatoryCheckbox.checked = true;
            } else if (activeType === "curs") {
                mandatoryCheckbox.checked = false;
            }
        });
    });

    // 5. Selector Paritate
    document.querySelectorAll("#parityPicker .pill-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#parityPicker .pill-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeParity = btn.dataset.parity;
        });
    });

    // 6. Comutare Tab Par / Impar / Toate
    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentView = btn.dataset.view;
            renderGrid();
        });
    });

    // 7. Butoane Salvare
    document.getElementById("btnAddClass").addEventListener("click", () => saveClass(false));
    document.getElementById("btnAddAndNext").addEventListener("click", () => saveClass(true));
    document.getElementById("btnCancelEdit").addEventListener("click", cancelEdit);

    // 8. Actiuni Antet
    document.getElementById("btnExportAndroid").addEventListener("click", exportToAndroid);
    document.getElementById("btnDownloadJson").addEventListener("click", downloadJson);
    document.getElementById("btnLoadReference").addEventListener("click", loadReferenceSchedule);
    document.getElementById("btnClearAll").addEventListener("click", clearAll);

    // 8.1 Sincronizare Cloud (PythonAnywhere)
    document.getElementById("btnSyncCloud").addEventListener("click", async () => {
        showToast("Se sincronizează pe serverul cloud (Zabala.pythonanywhere.com)...");
        try {
            const res = await fetch("/api/schedule/sync_cloud", { method: "POST" });
            const result = await res.json();
            if (result.status === "success") {
                showToast("☁️ Sincronizare reușită! Deschide telefonul și apasă 'Sync'.");
            } else {
                showToast(`Eroare cloud: ${result.message}`, true);
            }
        } catch (err) {
            showToast("Eroare la apelul către serverul cloud: " + err.message, true);
        }
    });

    // 8.2 Import Fisier JSON de pe PC
    const fileInput = document.getElementById("jsonFileInput");
    document.getElementById("btnImportJson").addEventListener("click", () => {
        fileInput.click();
    });
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (!parsed.entries && !parsed.academicConfig) {
                    showToast("Fișierul JSON nu pare să fie un orar valid!", true);
                    return;
                }
                scheduleData = parsed;
                await saveScheduleToServer();
                updateStats();
                renderGrid();
                showToast(`Orarul din "${file.name}" a fost importat cu succes! (${scheduleData.entries.length} ore)`);
            } catch (err) {
                showToast("Eroare la parsarea fișierului JSON: " + err.message, true);
            }
        };
        reader.readAsText(file);
        fileInput.value = "";
    });

    // 9. Export iCalendar .ics & Print & Campus Guide
    document.getElementById("btnExportIcs").addEventListener("click", () => {
        window.location.href = "/api/schedule/export_ics";
        showToast("Se descarcă fișierul orar_dual.ics pentru calendar!");
    });

    document.getElementById("btnPrintSchedule").addEventListener("click", () => {
        window.print();
    });

    const campusModal = document.getElementById("campusModalOverlay");
    document.getElementById("btnCampusGuide").addEventListener("click", () => {
        campusModal.classList.add("active");
    });
    document.getElementById("btnCloseCampusModal").addEventListener("click", () => {
        campusModal.classList.remove("active");
    });

    // 10. Taste Rapide (Enter = Salveaza & Urmatoarea)
    document.getElementById("disciplineInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            saveClass(true);
        }
    });

    document.getElementById("roomInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            saveClass(true);
        }
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.getElementById("moveModalOverlay").classList.remove("active");
            document.getElementById("campusModalOverlay").classList.remove("active");
            cancelDirectRelocateMode();
            if (editingItemId) cancelEdit();
        }
    });

    // Modal Close
    document.getElementById("btnCloseModal").addEventListener("click", () => {
        document.getElementById("moveModalOverlay").classList.remove("active");
    });
}

// Randare Grid Interactiv
function renderGrid() {
    const tbody = document.getElementById("scheduleTableBody");
    tbody.innerHTML = "";

    TIME_SLOTS.forEach((slot, slotIndex) => {
        const tr = document.createElement("tr");

        // Coloana cu ora
        const timeTd = document.createElement("td");
        timeTd.className = "time-cell";
        timeTd.innerText = `${slot.start}\n-\n${slot.end}`;
        tr.appendChild(timeTd);

        // Coloanele pentru Luni - Vineri
        DAYS.forEach(day => {
            const td = document.createElement("td");
            td.className = "slot-cell";

            // Filtrare ore pentru acest slot si aceasta zi
            const matchingEntries = scheduleData.entries.filter(item => {
                if (item.dayOfWeek !== day.id) return false;
                if (item.startTime !== slot.start || item.endTime !== slot.end) return false;

                // Filtru de paritate al tab-ului
                if (currentView === "par") {
                    return item.parity === "par" || item.parity === "toate";
                } else if (currentView === "impar") {
                    return item.parity === "impar" || item.parity === "toate";
                }
                return true; // "toate"
            });

            if (matchingEntries.length === 0) {
                // Fereastră liberă
                const freeSlot = document.createElement("div");
                freeSlot.className = "free-slot";
                freeSlot.innerHTML = `<span class="free-slot-icon">🟢</span><span>Liber</span>`;
                freeSlot.title = `Fereastră liberă ${day.name} ${slot.start}-${slot.end}. Apasă pentru a adăuga o oră aici!`;
                freeSlot.addEventListener("click", () => {
                    selectSlotForInput(day.id, slot.start, slot.end);
                });
                td.appendChild(freeSlot);
            } else if (matchingEntries.length === 1) {
                // O singură oră
                const item = matchingEntries[0];
                td.appendChild(createClassCard(item));
            } else {
                // Conflict / Suprapunere (2 sau mai multe ore)
                const conflictContainer = document.createElement("div");
                conflictContainer.className = "conflict-slot-container";

                const badgeHeader = document.createElement("div");
                badgeHeader.className = "conflict-badge-header";
                badgeHeader.innerHTML = `<span>⚠️ SUPRAPUNERE</span><button class="mini-btn" style="background:#DC2626;color:white;" onclick="openMoveModal(${day.id}, '${slot.start}', '${slot.end}')">Rezolvă</button>`;
                conflictContainer.appendChild(badgeHeader);

                matchingEntries.forEach(item => {
                    conflictContainer.appendChild(createClassCard(item, true));
                });

                td.appendChild(conflictContainer);
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

// Creare Card de Ora
function createClassCard(item, isInsideConflict = false) {
    const card = document.createElement("div");
    card.className = `class-card faculty-${item.faculty.toLowerCase()}`;
    if (isInsideConflict && item.status === "conflict_secondary") {
        card.classList.add("secondary-conflict");
    }

    const typeShort = item.type ? item.type.charAt(0).toUpperCase() : "C";

    card.innerHTML = `
        <div class="card-top">
            <span class="card-faculty-tag tag-${item.faculty.toLowerCase()}">${item.faculty} [${typeShort}]</span>
            ${item.parity !== 'toate' ? `<span class="card-parity-badge">${item.parity.toUpperCase()}</span>` : ''}
        </div>
        <div class="card-title-text" title="${item.discipline}">${item.discipline}</div>
        <div class="card-bottom">
            <span class="card-room">📍 ${item.room ? item.room : 'Fără sală'}</span>
            <span class="card-type">${item.mandatory ? '⚠️ Oblig.' : ''}</span>
        </div>
        <div class="card-actions">
            <button class="mini-btn edit-btn" title="Editează">✏️</button>
            <button class="mini-btn delete-btn" title="Șterge">🗑️</button>
        </div>
    `;

    card.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        editClass(item.id);
    });

    card.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteClass(item.id);
    });

    card.addEventListener("click", () => {
        editClass(item.id);
    });

    return card;
}

// Selectare rapida a unui slot gol din tabel
function selectSlotForInput(dayId, startTime, endTime) {
    if (pendingRelocateItemId) {
        const itemIndex = scheduleData.entries.findIndex(it => it.id === pendingRelocateItemId);
        if (itemIndex !== -1) {
            const movedItem = scheduleData.entries[itemIndex];
            movedItem.dayOfWeek = dayId;
            movedItem.startTime = startTime;
            movedItem.endTime = endTime;
            movedItem.status = "normal";
            saveScheduleToServer();
            const dayName = DAYS.find(d => d.id === dayId).name;
            showToast(`🚀 Ora [${movedItem.faculty}] ${movedItem.discipline} a fost mutată în ${dayName} ${startTime}-${endTime}!`);
        }
        cancelDirectRelocateMode();
        renderGrid();
        return;
    }

    // Seteaza ziua
    activeDay = dayId;
    document.querySelectorAll("#dayPicker .pill-btn").forEach(btn => {
        btn.classList.toggle("active", parseInt(btn.dataset.day) === dayId);
    });

    // Seteaza ora
    activeTimeSlot = { start: startTime, end: endTime };
    document.querySelectorAll("#timeSlotPicker .time-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.start === startTime);
    });

    // Focus pe materie
    const disciplineInput = document.getElementById("disciplineInput");
    disciplineInput.focus();
    disciplineInput.scrollIntoView({ behavior: "smooth", block: "center" });

    showToast(`Selectat: ${DAYS.find(d => d.id === dayId).name} ${startTime} - ${endTime}`);
}

// Salvare Ora
function saveClass(keepOpen = false) {
    const discipline = document.getElementById("disciplineInput").value.trim();
    const room = document.getElementById("roomInput").value.trim();
    const notes = document.getElementById("notesInput").value.trim();
    const mandatory = document.getElementById("mandatoryCheck").checked;

    if (!discipline) {
        showToast("Te rog să introduci denumirea materiei!", true);
        document.getElementById("disciplineInput").focus();
        return;
    }

    if (editingItemId) {
        // Modificare ora existenta
        const index = scheduleData.entries.findIndex(it => it.id === editingItemId);
        if (index !== -1) {
            scheduleData.entries[index] = {
                ...scheduleData.entries[index],
                faculty: activeFaculty,
                discipline: discipline,
                type: activeType,
                dayOfWeek: activeDay,
                startTime: activeTimeSlot.start,
                endTime: activeTimeSlot.end,
                room: room,
                parity: activeParity,
                mandatory: mandatory,
                notes: notes
            };
        }
        editingItemId = null;
        document.getElementById("formHeaderTitle").innerText = "➕ Adăugare Rapidă Oră";
        document.getElementById("btnCancelEdit").style.display = "none";
        document.getElementById("btnAddClass").innerHTML = `<span>➕</span> Salvează Ora`;
        showToast("Ora a fost actualizată!");
    } else {
        // Creare noua ora
        const newId = `${activeFaculty.toLowerCase()}_${Date.now()}`;

        // Verificam automat daca provoaca conflict
        const existingInSlot = scheduleData.entries.filter(it => 
            it.dayOfWeek === activeDay &&
            it.startTime === activeTimeSlot.start &&
            (it.parity === "toate" || activeParity === "toate" || it.parity === activeParity)
        );

        let status = "normal";
        if (existingInSlot.length > 0) {
            // Este conflict! Daca noua ora e ACS sau obligatorie, devine primara, altfel secundara
            if (activeFaculty === "ACS" || mandatory) {
                status = "conflict_primary";
                existingInSlot.forEach(it => it.status = "conflict_secondary");
            } else {
                status = "conflict_secondary";
            }
        }

        const newEntry = {
            id: newId,
            faculty: activeFaculty,
            discipline: discipline,
            type: activeType,
            dayOfWeek: activeDay,
            startTime: activeTimeSlot.start,
            endTime: activeTimeSlot.end,
            room: room,
            professor: "",
            parity: activeParity,
            mandatory: mandatory,
            notes: notes,
            status: status
        };

        scheduleData.entries.push(newEntry);
        showToast(`Adăugat: [${activeFaculty}] ${discipline} (${room})`);
    }

    saveScheduleToServer();

    if (keepOpen) {
        // Goleste doar campurile de text
        document.getElementById("disciplineInput").value = "";
        document.getElementById("roomInput").value = "";
        document.getElementById("notesInput").value = "";

        // Avanseaza la urmatorul slot de 2 ore automat daca exista
        advanceToNextSlot();
        document.getElementById("disciplineInput").focus();
    } else {
        resetForm();
    }
}

// Avanseaza automat la urmatorul interval orar
function advanceToNextSlot() {
    const currentIndex = TIME_SLOTS.findIndex(s => s.start === activeTimeSlot.start);
    if (currentIndex !== -1 && currentIndex + 1 < TIME_SLOTS.length) {
        const nextSlot = TIME_SLOTS[currentIndex + 1];
        activeTimeSlot = nextSlot;

        document.querySelectorAll("#timeSlotPicker .time-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.start === nextSlot.start);
        });
    }
}

// Editare Ora
function editClass(id) {
    const item = scheduleData.entries.find(it => it.id === id);
    if (!item) return;

    editingItemId = id;

    // Actualizeaza formularul cu valorile orei
    activeFaculty = item.faculty;
    document.querySelectorAll(".faculty-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.faculty === item.faculty);
    });

    activeDay = item.dayOfWeek;
    document.querySelectorAll("#dayPicker .pill-btn").forEach(b => {
        b.classList.toggle("active", parseInt(b.dataset.day) === item.dayOfWeek);
    });

    activeTimeSlot = { start: item.startTime, end: item.endTime };
    document.querySelectorAll("#timeSlotPicker .time-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.start === item.startTime);
    });

    activeType = item.type;
    document.querySelectorAll("#typePicker .type-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.type === item.type);
    });

    activeParity = item.parity;
    document.querySelectorAll("#parityPicker .pill-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.parity === item.parity);
    });

    document.getElementById("disciplineInput").value = item.discipline;
    document.getElementById("roomInput").value = item.room || "";
    document.getElementById("notesInput").value = item.notes || "";
    document.getElementById("mandatoryCheck").checked = !!item.mandatory;

    document.getElementById("formHeaderTitle").innerText = `✏️ Editare: [${item.faculty}] ${item.discipline}`;
    document.getElementById("btnAddClass").innerHTML = `<span>💾</span> Actualizează Ora`;
    document.getElementById("btnCancelEdit").style.display = "block";

    document.getElementById("disciplineInput").focus();
}

function cancelEdit() {
    editingItemId = null;
    resetForm();
}

function resetForm() {
    editingItemId = null;
    document.getElementById("disciplineInput").value = "";
    document.getElementById("roomInput").value = "";
    document.getElementById("notesInput").value = "";
    document.getElementById("formHeaderTitle").innerText = "➕ Adăugare Rapidă Oră";
    document.getElementById("btnAddClass").innerHTML = `<span>➕</span> Salvează Ora`;
    document.getElementById("btnCancelEdit").style.display = "none";
}

// Stergere Ora
function deleteClass(id) {
    const item = scheduleData.entries.find(it => it.id === id);
    if (!item) return;

    if (confirm(`Sigur vrei să ștergi ora [${item.faculty}] ${item.discipline} (${item.startTime} - ${item.endTime})?`)) {
        scheduleData.entries = scheduleData.entries.filter(it => it.id !== id);
        saveScheduleToServer();
        showToast("Ora a fost ștearsă!");
    }
}

// Export direct in Android
async function exportToAndroid() {
    try {
        const res = await fetch("/api/schedule/export_to_android", { method: "POST" });
        const result = await res.json();
        if (result.status === "success") {
            showToast("🚀 Orarul a fost sincronizat direct în aplicația Android!");
        } else {
            showToast(`Eroare: ${result.message}`, true);
        }
    } catch (e) {
        showToast("Eroare la exportul în Android", true);
    }
}

// Descarcare JSON
function downloadJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scheduleData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "orar.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Fișierul orar.json a fost descărcat!");
}

// Incarca orar de referinta (transcris din poze)
async function loadReferenceSchedule() {
    if (confirm("Vrei să încarci orarul de referință (ACS + FSA) transcris inițial din poze?")) {
        const res = await fetch("/api/schedule/reset_default", { method: "POST" });
        if (res.ok) {
            const result = await res.json();
            scheduleData = result.data;
            updateStats();
            renderGrid();
            showToast("Orarul de referință a fost încărcat!");
        }
    }
}

// Goleste tot orarul
async function clearAll() {
    if (confirm("Ești sigur că vrei să ștergi toate orele? Vei putea introduce totul de la zero.")) {
        const res = await fetch("/api/schedule/clear", { method: "POST" });
        if (res.ok) {
            const result = await res.json();
            scheduleData = result.data;
            updateStats();
            renderGrid();
            showToast("Orarul a fost golit. Poți adăuga ore de la zero!");
        }
    }
}

let pendingRelocateItemId = null;

// Modal Mutare / Rezolvare Conflict
function openMoveModal(dayId, startTime, endTime) {
    const matching = scheduleData.entries.filter(it => 
        it.dayOfWeek === dayId && it.startTime === startTime && it.endTime === endTime
    );

    const dayName = DAYS.find(d => d.id === dayId).name;
    const body = document.getElementById("moveModalBody");

    let html = `
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px;">
            În slotul <b>${dayName} ${startTime} - ${endTime}</b> se suprapun <b>${matching.length} ore</b>:
        </p>
    `;

    matching.forEach(item => {
        html += `
            <div style="background:#1F2937;border:1px solid #374151;border-radius:10px;padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700;color:var(--text-primary);">[${item.faculty}] ${item.discipline}</div>
                    <div style="font-size:12px;color:#93C5FD;">📍 Sala ${item.room} • ${item.type.toUpperCase()}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-primary" onclick="startDirectRelocate('${item.id}')" style="font-size:11px;padding:6px 10px;">
                        🎯 Mută pe Tabel
                    </button>
                    <button class="btn btn-secondary" onclick="relocateClass('${item.id}', ${dayId})" style="font-size:11px;padding:6px 10px;">
                        ✏️ Editează
                    </button>
                </div>
            </div>
        `;
    });

    body.innerHTML = html;
    document.getElementById("moveModalOverlay").classList.add("active");
}

function startDirectRelocate(itemId) {
    document.getElementById("moveModalOverlay").classList.remove("active");
    pendingRelocateItemId = itemId;
    const item = scheduleData.entries.find(it => it.id === itemId);
    if (!item) return;

    // Evidentiaza toate ferestrele libere
    document.querySelectorAll(".slot-cell").forEach(cell => {
        if (cell.querySelector(".free-slot")) {
            cell.classList.add("relocate-target");
            const freeEl = cell.querySelector(".free-slot");
            freeEl.innerHTML = `<span>🎯</span><span style="font-weight:bold;">Apasă pt. a muta aici!</span>`;
        }
    });

    showToast(`Apasă pe orice fereastră liberă marcată pentru a muta [${item.faculty}] ${item.discipline}!`);
}

function cancelDirectRelocateMode() {
    pendingRelocateItemId = null;
    document.querySelectorAll(".slot-cell.relocate-target").forEach(cell => {
        cell.classList.remove("relocate-target");
    });
}

// Muta o ora gasind sloturi libere manual prin formular
function relocateClass(itemId, currentDayId) {
    document.getElementById("moveModalOverlay").classList.remove("active");
    const item = scheduleData.entries.find(it => it.id === itemId);
    if (!item) return;

    // Deschide formularul de editare ca utilizatorul sa schimbe ziua sau ora
    editClass(itemId);
    showToast(`Schimbă ziua sau intervalul orar pentru [${item.faculty}] ${item.discipline} și apasă Salvează!`);
}

// Actualizare Statistici in Navbar
function updateStats() {
    const totalCount = scheduleData.entries ? scheduleData.entries.length : 0;
    document.getElementById("totalClassesCount").innerText = totalCount;

    // Detectare numar conflicte
    let conflicts = 0;
    const grouped = {};
    (scheduleData.entries || []).forEach(item => {
        const key = `${item.dayOfWeek}_${item.startTime}_${item.parity}`;
        grouped[key] = (grouped[key] || 0) + 1;
    });

    Object.values(grouped).forEach(count => {
        if (count > 1) conflicts += 1;
    });

    document.getElementById("conflictsCount").innerText = conflicts;
}

// Afisare Toast
function showToast(message, isError = false) {
    const toast = document.getElementById("toastMessage");
    toast.innerText = message;
    toast.style.borderColor = isError ? "#EF4444" : "#38BDF8";
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}
