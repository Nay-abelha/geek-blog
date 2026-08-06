const mysql = require('mysql2');
require('dotenv').config();

// Cria a piscina de conexões com o MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Converte para usar Promises (async/await)
const db = pool.promise();

// Testa a conexão ao iniciar
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erro ao conectar com o banco MySQL:', err.message);
    } else {
        console.log('✅ Conectado com sucesso ao banco de dados MySQL (geek)!');
        connection.release();
    }
});

module.exports = db;