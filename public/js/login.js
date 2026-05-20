const API_URL = "http://localhost:3000/api/auth";

/* =========================
   SESIÓN ACTIVA
========================= */
const sesionActiva = JSON.parse(localStorage.getItem('user'));
if (sesionActiva) {
    const destinos = {
        student: '/pages/student.html',
        teacher: '/pages/teacher.html',
        support: '/pages/support.html',
        admin:   '/pages/admin.html'
    };
    const destino = destinos[sesionActiva.user_type];
    if (destino) window.location.href = destino;
}

/* =========================
   CONFIGURACIÓN DE ROLES
========================= */
const roleConfigs = {
    student: {
        label: "Estudiante",
        icon: "fas fa-graduation-cap",
        emailDomain: "@est.cul.edu.co",
        hint: "Usa tu correo estudiantil",
        badgeClass: "badge-student",
        redirect: "/pages/student.html",
        desc: "Registrar y consultar PQRS"
    },
    teacher: {
        label: "Docente",
        icon: "fas fa-chalkboard-teacher",
        emailDomain: "@doc.cul.edu.co",
        hint: "Usa tu correo docente",
        badgeClass: "badge-teacher",
        redirect: "/pages/teacher.html",
        desc: "Gestión académica"
    },
    support: {
        label: "Soporte técnico",
        icon: "fas fa-tools",
        emailDomain: "@soporte.cul.edu.co",
        hint: "Usa tu correo soporte",
        badgeClass: "badge-support",
        redirect: "/pages/support.html",
        desc: "Atención técnica"
    },
    admin: {
        label: "Administrador",
        icon: "fas fa-user-cog",
        emailDomain: "@admin.cul.edu.co",
        hint: "Usa tu correo administrativo",
        badgeClass: "badge-admin",
        redirect: "/pages/admin.html",
        desc: "Administración total"
    }
};

let currentTab  = "login";
let currentRole = "";

/* =========================
   CAMBIAR TABS
========================= */
function switchTab(tab) {
    currentTab = tab;

    document.getElementById("tabLogin")
        .classList.toggle("active", tab === "login");
    document.getElementById("tabRegister")
        .classList.toggle("active", tab === "register");

    const registerFields = [
        "registerFields",
        "idNumberField",
        "nameField",
        "confirmPassField"
    ];

    registerFields.forEach(id => {
        document.getElementById(id)
            .classList.toggle("hidden", tab === "login");
    });

    const pinGroup = document.getElementById("pinGroup");
    if (tab === "login") {
        pinGroup.classList.add("hidden");
        document.getElementById("rolePin").value = "";
    } else {
        if (currentRole === "admin" || currentRole === "support") {
            pinGroup.classList.remove("hidden");
        }
    }

    document.getElementById("submitText").textContent =
        tab === "login" ? "Ingresar al sistema" : "Crear cuenta";

    document.getElementById("submitBtn").querySelector("i").className =
        tab === "login" ? "fas fa-sign-in-alt" : "fas fa-user-plus";

    clearMessage();
}

/* =========================
   CAMBIO DE ROL
========================= */
function onRoleChange() {
    currentRole = document.getElementById("roleSelect").value;

    const config         = roleConfigs[currentRole];
    const badgeContainer = document.getElementById("roleBadges");
    const emailHint      = document.getElementById("emailHint");
    const pinGroup       = document.getElementById("pinGroup");

    if (config) {
        badgeContainer.innerHTML = `
            <span class="role-badge-info ${config.badgeClass}">
                <i class="${config.icon}"></i>
                ${config.label} · ${config.desc}
            </span>
        `;
        emailHint.textContent = config.hint;
    } else {
        badgeContainer.innerHTML = "";
        emailHint.textContent    = "";
    }

    if (currentTab === "register" &&
        (currentRole === "admin" || currentRole === "support")) {
        pinGroup.classList.remove("hidden");
    } else {
        pinGroup.classList.add("hidden");
        document.getElementById("rolePin").value = "";
    }
}

/* =========================
   MOSTRAR PASSWORD
========================= */
function togglePassword() {
    const passInput = document.getElementById("password");
    const eyeIcon   = document.getElementById("eyeIcon");

    if (passInput.type === "password") {
        passInput.type    = "text";
        eyeIcon.className = "fas fa-eye-slash";
    } else {
        passInput.type    = "password";
        eyeIcon.className = "fas fa-eye";
    }
}

/* =========================
   MENSAJES
========================= */
function showMessage(text, type) {
    const msg       = document.getElementById("message");
    msg.textContent = text;
    msg.className   = "form-message " + type;
}

function clearMessage() {
    const msg       = document.getElementById("message");
    msg.textContent = "";
    msg.className   = "form-message";
}

/* =========================
   FORMULARIO
========================= */
document.getElementById("loginForm")
    .addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            /* VALIDAR CAPTCHA */
            const captchaToken = grecaptcha.getResponse();
            if (!captchaToken) {
                showMessage("Por favor completa el captcha.", "error");
                return;
            }

            showMessage("Verificando captcha...", "success");

            const captchaRes  = await fetch("http://localhost:3000/api/captcha/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: captchaToken })
            });
            const captchaData = await captchaRes.json();

            if (!captchaData.valid) {
                showMessage("Captcha inválido. Intenta de nuevo.", "error");
                grecaptcha.reset();
                return;
            }

            const email    = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const config   = roleConfigs[currentRole];

            /* VALIDAR ROL */
            if (!currentRole) {
                showMessage("Selecciona un rol.", "error");
                return;
            }

            /* VALIDAR CORREO */
            if (!email.endsWith(config.emailDomain)) {
                showMessage(`El correo debe terminar en ${config.emailDomain}`, "error");
                return;
            }

            /* VALIDAR PASSWORD */
            if (password.length < 6) {
                showMessage("La contraseña debe tener mínimo 6 caracteres.", "error");
                return;
            }

            /* =========================
               REGISTRO
            ========================= */
            if (currentTab === "register") {

                const fullName = document.getElementById("fullName").value.trim();
                const idType   = document.getElementById("idType").value;
                const idNumber = document.getElementById("idNumber").value.trim();
                const confirm  = document.getElementById("confirmPassword").value;

                if (!fullName || !idType || !idNumber) {
                    showMessage("Completa todos los campos.", "error");
                    return;
                }

                if (password !== confirm) {
                    showMessage("Las contraseñas no coinciden.", "error");
                    return;
                }

                /* VALIDAR PIN si es admin o support */
                if (currentRole === "admin" || currentRole === "support") {
                    const pin = document.getElementById("rolePin").value.trim();

                    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                        showMessage("El PIN debe ser exactamente 4 dígitos numéricos.", "error");
                        return;
                    }

                    showMessage("Validando PIN...", "success");

                    const pinRes  = await fetch("http://localhost:3000/api/pins/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ role: currentRole, pin })
                    });
                    const pinData = await pinRes.json();

                    if (!pinData.valid) {
                        showMessage("PIN incorrecto. No tienes autorización para este rol.", "error");
                        return;
                    }
                }

                const names      = fullName.split(" ");
                const first_name = names[0] || "";
                const last_name  = names.slice(1).join(" ") || "";

                showMessage("Registrando usuario...", "success");

                const response = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        first_name,
                        last_name,
                        email,
                        password,
                        phone: "",
                        address: "",
                        user_type: currentRole,
                        identification_type_id: parseInt(idType),
                        identification_number: idNumber
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    showMessage(data.error || "Error al registrar", "error");
                    return;
                }

                showMessage("Cuenta creada correctamente.", "success");
                setTimeout(() => switchTab("login"), 1500);
                return;
            }

            /* =========================
               LOGIN
            ========================= */
            showMessage("Verificando credenciales...", "success");

            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.error || "Error login", "error");
                return;
            }

            localStorage.setItem("user", JSON.stringify(data.user));
            showMessage(`Bienvenido ${data.user.first_name}`, "success");

            setTimeout(() => {
                window.location.href = config.redirect;
            }, 1200);

        } catch (err) {
            console.error(err);
            showMessage("Error de conexión con el servidor.", "error");
        }
    });