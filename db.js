const { Pool } = require('pg');

const isProduction = process.env.DATABASE_URL;

const pool = new Pool({
    // Jika di hosting, pakai URL. Jika di lokal, pakai objek konfigurasi
    connectionString: isProduction ? process.env.DATABASE_URL : null,
    user: isProduction ? null : 'postgres',
    host: isProduction ? null : 'localhost',
    database: isProduction ? null : 'db_umn_mahasiswa', // Ganti sesuai nama DB lokal Anda
    password: isProduction ? null : 'layenganteng123', // Ganti sesuai password lokal Anda
    port: isProduction ? null : 5432,
    ssl: isProduction ? { rejectUnauthorized: false } : false // Wajib SSL untuk hosting
});

module.exports = pool;