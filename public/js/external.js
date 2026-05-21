const API          = "https://pqrs-cul.onrender.com/api/requests";
const RESPONSE_API = "https://pqrs-cul.onrender.com/api/responses";
const user         = JSON.parse(localStorage.getItem('user'));

if (!user || user.user_type !== 'external') {
    window.location.href = "/pages/login.html";
}

const user_id = user.id;
let todasLasSolicitudes = [];
let filtroActual        = "all";
let respuestasCache     = [];

const tipoLabels = { 1:"Petición", 2:"Queja", 3:"Reclamo", 4:"Sugerencia", 5:"Felicitación" };
const catLabels  = { 1:"Académico", 2:"Financiero", 3:"Sistemas", 4:"Infraestructura", 5:"Administrativo", 6:"Biblioteca", 7:"Bienestar universitario" };

/* === SESIÓN === */
function cerrarSesion() {
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
}

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
        item.innerHTML = `<i class="fas fa-file-alt"></i> ${file.name}
            <span style="color:#aaa;margin-left:auto;font-size:12px">
                ${(file.size/1024).toFixed(1)} KB
            </span>`;
        list.appendChild(item);
    });
}

/* Drag & drop */
const fileDrop = document.getElementById("fileDrop");
fileDrop.addEventListener("dragover", e => { e.preventDefault(); fileDrop.style.borderColor="#2E7D32"; });
fileDrop.addEventListener("dragleave", () => { fileDrop.style.borderColor=""; });
fileDrop.addEventListener("drop", e => {
    e.preventDefault();
    fileDrop.style.borderColor = "";
    const dt = new DataTransfer();
    Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
    document.getElementById("fileInput").files = dt.files;
    showFiles(document.getElementById("fileInput"));
});

/* === REGISTRAR PQRS === */
document.getElementById("pqrsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const request_type_id = document.getElementById("request_type_id").value;
    const category_id     = document.getElementById("category_id").value;
    const title           = document.getElementById("title").value;
    const description     = document.getElementById("description").value;
    const status_id       = 1;

    try {
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id, request_type_id, status_id, category_id, title, description })
        });

        Swal.fire({
            icon: "success",
            title: "¡Solicitud registrada!",
            html: `<b>Tu PQRS fue registrada correctamente.</b><br><br>
                   <span style="color:#666">Recibirás respuesta en <b>3 a 4 días hábiles</b>.<br>
                   Puedes hacer seguimiento en tu historial.</span>`,
            timer: 8000,
            showConfirmButton: true,
            confirmButtonText: "Entendido",
            confirmButtonColor: "#2E7D32"
        });

        document.getElementById("pqrsForm").reset();
        document.getElementById("fileList").innerHTML = "";
        cargarHistorial();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo registrar la solicitud." });
        console.error(error);
    }
});

/* === HISTORIAL === */
async function cargarHistorial() {
    try {
        const [solRes, respRes] = await Promise.all([fetch(API), fetch(RESPONSE_API)]);
        todasLasSolicitudes = await solRes.json();
        respuestasCache     = await respRes.json();

        const misSolicitudes = todasLasSolicitudes.filter(s => s.user_id == user_id);
        document.getElementById("requestCount").textContent =
            `${misSolicitudes.length} solicitud${misSolicitudes.length !== 1 ? "es" : ""}`;

        renderHistorial(misSolicitudes, respuestasCache);
    } catch (error) { console.error(error); }
}

function renderHistorial(solicitudes, respuestas) {
    const tabla = document.getElementById("historyTable");
    const empty = document.getElementById("emptyState");

    const filtradas = filtroActual === "all"
        ? solicitudes
        : solicitudes.filter(s => s.status_id == filtroActual);

    if (filtradas.length === 0) {
        tabla.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    tabla.innerHTML = "";

    filtradas.forEach(solicitud => {
        const respuesta = respuestas.find(r => r.request_id == solicitud.id);

        let badgeClass = "badge-pending";
        let badgeIcon  = "fas fa-clock";
        let estadoText = "Pendiente";

        if (solicitud.status_id == 2) {
            badgeClass = "badge-process";
            badgeIcon  = "fas fa-spinner";
            estadoText = "En proceso";
        } else if (solicitud.status_id == 3) {
            badgeClass = "badge-resolved";
            badgeIcon  = "fas fa-check-circle";
            estadoText = "Resuelto";
        }

        const fecha = solicitud.created_at
            ? new Date(solicitud.created_at).toLocaleDateString("es-CO")
            : "—";

        tabla.innerHTML += `
            <tr>
                <td><b>#${solicitud.id}</b></td>
                <td>${solicitud.title}</td>
                <td>${tipoLabels[solicitud.request_type_id] || "—"}</td>
                <td>
                    <span class="status-badge ${badgeClass}">
                        <i class="${badgeIcon}"></i>
                        ${estadoText}
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

function filtrarEstado(estado, btn) {
    filtroActual = estado;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const mis = todasLasSolicitudes.filter(s => s.user_id == user_id);
    renderHistorial(mis, respuestasCache);
}

/* === SEGUIMIENTO === */
async function buscarSolicitud() {
    const id     = document.getElementById("trackingId").value.trim();
    const result = document.getElementById("trackingResult");

    if (!id) {
        result.className = "tracking-result not-found";
        result.classList.remove("hidden");
        result.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>Ingresa un ID válido</p>`;
        return;
    }

    result.classList.remove("hidden");
    result.className = "tracking-result";
    result.innerHTML = `<p style="color:#aaa;text-align:center"><i class="fas fa-spinner fa-spin"></i> Buscando...</p>`;

    try {
        const [solRes, respRes] = await Promise.all([
            fetch(`${API}/${id}`),
            fetch(RESPONSE_API)
        ]);

        const solicitud  = await solRes.json();
        const respuestas = await respRes.json();

        if (!solicitud || solicitud.error || !solicitud.id) {
            result.className = "tracking-result not-found";
            result.innerHTML = `<i class="fas fa-search"></i><p>No se encontró ninguna solicitud con el ID <b>#${id}</b></p>`;
            return;
        }

        if (solicitud.user_id != user_id) {
            result.className = "tracking-result not-found";
            result.innerHTML = `<i class="fas fa-lock"></i><p>No tienes permiso para ver esta solicitud</p>`;
            return;
        }

        const respuesta = respuestas.find(r => r.request_id == solicitud.id);

        let labelEstado = "label-pending";
        let iconEstado  = "fas fa-clock";
        let textoEstado = "Pendiente";

        if (solicitud.status_id == 2) { labelEstado = "label-process";  iconEstado = "fas fa-spinner";      textoEstado = "En proceso"; }
        if (solicitud.status_id == 3) { labelEstado = "label-resolved"; iconEstado = "fas fa-check-circle"; textoEstado = "Resuelto"; }

        const fecha = solicitud.created_at
            ? new Date(solicitud.created_at).toLocaleDateString("es-CO", {
                year:"numeric", month:"long", day:"numeric"
              })
            : "—";

        result.className = "tracking-result";
        result.innerHTML = `
            <div class="track-header">
                <div>
                    <p class="track-id">SOLICITUD #${solicitud.id}</p>
                    <p class="track-title">${solicitud.title}</p>
                </div>
                <div class="track-labels">
                    <span class="track-label label-type">
                        <i class="fas fa-tag"></i>
                        ${tipoLabels[solicitud.request_type_id] || "—"}
                    </span>
                    <span class="track-label label-cat">
                        <i class="fas fa-folder"></i>
                        ${catLabels[solicitud.category_id] || "—"}
                    </span>
                    <span class="track-label ${labelEstado}">
                        <i class="${iconEstado}"></i>
                        ${textoEstado}
                    </span>
                </div>
            </div>
            <div class="track-grid">
                <div class="track-field">
                    <p class="track-field-label"><i class="fas fa-calendar-alt"></i> Fecha de registro</p>
                    <p class="track-field-value">${fecha}</p>
                </div>
                <div class="track-field">
                    <p class="track-field-label"><i class="fas fa-folder"></i> Categoría</p>
                    <p class="track-field-value">${catLabels[solicitud.category_id] || "—"}</p>
                </div>
            </div>
            <div class="track-desc">
                <p class="track-desc-label"><i class="fas fa-align-left"></i> Descripción</p>
                <p class="track-desc-text">${solicitud.description}</p>
            </div>
            <div class="track-response ${respuesta ? "has-response" : "no-response"}">
                <i class="track-response-icon fas ${respuesta ? "fa-comment-dots" : "fa-hourglass-half"}"></i>
                <div>
                    <p class="track-response-title">${respuesta ? "Respuesta recibida" : "Esperando respuesta"}</p>
                    <p class="track-response-text">
                        ${respuesta
                            ? respuesta.message
                            : "Tu solicitud está siendo revisada. Recibirás respuesta en 3 a 4 días hábiles."}
                    </p>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        result.className = "tracking-result not-found";
        result.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>Error al buscar la solicitud</p>`;
    }
}

document.getElementById("trackingId")
    .addEventListener("keydown", e => { if (e.key === "Enter") buscarSolicitud(); });

cargarHistorial();
setInterval(cargarHistorial, 8000);