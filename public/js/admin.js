const API = "http://localhost:3000/api/requests";
const RESPONSE_API = "http://localhost:3000/api/responses";
const user = JSON.parse(localStorage.getItem('user'));
if (!user || user.user_type !== 'admin') {
    window.location.href = "/pages/login.html";
}

let todasLasSolicitudes = [];
let filtroActual = "all";
function cerrarSesion() {
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
}
/* === SIDEBAR MÓVIL === */
function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
}

/* === CARGAR SOLICITUDES === */
async function cargarSolicitudes() {
    try {
        const response = await fetch(API);
        todasLasSolicitudes = await response.json();

        actualizarMetricas();
        renderTabla(todasLasSolicitudes);

    } catch (error) {
        console.error("Error cargando solicitudes:", error);
    }
}

/* === MÉTRICAS === */
function actualizarMetricas() {
    const total    = todasLasSolicitudes.length;
    const pending  = todasLasSolicitudes.filter(s => s.status_id == 1).length;
    const process  = todasLasSolicitudes.filter(s => s.status_id == 2).length;
    const resolved = todasLasSolicitudes.filter(s => s.status_id == 3).length;

    document.getElementById("metricAll").textContent     = total;
    document.getElementById("metricPending").textContent  = pending;
    document.getElementById("metricProcess").textContent  = process;
    document.getElementById("metricResolved").textContent = resolved;

    document.getElementById("countAll").textContent     = total;
    document.getElementById("countPending").textContent  = pending;
    document.getElementById("countProcess").textContent  = process;
    document.getElementById("countResolved").textContent = resolved;
}

/* === RENDER TABLA === */
function renderTabla(solicitudes) {
    const tabla = document.getElementById("requestsTable");
    const empty = document.getElementById("adminEmpty");

    if (solicitudes.length === 0) {
        tabla.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    tabla.innerHTML = "";

    solicitudes.forEach(s => {
        let badgeClass = "badge-pending";
        let badgeIcon  = "fas fa-clock";
        let statusText = "Pendiente";

        if (s.status_id == 2) { badgeClass = "badge-process"; badgeIcon = "fas fa-spinner"; statusText = "En proceso"; }
        if (s.status_id == 3) { badgeClass = "badge-resolved"; badgeIcon = "fas fa-check-circle"; statusText = "Resuelto"; }

        tabla.innerHTML += `
            <tr id="row-${s.id}">
                <td><b>#${s.id}</b></td>
                <td>${s.title}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.description}">${s.description}</td>
                <td>
                    <span class="status-badge ${badgeClass}">
                        <i class="${badgeIcon}"></i>
                        ${statusText}
                    </span>
                </td>
                <td>
                    <button class="btn-action btn-process" onclick="cambiarEstado(${s.id}, 2)">
                        <i class="fas fa-spinner"></i> En proceso
                    </button>
                    <button class="btn-action btn-resolve" onclick="cambiarEstado(${s.id}, 3)">
                        <i class="fas fa-check"></i> Resolver
                    </button>
                </td>
                <td>
                    <button class="btn-action btn-reply" onclick="responderSolicitud(${s.id})">
                        <i class="fas fa-reply"></i> Responder
                    </button>
                </td>
            </tr>
        `;
    });
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

        cargarSolicitudes();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar el estado." });
        console.error(error);
    }
}

/* === RESPONDER === */
async function responderSolicitud(id) {
    const { value: mensaje } = await Swal.fire({
        title: `Responder solicitud #${id}`,
        input: "textarea",
        inputPlaceholder: "Escribe aquí tu respuesta detallada para el solicitante...",
        inputAttributes: { style: "min-height:120px;border-radius:10px;padding:12px;font-family:Segoe UI,sans-serif" },
        showCancelButton: true,
        confirmButtonText: "Enviar respuesta",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#0057D9"
    });

    if (!mensaje || mensaje.trim() === "") return;

    try {
        await fetch(RESPONSE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ request_id: id, user_id: 3, message: mensaje.trim() })
        });

        Swal.fire({
            icon: "success",
            title: "Respuesta enviada",
            text: "El solicitante podrá ver tu respuesta en su panel.",
            timer: 2500,
            showConfirmButton: false
        });

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo enviar la respuesta." });
        console.error(error);
    }
}

/* === FILTRAR POR ESTADO === */
function filterByStatus(status, el) {
    filtroActual = status;

    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    el.classList.add("active");

    const filtradas = status === "all"
        ? todasLasSolicitudes
        : todasLasSolicitudes.filter(s => s.status_id == status);

    const labels = { all: "— Todas", 1: "— Pendientes", 2: "— En proceso", 3: "— Resueltas" };
    document.getElementById("tableTitle").textContent = labels[status] || "";
    document.getElementById("tableSubtitle").textContent =
        `Mostrando ${filtradas.length} solicitud${filtradas.length !== 1 ? "es" : ""}`;

    renderTabla(filtradas);
    return false;
}

/* === BUSCADOR === */
function buscarSolicitudes() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtradas = todasLasSolicitudes.filter(s =>
        (s.title && s.title.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query))
    );
    renderTabla(filtradas);
}

/* === INIT === */
cargarSolicitudes();
setInterval(cargarSolicitudes, 8000);