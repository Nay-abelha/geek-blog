/* ============================================================
   GeekBlog - Motor de Painel por papéis
   Arquivo compartilhado por: escritor.html | editor.html | adm.html
   Cada página define window.PANEL_CONFIG antes de carregar este script.
   ------------------------------------------------------------
   Papéis:
     - admin  -> posts (todos), personagens, estatísticas, usuários
     - editor -> posts (todos: criados por qualquer autor)
     - autor  -> posts (só os seus)
   ============================================================ */
(function () {
    'use strict';

    const API_URL = 'http://localhost:3000';
    const config = window.PANEL_CONFIG || {};
    const PAPEIS_PERMITIDOS = config.roles || ['autor'];
    const TITULO = config.titulo || 'Painel GeekBlog';
    const DESCRICAO = config.descricao || '';

    // Página destino de cada papel (para redirecionar quando alguém entra na página errada)
    const PAGINA_POR_PAPEL = {
        admin: 'adm.html',
        editor: 'editor.html',
        autor: 'escritor.html'
    };

    const NOME_PAPEL = {
        admin: 'Administrador',
        editor: 'Editor',
        autor: 'Escritor'
    };

    const contem = (arr, valor) => arr.indexOf(valor) !== -1;

    // Aliases de compatibilidade (nomes antigos em espanhol)
    const PAGINA_POR_ROL = PAGINA_POR_PAPEL;
    const NOMBRE_ROL = NOME_PAPEL;
    const ROLES_PERMITIDOS = PAPEIS_PERMITIDOS;
    const contiene = contem;

    // ============================================================
    // SESSÃO
    // ============================================================
    function obterSessao() {
        const token = localStorage.getItem('token');
        let usuario = null;
        try {
            usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
        } catch (e) {
            usuario = null;
        }
        return { token, usuario };
    }

    function encerrarSessao() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }

    // Aliases de compatibilidade (nomes antigos em espanhol)
    const obtenerSesion = obterSessao;
    const cerrarSesion = encerrarSessao;

    // ============================================================
    // FETCH com token (e tratamento de 401/403)
    // ============================================================
    async function apiFetch(path, opcoes) {
        const { token } = obterSessao();
        opcoes = opcoes || {};
        const cab = Object.assign({}, opcoes.headers || {});
        cab['Authorization'] = 'Bearer ' + token;
        if (opcoes.body !== undefined) cab['Content-Type'] = 'application/json';

        let resposta;
        try {
            resposta = await fetch(API_URL + path, Object.assign({}, opcoes, { headers: cab }));
        } catch (e) {
            throw new Error('Não foi possível conectar com o servidor. Verifique se o backend está ativo.');
        }

        let dados = {};
        try { dados = await resposta.json(); } catch (e) { dados = {}; }

        if (resposta.status === 401) {
            encerrarSessao();
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        return { ok: resposta.ok, status: resposta.status, dados };
    }

    // ============================================================
    // Utilidades
    // ============================================================
    function escapar(texto) {
        if (texto === null || texto === undefined) return '';
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatarData(iso) {
        if (!iso) return '—';
        const data = new Date(iso);
        if (isNaN(data.getTime())) return '—';
        return data.toLocaleDateString('pt-BR');
    }

    const TEXTOS_STATUS = { publicado: '✅ Publicado', rascunho: '📝 Rascunho' };

    function badgeStatus(status) {
        return TEXTOS_STATUS[status]
            ? `<span class="badge-status badge-${status}">${TEXTOS_STATUS[status]}</span>`
            : `<span class="badge-status">${escapar(status)}</span>`;
    }

    function mostrarMensagem(id, texto, tipo) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = texto;
        el.className = 'mensagem ' + (tipo || '');
        el.style.display = 'block';
    }

    function ocultarMensagem(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'none';
    }

    // Aliases de compatibilidade (nomes antigos em espanhol)
    const mostrarMensaje = mostrarMensagem;
    const ocultarMensaje = ocultarMensagem;
    const formatearFecha = formatarData;

    // ============================================================
    // Portas de acesso (verificação de papel no FRONTEND)
    // ============================================================
    function renderLoginRequerido(container) {
        container.innerHTML = `
            <div class="login-required">
                <h2>🔒 Acesso Restringido</h2>
                <p>Você precisa estar logado para acessar o painel.</p>
                <p class="login-required-links">
                    <a href="login.html">Fazer Login</a> |
                    <a href="cadastro.html">Criar Conta</a>
                </p>
            </div>`;
    }

    function renderAcessoNegado(container, usuario) {
        const destino = PAGINA_POR_PAPEL[usuario.role] || 'login.html';
        const nomePapel = NOME_PAPEL[usuario.role] || usuario.role;
        container.innerHTML = `
            <div class="login-required acesso-negado">
                <h2>⛔ Acesso Negado</h2>
                <p><b>${escapar(usuario.nome)}</b>, sua conta é do tipo <b>${nomePapel}</b> e você não tem
                   permissão para entrar nesta seção.</p>
                <p class="login-required-links">
                    <a href="${destino}">Ir ao meu painel de ${nomePapel.toLowerCase()}</a> |
                    <a href="index.html">Voltar ao site</a>
                </p>
            </div>`;
    }

    // Alias de compatibilidade (nome antigo em espanhol)
    const renderAccesoDenegado = renderAcessoNegado;

    // ============================================================
    // ESTADO GLOBAL DO PAINEL
    // ============================================================
    let postEditandoId = null;
    let personajeEditandoId = null;

    // ============================================================
    // Render principal do painel
    // ============================================================
    function renderPanel(container) {
        const { usuario } = obtenerSesion();
        const esAdmin = usuario.role === 'admin';

        const tabsAdmin = esAdmin ? `
            <button class="admin-tab" data-tab="estadisticas" onclick="window.Panel.mudarAba('estadisticas')">📊 Estatísticas</button>
            <button class="admin-tab" data-tab="personagens" onclick="window.Panel.mudarAba('personagens')">🦸 Personagens</button>
            <button class="admin-tab" data-tab="usuarios" onclick="window.Panel.mudarAba('usuarios')">👥 Usuários</button>` : '';

        container.innerHTML = `
            <div class="admin-header">
                <div class="admin-header-titulo">
                    <h1>${escapar(TITULO)}</h1>
                    ${DESCRICAO ? `<p class="admin-descripcion">${escapar(DESCRICAO)}</p>` : ''}
                </div>
                <div>
                    <span class="admin-user">👤 ${escapar(usuario.nome)} <span class="role-badge role-${escapar(usuario.role)}">${NOME_PAPEL[usuario.role] || escapar(usuario.role)}</span></span>
                    <a class="btn-ver-sitio" href="index.html">🌐 Ver site</a>
                    <button class="btn-logout" onclick="window.Panel.logout()">Sair</button>
                </div>
            </div>

            <div class="admin-tabs">
                <button class="admin-tab active" data-tab="posts" onclick="window.Panel.mudarAba('posts')">📄 Postagens</button>
                ${tabsAdmin}
            </div>

            <!-- ===== ABA DE POSTAGENS ===== -->
            <div id="aba-posts" class="admin-tab-content active">
                <h2 id="titulo-form-post">✍️ Nova Publicação</h2>

                <form id="form-post">
                    <div class="form-group">
                        <label for="titulo">Título *</label>
                        <input type="text" id="titulo" placeholder="Título da publicação" required>
                    </div>
                    <div class="form-group">
                        <label for="slug">Slug (URL amigável) *</label>
                        <input type="text" id="slug" placeholder="ex: novo-trailer-vingadores" required>
                    </div>
                    <div class="form-group">
                        <label for="conteudo">Conteúdo *</label>
                        <textarea id="conteudo" placeholder="Escreva o conteúdo da publicação..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="imagem_capa_url">URL da Imagem de Capa</label>
                        <input type="url" id="imagem_capa_url" placeholder="https://exemplo.com/imagem.jpg">
                    </div>
                    <div class="form-group form-row">
                        <div>
                            <label for="categoria_id">Categoria</label>
                            <select id="categoria_id">
                                <option value="">Selecione uma categoria</option>
                                <option value="1">Notícias</option>
                                <option value="2">HQs</option>
                                <option value="3">Filmes</option>
                                <option value="4">Personagens</option>
                            </select>
                        </div>
                        <div>
                            <label for="status">Status</label>
                            <select id="status">
                                <option value="publicado">Publicar agora</option>
                                <option value="rascunho">Salvar como rascunho</option>
                            </select>
                        </div>
                    </div>

                    <div id="mensaje-post" class="mensagem"></div>

                    <button type="submit" class="btn-admin" id="btn-submit-post">Publicar Post</button>
                    <button type="button" class="btn-cancelar" id="btn-cancelar-edicao-post" style="display:none;" onclick="window.Panel.cancelarEdicionPost()">Cancelar Edição</button>
                </form>

                <h2 id="titulo-lista-posts">📄 Meus Posts</h2>
                <div id="lista-posts">
                    <p class="admin-post-card texto-carregando">Carregando publicações...</p>
                </div>
            </div>
`;

        if (esAdmin) {
            container.insertAdjacentHTML('beforeend', `
                <!-- ===== ABA DE PERSONAGENS ===== -->
                <div id="aba-personagens" class="admin-tab-content" hidden>
                    <h2>🦸 Criar Novo Personagem</h2>

                    <form id="form-personagem">
                        <div class="form-group">
                            <label for="nome-personagem">Nome *</label>
                            <input type="text" id="nome-personagem" placeholder="Nome do personagem" required>
                        </div>
                        <div class="form-group">
                            <label for="editora-personagem">Editora *</label>
                            <input type="text" id="editora-personagem" placeholder="Ex: Marvel Comics, DC Comics" required>
                        </div>
                        <div class="form-group">
                            <label for="descricao-personagem">Descrição</label>
                            <textarea id="descricao-personagem" placeholder="Breve descrição..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="imagem-personagem">URL da Imagem</label>
                            <input type="url" id="imagem-personagem" placeholder="https://exemplo.com/personagem.jpg">
                        </div>

                        <div id="mensaje-personagem" class="mensagem"></div>

                        <button type="submit" class="btn-admin" id="btn-submit-personagem">Adicionar Personagem</button>
                        <button type="button" class="btn-cancelar" id="btn-cancelar-edicion-personagem" style="display:none;" onclick="window.Panel.cancelarEdicionPersonaje()">Cancelar Edição</button>
                    </form>

                    <h2>🦸 Personagens Registrados</h2>
                    <div id="lista-personagens">
                        <p class="admin-post-card texto-carregando">Carregando personagens...</p>
                    </div>
                </div>

                <!-- ===== ABA DE ESTADÍSTICAS ===== -->
                <div id="aba-estadisticas" class="admin-tab-content" hidden>
                    <h2>📊 Funcionamento do Site</h2>
                    <div class="stats-grid" id="stats-grid">
                        <p class="texto-carregando">Carregando estatísticas...</p>
                    </div>
                    <h2>🕘 Posts Recentes</h2>
                    <div id="stats-recientes">
                        <p class="texto-carregando">Carregando...</p>
                    </div>
                </div>

                <!-- ===== ABA DE USUÁRIOS ===== -->
                <div id="aba-usuarios" class="admin-tab-content" hidden>
                    <h2>👥 Criar Usuário com Papel</h2>
                    <form id="form-usuario">
                        <div class="form-group">
                            <label for="nome-usuario">Nome *</label>
                            <input type="text" id="nome-usuario" placeholder="Nome completo" required>
                        </div>
                        <div class="form-group">
                            <label for="email-usuario">E-mail *</label>
                            <input type="email" id="email-usuario" placeholder="usuario@geek.com" required>
                        </div>
                        <div class="form-group">
                            <label for="senha-usuario">Senha *</label>
                            <input type="password" id="senha-usuario" placeholder="Mínimo 6 caracteres" minlength="6" required>
                        </div>
                        <div class="form-group">
                            <label for="role-usuario">Papel *</label>
                            <select id="role-usuario" required>
                                <option value="autor">Escritor (autor)</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div id="mensaje-usuario" class="mensagem"></div>
                        <button type="submit" class="btn-admin">Criar Usuário</button>
                    </form>

                    <h2>👥 Usuários do Site</h2>
                    <div id="lista-usuarios">
                        <p class="admin-post-card texto-carregando">Carregando usuários...</p>
                    </div>
                </div>
            `);
        }
    }

    // ============================================================
    // ABAS
    // ============================================================
    function mudarAba(aba) {
        document.querySelectorAll('.admin-tab').forEach(function (tab) {
            tab.classList.toggle('active', tab.dataset.tab === aba);
        });
        document.querySelectorAll('.admin-tab-content').forEach(function (contenido) {
            contenido.hidden = contenido.id !== 'aba-' + aba;
            contenido.classList.toggle('active', contenido.id === 'aba-' + aba);
        });

        if (aba === 'posts') cargarPosts();
        if (aba === 'personagens') cargarPersonagens();
        if (aba === 'estadisticas') cargarEstadisticas();
        if (aba === 'usuarios') cargarUsuarios();
    }

    function logout() {
        cerrarSesion();
    }

    // ============================================================
    // CRUD DE POSTS
    // ============================================================
    async function cargarPosts() {
        const contenedor = document.getElementById('lista-posts');
        if (!contenedor) return;

        try {
            const { ok, datos } = await apiFetch('/api/posts/painel');
            if (!ok) {
                contenedor.innerHTML = '<p class="admin-post-card texto-erro">Erro ao carregar publicações.</p>';
                return;
            }

            if (datos.length === 0) {
                contenedor.innerHTML = '<p class="admin-post-card texto-carregando">Nenhum post ainda.</p>';
                return;
            }

            const { usuario } = obtenerSesion();
            const verAutor = usuario.role !== 'autor';

            contenedor.innerHTML = datos.map(function (post) {
                const porAutor = verAutor ? ` <span class="post-autor">✍️ ${escapar(post.autor || 'Desconhecido')}</span>` : '';
                return `
                    <div class="admin-post-card">
                        <div class="admin-post-header">
                            <div>
                                <h3>${escapar(post.titulo)}</h3>
                                ${badgeStatus(post.status)}
                            </div>
                            <div class="admin-post-acoes">
                                <button class="btn-editar" onclick="window.Panel.editarPost(${post.id})">✏️ Editar</button>
                                <button class="btn-excluir" onclick="window.Panel.excluirPost(${post.id})">🗑️ Excluir</button>
                            </div>
                        </div>
                        <p>${porAutor} | ${escapar(post.categoria || 'Sem categoria')} | ${formatearFecha(post.criado_em)}</p>
                        <p class="admin-post-resumo">${escapar((post.conteudo || '').substring(0, 150))}${post.conteudo && post.conteudo.length > 150 ? '...' : ''}</p>
                    </div>`;
            }).join('');
        } catch (e) {
            contenedor.innerHTML = '<p class="admin-post-card texto-erro">' + escapar(e.message || 'Erro ao carregar publicações.') + '</p>';
        }
    }

    async function enviarFormPost(evento) {
        evento.preventDefault();
        ocultarMensaje('mensaje-post');

        const datosPost = {
            titulo: document.getElementById('titulo').value.trim(),
            slug: document.getElementById('slug').value.trim(),
            conteudo: document.getElementById('conteudo').value.trim(),
            imagem_capa_url: document.getElementById('imagem_capa_url').value.trim() || null,
            categoria_id: document.getElementById('categoria_id').value || null,
            status: document.getElementById('status').value
        };

        try {
            const { ok, datos } = await apiFetch(postEditandoId ? `/api/posts/${postEditandoId}` : '/api/posts', {
                method: postEditandoId ? 'PUT' : 'POST',
                body: JSON.stringify(datosPost)
            });

            if (!ok) {
                const mensaje = (datos && datos.mensagem) || 'Não foi possível salvar a publicação.';
                mostrarMensagem('mensagem-post', '⛔ ' + mensagem, 'erro');
                if (datos && datos.mensagem && postEditandoId) cargarPosts();
                return;
            }

            mostrarMensagem('mensagem-post', '✅ ' + (dados.mensagem || 'Publicação salva.'), 'sucesso');
            document.getElementById('form-post').reset();
            postEditandoId = null;
            document.getElementById('titulo-form-post').textContent = '✍️ Nova Publicação';
            document.getElementById('btn-submit-post').textContent = 'Publicar Post';
            document.getElementById('btn-cancelar-edicao-post').style.display = 'none';
            cargarPosts();
        } catch (e) {
            mostrarMensagem('mensagem-post', e.message || 'Erro de conexão com o servidor.', 'erro');
        }
    }

    async function editarPost(id) {
        try {
            const { ok, datos } = await apiFetch(`/api/posts/${id}/painel`);
            if (!ok) {
                alert('⛔ ' + ((datos && datos.mensagem) || 'Você não tem permissão para editar este post.'));
                return;
            }

            document.getElementById('titulo').value = datos.titulo;
            document.getElementById('slug').value = datos.slug;
            document.getElementById('conteudo').value = datos.conteudo;
            document.getElementById('imagem_capa_url').value = datos.imagem_capa_url || '';
            document.getElementById('categoria_id').value = datos.categoria_id || '';
            document.getElementById('status').value = datos.status || 'publicado';

            postEditandoId = id;
            document.getElementById('titulo-form-post').textContent = '✏️ Editando Publicação #' + id;
            document.getElementById('btn-submit-post').textContent = '💾 Salvar Alterações';
            document.getElementById('btn-cancelar-edicao-post').style.display = 'inline-block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            ocultarMensaje('mensaje-post');
        } catch (e) {
            alert(e.message || 'Erro ao buscar o post.');
        }
    }

    function cancelarEdicionPost() {
        postEditandoId = null;
        const form = document.getElementById('form-post');
        if (form) form.reset();
        document.getElementById('titulo-form-post').textContent = '✍️ Nova Publicação';
        document.getElementById('btn-submit-post').textContent = 'Publicar Post';
        document.getElementById('btn-cancelar-edicao-post').style.display = 'none';
        ocultarMensaje('mensaje-post');
    }

    async function excluirPost(id) {
        if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;

        try {
            const { ok, datos } = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
            if (ok) {
                alert('✅ ' + (datos.mensagem || 'Publicação excluída.'));
            } else {
                alert('⛔ ' + ((datos && datos.mensagem) || 'Você não tem permissão para excluir este post.'));
                return;
            }
            cargarPosts();
        } catch (e) {
            alert(e.message || 'Erro ao excluir a publicação.');
        }
    }

    // ============================================================
    // CRUD DE PERSONAGENS (só admin)
    // ============================================================
    async function cargarPersonagens() {
        const contenedor = document.getElementById('lista-personagens');
        if (!contenedor) return;

        try {
            const { ok, datos } = await apiFetch('/api/personagens');
            if (!ok) {
                contenedor.innerHTML = '<p class="admin-post-card texto-erro">Erro ao carregar personagens.</p>';
                return;
            }

            if (datos.length === 0) {
                contenedor.innerHTML = '<p class="admin-post-card texto-carregando">Ainda não há personagens registrados.</p>';
                return;
            }

            contenedor.innerHTML = datos.map(function (personaje) {
                const imagen = personaje.imagen_url
                    ? `<img class="admin-personagem-img" src="${escapar(personaje.imagen_url)}" alt="${escapar(personaje.nome)}" onerror="this.style.display='none'">`
                    : `<div class="admin-personagem-img admin-personagem-img-placeholder">🦸</div>`;

                return `
                    <div class="admin-post-card admin-personagem-card">
                        <div class="admin-personagem-info">
                            ${imagen}
                            <div class="admin-personagem-detalhes">
                                <h3>${escapar(personaje.nome)}</h3>
                                <p>${escapar(personaje.editora)}</p>
                            </div>
                        </div>
                        <div class="admin-post-acoes">
                            <button class="btn-editar" onclick="window.Panel.editarPersonaje(${personaje.id})">✏️ Editar</button>
                            <button class="btn-excluir" onclick="window.Panel.excluirPersonaje(${personaje.id})">🗑️ Excluir</button>
                        </div>
                    </div>`;
            }).join('');
        } catch (e) {
            contenedor.innerHTML = '<p class="admin-post-card texto-erro">' + escapar(e.message || 'Erro ao carregar personagens.') + '</p>';
        }
    }

    async function enviarFormPersonaje(evento) {
        evento.preventDefault();
        ocultarMensaje('mensaje-personagem');

        const datosPersonaje = {
            nome: document.getElementById('nome-personagem').value.trim(),
            editora: document.getElementById('editora-personagem').value.trim(),
            descricao: document.getElementById('descricao-personagem').value.trim(),
            imagem_url: document.getElementById('imagem-personagem').value.trim() || null
        };

        try {
            const { ok, datos } = await apiFetch(personajeEditandoId ? `/api/personagens/${personajeEditandoId}` : '/api/personagens', {
                method: personajeEditandoId ? 'PUT' : 'POST',
                body: JSON.stringify(datosPersonaje)
            });

            if (!ok) {
                mostrarMensagem('mensagem-personagem', '⛔ ' + ((dados && dados.mensagem) || 'Não foi possível salvar o personagem.'), 'erro');
                return;
            }

            mostrarMensagem('mensagem-personagem', '✅ ' + (dados.mensagem || 'Personagem salvo.'), 'sucesso');
            document.getElementById('form-personagem').reset();
            personajeEditandoId = null;
            document.getElementById('btn-submit-personagem').textContent = 'Adicionar Personagem';
            document.getElementById('btn-cancelar-edicion-personagem').style.display = 'none';
            cargarPersonagens();
        } catch (e) {
            mostrarMensagem('mensagem-personagem', e.message || 'Erro de conexão com o servidor.', 'erro');
        }
    }

    async function editarPersonaje(id) {
        const { ok, datos } = await apiFetch(`/api/personagens/${id}`);

        if (!ok) {
            alert('⛔ ' + ((datos && datos.mensagem) || 'Você não tem permissão para editar este personagem.'));
            return;
        }

        document.getElementById('nome-personagem').value = datos.nome;
        document.getElementById('editora-personagem').value = datos.editora;
        document.getElementById('descricao-personagem').value = datos.descricao || '';
        document.getElementById('imagem-personagem').value = datos.imagem_url || '';

        personajeEditandoId = id;
        document.getElementById('btn-submit-personagem').textContent = '💾 Salvar Alterações';
        document.getElementById('btn-cancelar-edicion-personagem').style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        ocultarMensaje('mensaje-personagem');
    }

    function cancelarEdicionPersonaje() {
        personajeEditandoId = null;
        const form = document.getElementById('form-personagem');
        if (form) form.reset();
        document.getElementById('btn-submit-personagem').textContent = 'Adicionar Personagem';
        document.getElementById('btn-cancelar-edicion-personagem').style.display = 'none';
        ocultarMensaje('mensaje-personagem');
    }

    async function excluirPersonaje(id) {
        if (!confirm('Tem certeza que deseja excluir este personagem?')) return;

        const { ok, datos } = await apiFetch(`/api/personagens/${id}`, { method: 'DELETE' });

        if (ok) {
            alert('✅ ' + (datos.mensagem || 'Personagem excluído.'));
            cargarPersonagens();
        } else {
            alert('⛔ ' + ((datos && datos.mensagem) || 'Você não tem permissão para excluir este personagem.'));
        }
    }

    // ============================================================
    // ESTATÍSTICAS (só admin)
    // ============================================================
    async function cargarEstadisticas() {
        const grid = document.getElementById('stats-grid');
        const recientes = document.getElementById('stats-recientes');
        if (!grid || !recientes) return;

        try {
            const { ok, datos } = await apiFetch('/api/stats');
            if (!ok) {
                grid.innerHTML = '<p class="texto-erro">Erro ao carregar as estatísticas.</p>';
                return;
            }

            const tarjetas = [
                { icono: '👥', etiqueta: 'Usuários', valor: datos.usuarios.total, extra: `Escritores: ${datos.usuarios.escritores || 0} · Editores: ${datos.usuarios.editores || 0} · Admins: ${datos.usuarios.admins || 0}` },
                { icono: '📄', etiqueta: 'Publicações', valor: datos.posts.total, extra: `Publicados: ${datos.posts.publicados || 0} · Rascunhos: ${datos.posts.rascunhos || 0}` },
                { icono: '🦸', etiqueta: 'Personagens', valor: datos.personagens.total, extra: 'Catálogo' },
                { icono: '🗂️', etiqueta: 'Categorias', valor: datos.categorias.total, extra: 'Seções do blog' }
            ];

            grid.innerHTML = tarjetas.map(function (tarjeta) {
                return `
                    <div class="stats-card">
                        <div class="stats-card-icono">${tarjeta.icono}</div>
                        <div class="stats-card-info">
                            <span class="stats-card-valor">${escapar(tarjeta.valor)}</span>
                            <span class="stats-card-etiqueta">${escapar(tarjeta.etiqueta)}</span>
                            <span class="stats-card-extra">${escapar(tarjeta.extra)}</span>
                        </div>
                    </div>`;
            }).join('');

            if (datos.recientes.length === 0) {
                recientes.innerHTML = '<p class="texto-carregando">Sem publicações recentes.</p>';
                return;
            }

            recientes.innerHTML = `
                <table class="stats-tabla">
                    <thead>
                        <tr><th>Título</th><th>Autor</th><th>Status</th><th>Data</th></tr>
                    </thead>
                    <tbody>
                        ${datos.recientes.map(function (post) {
                            return `<tr>
                                <td>${escapar(post.titulo)}</td>
                                <td>${escapar(post.autor || 'Desconhecido')}</td>
                                <td>${badgeStatus(post.status)}</td>
                                <td>${formatearFecha(post.criado_em)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;
        } catch (e) {
            grid.innerHTML = '<p class="texto-erro">' + escapar(e.message || 'Erro ao carregar as estatísticas.') + '</p>';
        }
    }

    // ============================================================
    // USUÁRIOS (só admin)
    // ============================================================
    async function cargarUsuarios() {
        const contenedor = document.getElementById('lista-usuarios');
        if (!contenedor) return;

        try {
            const { ok, datos } = await apiFetch('/api/usuarios');
            if (!ok) {
                contenedor.innerHTML = '<p class="admin-post-card texto-erro">Erro ao carregar usuários.</p>';
                return;
            }

            if (datos.length === 0) {
                contenedor.innerHTML = '<p class="admin-post-card texto-carregando">Ainda não há usuários registrados.</p>';
                return;
            }

            // O backend impede que um admin mude o próprio papel
            const { usuario } = obtenerSesion();

            contenedor.innerHTML = `
                <table class="stats-tabla usuarios-tabla">
                    <thead>
                        <tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Papel</th><th>Registro</th></tr>
                    </thead>
                    <tbody>
                        ${datos.map(function (u) {
                            const opciones = ['admin', 'editor', 'autor'].map(function (rol) {
                                return `<option value="${rol}" ${rol === u.role ? 'selected' : ''}>${NOMBRE_ROL[rol]}</option>`;
                            }).join('');

                            const accion = u.id === usuario.id
                                ? '<span class="texto-muted">(você)</span>'
                                : `<select class="select-rol" onchange="window.Panel.cambiarRol(${u.id}, this.value)">${opciones}</select>`;

                            return `<tr>
                                <td>${u.id}</td>
                                <td>${escapar(u.nome)}</td>
                                <td>${escapar(u.email)}</td>
                                <td>${accion}</td>
                                <td>${formatearFecha(u.criado_em)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;
        } catch (e) {
            contenedor.innerHTML = '<p class="admin-post-card texto-erro">' + escapar(e.message || 'Erro ao carregar usuários.') + '</p>';
        }
    }

    async function enviarFormUsuario(evento) {
        evento.preventDefault();
        ocultarMensaje('mensaje-usuario');

        const datosUsuario = {
            nome: document.getElementById('nome-usuario').value.trim(),
            email: document.getElementById('email-usuario').value.trim(),
            senha: document.getElementById('senha-usuario').value,
            role: document.getElementById('role-usuario').value
        };

        try {
            const { ok, datos } = await apiFetch('/api/usuarios', {
                method: 'POST',
                body: JSON.stringify(datosUsuario)
            });

            if (!ok) {
                mostrarMensaje('mensaje-usuario', '⛔ ' + ((datos && datos.mensagem) || 'Não foi possível criar o usuário.'), 'erro');
                return;
            }

            mostrarMensaje('mensaje-usuario', '✅ ' + (datos.mensagem || 'Usuário criado.'), 'sucesso');
            document.getElementById('form-usuario').reset();
            cargarUsuarios();
        } catch (e) {
            mostrarMensagem('mensagem-usuario', e.message || 'Erro de conexão com o servidor.', 'erro');
        }
    }

    async function cambiarRol(id, role) {
        if (!confirm('Mudar o papel deste usuário?')) {
            cargarUsuarios();
            return;
        }

        try {
            const { ok, datos } = await apiFetch(`/api/usuarios/${id}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role })
            });

            if (!ok) {
                alert('⛔ ' + ((datos && dados.mensagem) || 'Não foi possível mudar o papel.'));
            } else {
                alert('✅ ' + (dados.mensagem || 'Papel atualizado.'));
            }
            cargarUsuarios();
        } catch (e) {
            alert(e.message || 'Erro ao mudar o papel.');
            cargarUsuarios();
        }
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    function init() {
        const container = document.getElementById('panel-container');
        if (!container) return;

        const { token, usuario } = obtenerSesion();

        // 1) Há sessão?
        if (!token || !usuario) {
            renderLoginRequerido(container);
            return;
        }

        // 2) ¿El rol del usuario tiene permitido estar en esta página?
        if (!contiene(ROLES_PERMITIDOS, usuario.role)) {
            renderAccesoDenegado(container, usuario);
            return;
        }

        // 3) Sessão válida e rol correto -> se renderiza o painel
        renderPanel(container);
        cargarPosts();

        // Eventos de formularios
        document.getElementById('form-post').addEventListener('submit', enviarFormPost);
        if (usuario.role === 'admin') {
            document.getElementById('form-personagem').addEventListener('submit', enviarFormPersonaje);
            document.getElementById('form-usuario').addEventListener('submit', enviarFormUsuario);
        }
    }

    // Exponer funções usadas pelos onclick do HTML gerado
    window.Panel = {
        mudarAba: mudarAba,
        logout: logout,
        cargarPosts: cargarPosts,
        editarPost: editarPost,
        cancelarEdicionPost: cancelarEdicionPost,
        excluirPost: excluirPost,
        editarPersonaje: editarPersonaje,
        cancelarEdicionPersonaje: cancelarEdicionPersonaje,
        excluirPersonaje: excluirPersonaje,
        cambiarRol: cambiarRol
    };

    document.addEventListener('DOMContentLoaded', init);
})();