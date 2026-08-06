const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Permite receber dados JSON no corpo da requisição

// ROTA 1: Buscar todas as postagens cadastradas
app.get('/api/posts', async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT p.id, p.titulo, p.slug, p.conteudo, p.imagem_capa_url, p.criado_em,
                   u.nome AS autor, c.nome AS categoria
            FROM posts p
            LEFT JOIN usuarios u ON p.autor_id = u.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            ORDER BY p.criado_em DESC
        `);
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar posts' });
    }
});

// ROTA 2: Criar uma nova postagem (Exemplo para o seu Painel Admin)
app.post('/api/posts', async (req, res) => {
    const { titulo, slug, conteudo, imagem_capa_url, autor_id, categoria_id } = req.body;

    try {
        const [result] = await db.query(
            `INSERT INTO posts (titulo, slug, conteudo, imagem_capa_url, autor_id, categoria_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [titulo, slug, conteudo, imagem_capa_url, autor_id, categoria_id]
        );
        res.status(201).json({ mensagem: 'Post criado com sucesso!', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao criar post' });
    }
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}: http://localhost:${PORT}`);
});