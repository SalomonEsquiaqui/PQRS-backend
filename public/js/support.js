const API          = "https://pqrs-cul.onrender.com/api/requests";
const RESPONSE_API = "https://pqrs-cul.onrender.com/api/responses";
const user = JSON.parse(localStorage.getItem('user'));
if (!user || user.user_type !== 'support') {
    window.location.href = "/pages/login.html";
}

function cerrarSesion() {
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
}

/* Usuario soporte temporal — reemplazar con sesión real */
const support_user_id = 4;

let todosLosTickets = [];
let misTickets      = [];
let respuestasCache = [];
let filtroActual    = "all";

/* ========================
   MENÚ MÓVIL
======================== */
function toggleMenu() {
    document.getElementById("navLinks").classList.toggle("open");
}

/* ========================
   PRIORIDAD: labels y clases
======================== */
const priorityConfig = {
    low:    { label: "Baja",    cls: "prio-low",    icon: "fas fa-circle" },
    medium: { label: "Media",   cls: "prio-medium", icon: "fas fa-circle" },
    high:   { label: "Alta",    cls: "prio-high",   icon: "fas fa-exclamation-circle" },
    urgent: { label: "Urgente", cls: "prio-urgent",  icon: "fas fa-exclamation-triangle" }
};

/* ========================
   ARCHIVOS ADJUNTOS
======================== */
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
    fileDrop.style.borderColor = "#1D9E75";
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

/* ========================
   MÉTRICAS HERO
======================== */
function actualizarMetricas(tickets) {
    const urgentes = tickets.filter(t => t.priority === "urgent" && t.status_id != 3).length;
    const proceso  = tickets.filter(t => t.status_id == 2).length;
    const cerrados = tickets.filter(t => t.status_id == 3).length;

    document.getElementById("hmTotal").textContent  = tickets.length;
    document.getElementById("hmUrgent").textContent = urgentes;
    document.getElementById("hmProcess").textContent = proceso;
    document.getElementById("hmClosed").textContent  = cerrados;

    document.getElementById("urgentCount").textContent =
        `${urgentes} urgente${urgentes !== 1 ? "s" : ""}`;
}

/* ========================
   CARGAR TICKETS
   (Filtra por categoría técnica: Sistemas=3)
   Ajusta según tu lógica de asignación real
======================== */
async function cargarTickets() {
    try {
        const [solRes, respRes] = await Promise.all([
            fetch(API),
            fetch(RESPONSE_API)
        ]);

        todosLosTickets = await solRes.json();
        respuestasCache  = await respRes.json();

        /* Tickets técnicos: categorías 3 (Sistemas) y 4 (Infraestructura).
           Ajusta según tu modelo de negocio real. */
        const tecnicos = todosLosTickets.filter(t =>
            t.category_id == 3 || t.category_id == 4
        );

        document.getElementById("ticketCount").textContent =
            `${tecnicos.length} ticket${tecnicos.length !== 1 ? "s" : ""}`;

        actualizarMetricas(tecnicos);
        renderTickets(tecnicos);

    } catch (error) {
        console.error("Error cargando tickets:", error);
    }
}

/* ========================
   RENDER TICKETS
======================== */
function renderTickets(tickets) {
    const tbody = document.getElementById("ticketsTable");
    const empty = document.getElementById("ticketsEmpty");

    let filtrados;
    if (filtroActual === "all") {
        filtrados = tickets;
    } else if (filtroActual === "urgent") {
        filtrados = tickets.filter(t => t.priority === "urgent" && t.status_id != 3);
    } else {
        filtrados = tickets.filter(t => t.status_id == filtroActual);
    }

    /* Aplicar búsqueda si hay texto */
    const query = document.getElementById("searchInput").value.toLowerCase();
    if (query) {
        filtrados = filtrados.filter(t =>
            (t.title && t.title.toLowerCase().includes(query)) ||
            (t.description && t.description.toLowerCase().includes(query))
        );
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const catLabels = {
        3: "Sistemas", 4: "Infraestructura",
        8: "Red", 9: "Hardware",
        10: "Seguridad", 11: "Correo"
    };

    tbody.innerHTML = "";
    filtrados.forEach(t => {
        const { badgeClass, badgeIcon, statusText } = getStatusInfo(t.status_id);
        const prio   = priorityConfig[t.priority] || priorityConfig["medium"];
        const fecha  = t.created_at
            ? new Date(t.created_at).toLocaleDateString("es-CO")
            : "—";
        const rowCls = t.priority === "urgent" ? "row-urgent" : "";

        tbody.innerHTML += `
            <tr class="${rowCls}">
                <td><b>#${t.id}</b></td>
                <td>${t.title}</td>
                <td>${catLabels[t.category_id] || "Técnico"}</td>
                <td>
                    <span class="priority-badge ${prio.cls}">
                        <i class="${prio.icon}" style="font-size:10px"></i>
                        ${prio.label}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${badgeClass}">
                        <i class="${badgeIcon}"></i> ${statusText}
                    </span>
                </td>
                <td>${fecha}</td>
                <td>
                    <button class="btn-action btn-process"
                        onclick="cambiarEstado(${t.id}, 2)">
                        <i class="fas fa-spinner"></i> En proceso
                    </button>
                    <button class="btn-action btn-reply"
                        onclick="responderTicket(${t.id})">
                        <i class="fas fa-reply"></i> Responder
                    </button>
                    <button class="btn-action btn-resolve"
                        onclick="cambiarEstado(${t.id}, 3)">
                        <i class="fas fa-times-circle"></i> Cerrar
                    </button>
                    <button class="btn-action btn-escalate"
                        onclick="escalarTicket(${t.id})">
                        <i class="fas fa-arrow-up"></i> Escalar
                    </button>
                </td>
            </tr>
        `;
    });
}

/* ========================
   FILTRAR
======================== */
function filtrarTickets(estado, btn) {
    filtroActual = estado;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tecnicos = todosLosTickets.filter(t =>
        t.category_id == 3 || t.category_id == 4
    );
    renderTickets(tecnicos);
}

function buscarTickets() {
    const tecnicos = todosLosTickets.filter(t =>
        t.category_id == 3 || t.category_id == 4
    );
    renderTickets(tecnicos);
}

/* ========================
   CAMBIAR ESTADO
======================== */
async function cambiarEstado(id, estado) {
    try {
        await fetch(`${API}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status_id: estado })
        });

        const labels = { 1: "Pendiente", 2: "En proceso", 3: "Cerrado" };
        Swal.fire({
            icon: "success",
            title: "Ticket actualizado",
            text: `El ticket fue marcado como: ${labels[estado]}`,
            timer: 2000,
            showConfirmButton: false
        });

        cargarTickets();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar el ticket." });
        console.error(error);
    }
}

/* ========================
   RESPONDER TICKET
======================== */
async function responderTicket(id) {
    const { value: mensaje } = await Swal.fire({
        title: `Responder ticket #${id}`,
        input: "textarea",
        inputPlaceholder: "Describe la solución técnica aplicada, pasos realizados, resultado...",
        inputAttributes: {
            style: "min-height:110px;border-radius:10px;padding:12px;font-family:Segoe UI,sans-serif"
        },
        showCancelButton: true,
        confirmButtonText: "Enviar respuesta técnica",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#1D9E75"
    });

    if (!mensaje || !mensaje.trim()) return;

    try {
        await fetch(RESPONSE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                request_id: id,
                user_id: support_user_id,
                message: mensaje.trim()
            })
        });

        Swal.fire({
            icon: "success",
            title: "Respuesta enviada",
            text: "El solicitante verá tu respuesta técnica en su panel.",
            timer: 2500,
            showConfirmButton: false
        });

        cargarTickets();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo enviar la respuesta." });
        console.error(error);
    }
}

/* ========================
   ESCALAR TICKET
======================== */
async function escalarTicket(id) {
    const { value: razon } = await Swal.fire({
        title: `Escalar ticket #${id}`,
        icon: "warning",
        input: "textarea",
        inputPlaceholder: "Explica por qué escalas este ticket y a quién va dirigido...",
        inputAttributes: {
            style: "min-height:90px;border-radius:10px;padding:12px;font-family:Segoe UI,sans-serif"
        },
        showCancelButton: true,
        confirmButtonText: "Escalar al administrador",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#E24B4A"
    });

    if (!razon || !razon.trim()) return;

    try {
        /* Guardar nota de escalamiento como respuesta interna */
        await fetch(RESPONSE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                request_id: id,
                user_id: support_user_id,
                message: `[ESCALADO] ${razon.trim()}`
            })
        });

        Swal.fire({
            icon: "success",
            title: "Ticket escalado",
            text: "El administrador fue notificado para atender este ticket.",
            timer: 3000,
            showConfirmButton: false
        });

        cargarTickets();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo escalar el ticket." });
        console.error(error);
    }
}

/* ========================
   REGISTRAR PROPIO TICKET
======================== */
document.getElementById("ticketForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const category_id   = document.getElementById("category_id").value;
    const title         = document.getElementById("title").value;
    const description   = document.getElementById("description").value;
    const priority      = document.getElementById("priority").value;
    const affected      = document.getElementById("affected_system").value;

    try {
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: support_user_id,
                request_type_id: 1,
                status_id: 1,
                category_id,
                title: `[${priority.toUpperCase()}] ${title}`,
                description: `Sistema afectado: ${affected}\n\n${description}`,
                priority
            })
        });

        Swal.fire({
            icon: "success",
            title: "¡Ticket registrado!",
            html: `<b>El ticket técnico fue registrado correctamente.</b><br><br>
                   <span style="color:#666">Será atendido según su nivel de prioridad.</span>`,
            timer: 7000,
            showConfirmButton: true,
            confirmButtonText: "Entendido",
            confirmButtonColor: "#1D9E75"
        });

        document.getElementById("ticketForm").reset();
        document.getElementById("fileList").innerHTML = "";
        cargarHistorial();

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo registrar el ticket." });
        console.error(error);
    }
});

/* ========================
   HISTORIAL PROPIO
======================== */
async function cargarHistorial() {
    try {
        const [solRes, respRes] = await Promise.all([
            fetch(API),
            fetch(RESPONSE_API)
        ]);

        const todas      = await solRes.json();
        respuestasCache   = await respRes.json();

        misTickets = todas.filter(t => t.user_id == support_user_id);

        document.getElementById("historyCount").textContent =
            `${misTickets.length} registro${misTickets.length !== 1 ? "s" : ""}`;

        renderHistorial();

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

function renderHistorial() {
    const tbody = document.getElementById("historyTable");
    const empty = document.getElementById("historyEmpty");

    if (misTickets.length === 0) {
        tbody.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    tbody.innerHTML = "";

    misTickets.forEach(t => {
        const { badgeClass, badgeIcon, statusText } = getStatusInfo(t.status_id);
        const prio     = priorityConfig[t.priority] || priorityConfig["medium"];
        const respuesta = respuestasCache.find(r => r.request_id == t.id);
        const fecha    = t.created_at
            ? new Date(t.created_at).toLocaleDateString("es-CO")
            : "—";

        tbody.innerHTML += `
            <tr>
                <td><b>#${t.id}</b></td>
                <td>${t.title}</td>
                <td>
                    <span class="priority-badge ${prio.cls}">
                        <i class="${prio.icon}" style="font-size:10px"></i>
                        ${prio.label}
                    </span>
                </td>
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

/* ========================
   HELPER: INFO DE ESTADO
======================== */
function getStatusInfo(status_id) {
    if (status_id == 2) return { badgeClass: "badge-process",  badgeIcon: "fas fa-spinner",      statusText: "En proceso" };
    if (status_id == 3) return { badgeClass: "badge-resolved", badgeIcon: "fas fa-check-circle", statusText: "Cerrado"    };
    return                     { badgeClass: "badge-pending",  badgeIcon: "fas fa-clock",        statusText: "Pendiente"  };
}

/* ========================
   INIT
======================== */
cargarTickets();
cargarHistorial();
setInterval(() => { cargarTickets(); cargarHistorial(); }, 10000);