const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

/* =========================
   MIDDLEWARES — PRIMERO
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   IMPORTAR RUTAS
========================= */
const authRoutes     = require('./routes/auth.routes');
const userRoutes     = require('./routes/user.routes');
const requestRoutes  = require('./routes/request.routes');
const responseRoutes = require('./routes/response.routes');
const pinRoutes      = require('./routes/pin.routes');
const captchaRoutes  = require('./routes/captcha.routes');

/* =========================
   CARPETA PUBLIC
========================= */
app.use(express.static(path.join(__dirname, 'public')));

/* =========================
   RUTAS API
========================= */
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/requests',  requestRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/pins',      pinRoutes);
app.use('/api/captcha',   captchaRoutes);

/* =========================
   RUTA PRINCIPAL
========================= */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/login.html'));
});

/* =========================
   MANEJO DE ERRORES
========================= */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

/* =========================
   SERVIDOR
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});