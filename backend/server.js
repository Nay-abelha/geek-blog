const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();

// =========================================
// MIDDLEWARES DE SEGURANÇA
// =========================================

// Helmet - Headers de segurança HTTP
app.use(helmet());

// CORS - Restrito a origens específicas
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting - Previne ataques de força bruta
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de 100 requisições por IP
    message: { mensagem: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// Rate limit mais restrito para login/registro
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 tentativas por 15 minutos
    message: { mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

app.use(express.json({ limit: '10mb' })); // Limita tamanho do corpo da requisição

// =========================================
// FUNÇÕES AUXILIARES
// =========================================

// Middleware de autenticação JWT
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensagem: 'Token não fornecido. Faça login.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'seu-segredo-jwt', (err, user) => {
        if (err) {
            return res.status(403).json({ mensagem: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
}

// Middleware de validação de campos obrigatórios
function validarCampos(campos) {
    return (req, res, next) => {
        const faltando = campos.filter(campo => !req.body[campo]);
        if (faltando.length > 0) {
            return res.status(400).json({
                mensagem: `Campos obrigatórios faltando: ${faltando.join(', ')}`
            });
        }
        next();
    };
}

// Middleware de verificação de papéis
// Uso: app.rota('/', autenticarToken, verificarPapel('admin'), handler)
const PAPEIS_VALIDOS = ['admin', 'editor', 'autor'];
const ROLES_VALIDOS = PAPEIS_VALIDOS;
function verificarPapel(...papeisPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ mensagem: 'Não autenticado. Faça login.' });
        }
        if (!papeisPermitidos.includes(req.user.role)) {
            return res.status(403).json({
                mensagem: `Acesso negado. Seu papel é "${req.user.role}" e esta ação requer: ${papeisPermitidos.join(', ')}.`
            });
        }
        next();
    };
}

// Alias de compatibilidade (nome antigo em espanhol)
const verificarRole = verificarPapel;

// Verifica se o usuário pode editar/excluir um post específico:
// - o próprio autor sempre pode
// - editores e admins podem editar/excluir qualquer post
function podeGerenciarPost(post, user) {
    return post.autor_id === user.id || user.role === 'editor' || user.role === 'admin';
}

// Alias de compatibilidade (nome antigo em espanhol)
const podeGestionarPost = podeGerenciarPost;

// =========================================
// ROTAS DE POSTAGENS
// =========================================

// ROTA 1: Buscar todas as postagens cadastradas
app.get('/api/posts', async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT p.id, p.titulo, p.slug, p.conteudo, p.imagem_capa_url, p.criado_em, p.atualizado_em,
                   u.nome AS autor, c.nome AS categoria, p.autor_id, p.categoria_id
            FROM posts p
            LEFT JOIN usuarios u ON p.autor_id = u.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.status = 'publicado'
            ORDER BY p.criado_em DESC
        `);
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar posts' });
    }
});

// ROTA 1b: Posts para o painel (protegida): autor -> só seus posts; editor/admin -> todos
app.get('/api/posts/painel', autenticarToken, async (req, res) => {
    try {
        let sql = `
            SELECT p.id, p.titulo, p.slug, p.conteudo, p.imagem_capa_url, p.status,
                   p.criado_em, p.atualizado_em,
                   u.nome AS autor, c.nome AS categoria, p.autor_id, p.categoria_id
            FROM posts p
            LEFT JOIN usuarios u ON p.autor_id = u.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
        `;
        const params = [];

        // Escritores (autores) só veem seus próprios posts
        if (req.user.role === 'autor') {
            sql += ' WHERE p.autor_id = ?';
            params.push(req.user.id);
        }

        sql += ' ORDER BY p.criado_em DESC';

        const [posts] = await db.query(sql, params);
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar posts do painel' });
    }
});

// ROTA 1c: Post individual para edição no painel (protegida), incluye rascunhos
app.get('/api/posts/:id/painel', autenticarToken, async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT p.*, u.nome AS autor, c.nome AS categoria
            FROM posts p
            LEFT JOIN usuarios u ON p.autor_id = u.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (posts.length === 0) {
            return res.status(404).json({ mensagem: 'Post não encontrado.' });
        }

        const post = posts[0];
        if (!podeGestionarPost(post, req.user)) {
            return res.status(403).json({ mensagem: 'Você não tem permissão para editar este post.' });
        }

        res.json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar post' });
    }
});

// ROTA 2: Buscar postagem por ID
app.get('/api/posts/:id', async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT p.id, p.titulo, p.slug, p.conteudo, p.imagem_capa_url, p.criado_em, p.atualizado_em,
                   u.nome AS autor, c.nome AS categoria, p.autor_id, p.categoria_id
            FROM posts p
            LEFT JOIN usuarios u ON p.autor_id = u.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id = ? AND p.status = 'publicado'
        `, [req.params.id]);

        if (posts.length === 0) {
            return res.status(404).json({ mensagem: 'Post não encontrado.' });
        }

        res.json(posts[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar post' });
    }
});

// ROTA 3: Criar uma nova postagem (Protegida por autenticação)
app.post('/api/posts', autenticarToken, validarCampos(['titulo', 'slug', 'conteudo']), async (req, res) => {
    const { titulo, slug, conteudo, imagem_capa_url, categoria_id, status } = req.body;
    const autor_id = req.user.id;

    // Validar status: Escritores/editores/admin podem publicar ou salvar rascunho
    const statusFinal = ['publicado', 'rascunho'].includes(status) ? status : 'publicado';

    try {
        const [result] = await db.query(
            `INSERT INTO posts (titulo, slug, conteudo, imagem_capa_url, autor_id, categoria_id, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [titulo, slug, conteudo, imagem_capa_url || null, autor_id, categoria_id || null, statusFinal]
        );
        res.status(201).json({ mensagem: 'Post criado com sucesso!', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao criar post' });
    }
});

// ROTA 4: Atualizar postagem (Protegida por autenticação)
app.put('/api/posts/:id', autenticarToken, async (req, res) => {
    const { titulo, slug, conteudo, imagem_capa_url, categoria_id, status } = req.body;
    const postId = req.params.id;

    try {
        // Verifica se o post existe
        const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            return res.status(404).json({ mensagem: 'Post não encontrado.' });
        }

        // Verifica se o usuário pode editar (autor do post, editor ou admin)
        const post = posts[0];
        if (!podeGestionarPost(post, req.user)) {
            return res.status(403).json({ mensagem: 'Você não tem permissão para editar este post.' });
        }

        const statusFinal = ['publicado', 'rascunho'].includes(status) ? status : post.status;

        await db.query(
            `UPDATE posts 
             SET titulo = ?, slug = ?, conteudo = ?, imagem_capa_url = ?, categoria_id = ?, status = ?, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [titulo || post.titulo, slug || post.slug, conteudo || post.conteudo, 
             imagem_capa_url !== undefined ? imagem_capa_url : post.imagem_capa_url, 
             categoria_id !== undefined ? categoria_id : post.categoria_id, statusFinal, postId]
        );

        res.json({ mensagem: 'Post atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao atualizar post' });
    }
});

// ROTA 5: Excluir postagem (Protegida por autenticação)
app.delete('/api/posts/:id', autenticarToken, async (req, res) => {
    const postId = req.params.id;

    try {
        // Verifica se o post existe
        const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            return res.status(404).json({ mensagem: 'Post não encontrado.' });
        }

        // Verifica se o usuário pode excluir (autor do post, editor ou admin)
        const post = posts[0];
        if (!podeGestionarPost(post, req.user)) {
            return res.status(403).json({ mensagem: 'Você não tem permissão para excluir este post.' });
        }

        await db.query('DELETE FROM posts WHERE id = ?', [postId]);
        res.json({ mensagem: 'Post excluído com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao excluir post' });
    }
});

// =========================================
// ROTAS DE PERSONAGENS
// =========================================

// ROTA 6: Buscar todos os personagens
app.get('/api/personagens', async (req, res) => {
    try {
        const [personagens] = await db.query(`
            SELECT id, nome, editora, descricao, imagem_url, criado_em, atualizado_em
            FROM personagens
            ORDER BY nome ASC
        `);
        res.json(personagens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar personagens' });
    }
});

// ROTA 7: Buscar personagem por ID
app.get('/api/personagens/:id', async (req, res) => {
    try {
        const [personagens] = await db.query(
            'SELECT id, nome, editora, descricao, imagem_url, criado_em, atualizado_em FROM personagens WHERE id = ?',
            [req.params.id]
        );

        if (personagens.length === 0) {
            return res.status(404).json({ mensagem: 'Personagem não encontrado.' });
        }

        res.json(personagens[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar personagem' });
    }
});

// ROTA 8: Criar novo personagem (Protegida por autenticação)
app.post('/api/personagens', autenticarToken, validarCampos(['nome', 'editora']), async (req, res) => {
    const { nome, editora, descricao, imagem_url } = req.body;

    try {
        const [result] = await db.query(
            `INSERT INTO personagens (nome, editora, descricao, imagem_url) 
             VALUES (?, ?, ?, ?)`,
            [nome, editora, descricao || null, imagem_url || null]
        );
        res.status(201).json({ mensagem: 'Personagem criado com sucesso!', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao criar personagem' });
    }
});

// ROTA 9: Atualizar personagem (Protegida por autenticação)
app.put('/api/personagens/:id', autenticarToken, async (req, res) => {
    const { nome, editora, descricao, imagem_url } = req.body;
    const personagemId = req.params.id;

    try {
        // Verifica se o personagem existe
        const [personagens] = await db.query('SELECT * FROM personagens WHERE id = ?', [personagemId]);
        if (personagens.length === 0) {
            return res.status(404).json({ mensagem: 'Personagem não encontrado.' });
        }

        const personagem = personagens[0];

        await db.query(
            `UPDATE personagens 
             SET nome = ?, editora = ?, descricao = ?, imagem_url = ?, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [nome || personagem.nome, editora || personagem.editora, 
             descricao !== undefined ? descricao : personagem.descricao,
             imagem_url !== undefined ? imagem_url : personagem.imagem_url, personagemId]
        );

        res.json({ mensagem: 'Personagem atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao atualizar personagem' });
    }
});

// ROTA 10: Excluir personagem (Só admin)
app.delete('/api/personagens/:id', autenticarToken, verificarRole('admin'), async (req, res) => {
    const personagemId = req.params.id;

    try {
        const [result] = await db.query('DELETE FROM personagens WHERE id = ?', [personagemId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Personagem não encontrado.' });
        }

        res.json({ mensagem: 'Personagem excluído com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao excluir personagem' });
    }
});

// =========================================
// ROTAS DE AUTENTICAÇÃO
// =========================================

// ROTA 11: Registro de usuário
app.post('/api/register', validarCampos(['nome', 'email', 'senha']), async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        // Verifica se o email já existe
        const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.status(409).json({ mensagem: 'E-mail já cadastrado.' });
        }

        // Hash da senha com bcrypt
        const senhaHash = await bcrypt.hash(senha, 10);

        // Insere o usuário
        const [result] = await db.query(
            'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
            [nome, email, senhaHash, 'autor']
        );

        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
    }
});

// ROTA 12: Login de usuário
app.post('/api/login', validarCampos(['email', 'senha']), async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Busca o usuário pelo email
        const [usuarios] = await db.query(
            'SELECT id, nome, email, senha_hash, role FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
        }

        const usuario = usuarios[0];

        // Verifica a senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
            process.env.JWT_SECRET || 'seu-segredo-jwt',
            { expiresIn: '8h' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao fazer login' });
    }
});

// =========================================
// ROTAS DE USUÁRIOS (LGPD)
// =========================================

// ROTA 13: Acesso aos dados do usuário (LGPD Art. 18)
app.get('/api/usuarios/:id/dados', autenticarToken, async (req, res) => {
    try {
        // Verifica se o usuário está acessando seus próprios dados ou é admin
        if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
            return res.status(403).json({ mensagem: 'Acesso negado.' });
        }

        const [usuarios] = await db.query(
            'SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = ?',
            [req.params.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        res.json(usuarios[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar dados do usuário' });
    }
});

// ROTA 14: Exclusão de dados do usuário (LGPD Art. 18)
app.delete('/api/usuarios/:id', autenticarToken, async (req, res) => {
    try {
        // Verifica se o usuário está excluindo seus próprios dados ou é admin
        if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
            return res.status(403).json({ mensagem: 'Acesso negado.' });
        }

        // Exclui os posts do usuário (ou define autor_id como NULL)
        await db.query('UPDATE posts SET autor_id = NULL WHERE autor_id = ?', [req.params.id]);

        // Exclui o usuário
        const [result] = await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        res.json({ mensagem: 'Dados do usuário excluídos com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao excluir dados do usuário' });
    }
});

// =========================================
// ROTA 15: Chat com IA (OpenAI)
// =========================================
app.post('/api/chat', autenticarToken, validarCampos(['mensagem']), async (req, res) => {
    const { mensagem } = req.body;

    try {
        const OpenAI = require('openai');
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é um assistente do GeekBlog, especializado em cultura geek, HQs, filmes e personagens." },
                { role: "user", content: mensagem }
            ],
            max_tokens: 500
        });

        res.json({ resposta: response.choices[0].message.content });
    } catch (error) {
        console.error('Erro no chat:', error);
        res.status(500).json({ mensagem: 'Erro ao processar mensagem no chat.' });
    }
});

// =========================================
// ROTAS DE GESTION DE USUÁRIOS (Só admin)
// =========================================

// ROTA 16: Listar todos os usuários (Só admin)
app.get('/api/usuarios', autenticarToken, verificarRole('admin'), async (req, res) => {
    try {
        const [usuarios] = await db.query(
            'SELECT id, nome, email, role, criado_em FROM usuarios ORDER BY criado_em DESC'
        );
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao listar usuários' });
    }
});

// ROTA 17: Criar usuário com papel específico (Só admin)
app.post('/api/usuarios', autenticarToken, verificarRole('admin'), validarCampos(['nome', 'email', 'senha', 'role']), async (req, res) => {
    const { nome, email, senha, role } = req.body;

    if (!ROLES_VALIDOS.includes(role)) {
        return res.status(400).json({ mensagem: `Papel inválido. Use um de: ${ROLES_VALIDOS.join(', ')}.` });
    }

    try {
        // Verifica se o email já existe
        const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.status(409).json({ mensagem: 'E-mail já cadastrado.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [result] = await db.query(
            'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
            [nome, email, senhaHash, role]
        );

        res.status(201).json({ mensagem: `Usuário ${role} criado com sucesso!`, id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao criar usuário' });
    }
});

// ROTA 18: Mudar papel de um usuário (Só admin)
app.put('/api/usuarios/:id/role', autenticarToken, verificarRole('admin'), async (req, res) => {
    const { role } = req.body;

    if (!ROLES_VALIDOS.includes(role)) {
        return res.status(400).json({ mensagem: `Papel inválido. Use um de: ${ROLES_VALIDOS.join(', ')}.` });
    }

    try {
        // Não permitir que um admin mude seu próprio papel (evita ficar sem admins)
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ mensagem: 'Você não pode mudar seu próprio papel.' });
        }

        const [result] = await db.query('UPDATE usuarios SET role = ? WHERE id = ?', [role, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        res.json({ mensagem: 'Papel atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao atualizar papel' });
    }
});

// =========================================
// ROTA DE ESTATÍSTICAS DO SITE (Só admin)
// =========================================

// ROTA 19: Dashboard / funcionamento do site
app.get('/api/stats', autenticarToken, verificarRole('admin'), async (req, res) => {
    try {
        const [[usuarios]] = await db.query(`
            SELECT COUNT(*) AS total,
                   SUM(role = 'admin')  AS admins,
                   SUM(role = 'editor') AS editores,
                   SUM(role = 'autor')  AS escritores
            FROM usuarios
        `);

        const [[posts]] = await db.query(`
            SELECT COUNT(*) AS total,
                   SUM(status = 'publicado') AS publicados,
                   SUM(status = 'rascunho')  AS rascunhos
            FROM posts
        `);

        const [[personagens]] = await db.query('SELECT COUNT(*) AS total FROM personagens');
        const [[categorias]] = await db.query('SELECT COUNT(*) AS total FROM categorias');

        const [recientes] = await db.query(`
            SELECT p.id, p.titulo, p.status, p.criado_em, u.nome AS autor
            FROM posts p
            LEFT JOIN usuarios u ON p.autor_id = u.id
            ORDER BY p.criado_em DESC
            LIMIT 6
        `);

        res.json({
            usuarios,
            posts,
            personagens,
            categorias,
            recientes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao carregar estatísticas' });
    }
});

// =========================================
// Middleware de tratamento de erros global
// =========================================
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

// =========================================
// Inicialização do servidor
// =========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}: http://localhost:${PORT}`);
});