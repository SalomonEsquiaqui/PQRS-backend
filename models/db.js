const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// 🔥 PROBAR CONEXIÓN
pool.connect()
  .then(() => console.log('✅ Conectado a Supabase'))
  .catch(err => console.error('❌ Error de conexión', err));

module.exports = pool;