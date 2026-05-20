const API          = "https://pqrs-cul.onrender.com/api/requests";
const RESPONSE_API = "https://pqrs-cul.onrender.com/api/responses";

const _sessionUser = JSON.parse(localStorage.getItem("user"));
if (!_sessionUser) window.location.href = "/pages/login.html";

function cerrarSesion() {
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
}

// ✅ FIX: en el código original se declaraba support_user_id pero luego
//    se usaba teacher_user_id (que nunca existió), causando ReferenceError
//    en responderSolicitud() y en el submit del form.
const teacher_user_id = Number(_sessionUser.id);

let todasLasSolicitudes = [];
let misHistorial        = [];
let respuestasCache     = [];
let filtroAsignadas     = "all";

/* === MENÚ MÓVIL === */
function toggleMenu() {
    document.getElementById("navLinks").classList.toggle("open");
}

/* === ARCHIVOS ADJUNTOS === */
function showFiles(input) {
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    Array.from(input.files).forEach(file => {
        const item = document.createElement("div");
        item.className = "file-item";
        item.innerHTML = `
            <i class="fas fa-file-alt"></i>
            ${file.name}
            <span style="color:#aaa;margin-left:auto;font-size:12px">
                ${(file.size / 1024).toFixed(1)} KB
            </span>
        `;
        list.appendChild(item);
    });
}

/* Drag & Drop */
const fileDrop = document.getElementById("fileDrop");
fileDrop.addEventListener("dragover", e => {
    e.preventDefault();
    fileDrop.style.borderColor = "#0057D9";
});
fileDrop.addEventListener("dragleave", () => {
    fileDrop.style.borderColor = "";
});
fileDrop.addEventListener("drop", e => {
    e.preventDefault();
    fileDrop.style.borderColor = "";
    const dt = new DataTransfer();
    Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
    document.getElementById("fileInput").files = dt.files;
    showFiles(document.getElementById("fileInput"));
});

/* === MÉTRICAS HERO === */
function actualizarMetricas(solicitudes) {
    const pending  = solicitudes.filter(s => Number(s.status_id) === 1).length;
    const process  = solicitudes.filter(s => Number(s.status_id) === 2).length;
    const resolved = solicitudes.filter(s => Number(s.status_id) === 3).length;

    document.getElementById("hmTotal").textContent    = solicitudes.length;
    document.getElementById("hmPending").textContent  = pending;
    document.getElementById("hmProcess").textContent  = process;
    document.getElementById("hmResolved").textContent = resolved;
}

/* === SOLICITUDES ASIGNADAS (categoría académica = 1) === */
async function cargarAsignadas() {
    try {
        const [solRes, respRes] = await Promise.all([
            fetch(API),
            fetch(RESPONSE_API)
        ]);

        todasLasSolicitudes = await solRes.json();
        respuestasCache     = await respRes.json();

        // ✅ FIX: Number() para comparación robusta
        const asignadas = todasLasSolicitudes.filter(s => Number(s.category_id) === 1);

        document.getElementById("assignedCount").textContent =
            `${asignadas.length} solicitud${asignadas.length !== 1 ? "es" : ""}`;

        actualizarMetricas(asignadas);
        renderAsignadas(asignadas);

    } catch (error) {
        console.error("Error cargando asignadas:", error);
    }
}

function renderAsignadas(solicitudes) {
    const tbody = document.getElementById("assignedTable");
    const empty = document.getElementById("assignedEmpty");

    const filtradas = filtroAsignadas === "all"
        ? solicitudes
        : solicitudes.filter(s => Number(s.status_id) === Number(filtroAsignadas));

    if (filtradas.length === 0) {
        tbody.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const tipoLabels = {
        1: "Petición", 2: "Queja",
        3: "Reclamo",  4: "Sugerencia", 5: "Felicitación"
    };

    tbody.innerHTML = "";
    filtradas.forEach(s => {
        const { badgeClass, badgeIcon, statusText } = getStatusInfo(s.status_id);
        const fecha = s.created_at
            ? new Date(s.created_at).toLocaleDateString("es-CO")
            : "—";

        tbody.innerHTML += `
            <tr>
                <td><b>#${s.id}</b></td>
                <td>${s.title}</td>
                <td>${tipoLabels[Number(s.request_type_id)] || "—"}</td>
                <td>
                    <span class="status-badge ${badgeClass}">
                        <i class="${badgeIcon}"></i> ${statusText}
                    </span>
                </td>
                <td>${fecha}</td>
                <td>
                    <button class="btn-action btn-process"
                        onclick="cambiarEstado(${s.id}, 2)">
                        <i class="fas fa-spinner"></i> En proceso
                    </button>
                    <button class="btn-action btn-resolve"
                        onclick="cambiarEstado(${s.id}, 3)">
                        <i class="fas fa-check"></i> Resolver
                    </button>
                    <button class="btn-action btn-reply"
                        onclick="responderSolicitud(${s.id})">
                        <i class="fas fa-reply"></i> Responder
                    </button>
                </td>
            </tr>
        `;
    });
}

function filtrarAsignadas(estado, btn) {
    filtroAsignadas = estado;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const asignadas = todasLasSolicitudes.filter(s => Number(s.category_id) === 1);
    renderAsignadas(asignadas);
}

/* === CAMBIAR ESTADO === */
async function cambiarEstado(id, estado) {
    try {
        await fetch(`${API}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status_id: estado })
        });

        const labels = { 1: "Pendiente", 2: "En proceso", 3: "Resuelto" };
        Swal.fire({
            icon: "success",
            title: "Estado actualizado",
            text: `La solicitud fue marcada como: ${labels[estado]}`,
            timer: 2000,
            showConfirmButton: false
        });

        cargarAsignadas();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar el estado." });
        console.error(error);
    }
}

/* === RESPONDER SOLICITUD === */
async function responderSolicitud(id) {
    const { value: mensaje } = await Swal.fire({
        title: `Responder solicitud #${id}`,
        input: "textarea",
        inputPlaceholder: "Escribe aquí tu respuesta como docente responsable...",
        inputAttributes: {
            style: "min-height:110px;border-radius:10px;padding:12px;font-family:Segoe UI,sans-serif"
        },
        showCancelButton: true,
        confirmButtonText: "Enviar respuesta",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#0057D9"
    });

    if (!mensaje || !mensaje.trim()) return;

    try {
        await fetch(RESPONSE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                request_id: id,
                user_id: teacher_user_id,   // ✅ FIX: variable correcta
                message: mensaje.trim()
            })
        });

        Swal.fire({
            icon: "success",
            title: "Respuesta enviada",
            text: "El solicitante podrá ver tu respuesta en su panel.",
            timer: 2500,
            showConfirmButton: false
        });

        cargarAsignadas();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo enviar la respuesta." });
        console.error(error);
    }
}

/* === REGISTRAR PROPIA PQRS === */
document.getElementById("pqrsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const request_type_id = document.getElementById("request_type_id").value;
    const category_id     = document.getElementById("category_id").value;
    const title           = document.getElementById("title").value;
    const description     = document.getElementById("description").value;

    try {
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: teacher_user_id,   // ✅ FIX: variable correcta
                request_type_id,
                status_id: 1,
                category_id,
                title,
                description
            })
        });

        Swal.fire({
            icon: "success",
            title: "¡Solicitud registrada!",
            html: `<b>Tu PQRS fue registrada correctamente.</b><br><br>
                   <span style="color:#666">Recibirás respuesta en <b>48 horas hábiles</b>.<br>
                   Puedes seguirla en tu historial.</span>`,
            timer: 8000,
            showConfirmButton: true,
            confirmButtonText: "Entendido",
            confirmButtonColor: "#0057D9"
        });

        document.getElementById("pqrsForm").reset();
        document.getElementById("fileList").innerHTML = "";
        cargarHistorial();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo registrar la solicitud." });
        console.error(error);
    }
});

/* === HISTORIAL PROPIO === */
async function cargarHistorial() {
    try {
        const [solRes, respRes] = await Promise.all([
            fetch(API),
            fetch(RESPONSE_API)
        ]);

        const todas    = await solRes.json();
        respuestasCache = await respRes.json();

        // ✅ FIX: Number() para comparación segura
        misHistorial = todas.filter(s => Number(s.user_id) === teacher_user_id);

        document.getElementById("historyCount").textContent =
            `${misHistorial.length} registro${misHistorial.length !== 1 ? "s" : ""}`;

        renderHistorial();

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

function renderHistorial() {
    const tbody = document.getElementById("historyTable");
    const empty = document.getElementById("historyEmpty");

    if (misHistorial.length === 0) {
        tbody.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const tipoLabels = {
        1: "Petición", 2: "Queja",
        3: "Reclamo",  4: "Sugerencia", 5: "Felicitación"
    };

    tbody.innerHTML = "";
    misHistorial.forEach(s => {
        const { badgeClass, badgeIcon, statusText } = getStatusInfo(s.status_id);
        const respuesta = respuestasCache.find(r => Number(r.request_id) === Number(s.id));
        const fecha = s.created_at
            ? new Date(s.created_at).toLocaleDateString("es-CO")
            : "—";

        tbody.innerHTML += `
            <tr>
                <td><b>#${s.id}</b></td>
                <td>${s.title}</td>
                <td>${tipoLabels[Number(s.request_type_id)] || "—"}</td>
                <td>
                    <span class="status-badge ${badgeClass}">
                        <i class="${badgeIcon}"></i> ${statusText}
                    </span>
                </td>
                <td>${fecha}</td>
                <td style="color:${respuesta ? "#2E7D32" : "#999"}">
                    ${respuesta
                        ? `<i class="fas fa-comment-dots" style="margin-right:5px"></i>${respuesta.message}`
                        : "Sin respuesta aún"}
                </td>
            </tr>
        `;
    });
}

/* === HELPER: INFO DE ESTADO === */
function getStatusInfo(status_id) {
    if (Number(status_id) === 2) return { badgeClass: "badge-process",  badgeIcon: "fas fa-spinner",      statusText: "En proceso" };
    if (Number(status_id) === 3) return { badgeClass: "badge-resolved", badgeIcon: "fas fa-check-circle", statusText: "Resuelto"   };
    return                              { badgeClass: "badge-pending",  badgeIcon: "fas fa-clock",        statusText: "Pendiente"  };
}

/* === INIT === */
cargarAsignadas();
cargarHistorial();
setInterval(() => { cargarAsignadas(); cargarHistorial(); }, 10000);