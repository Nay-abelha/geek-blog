const fs = require('fs');
const path = require('path');
const base = 'c:\\Users\\Windows 10\\Documents\\GitHub\\geek-blog';

function replaceInFile(rel, replacements) {
  const full = path.join(base, rel);
  let text = fs.readFileSync(full, 'utf8');
  let count = 0;
  for (const [oldS, newS] of replacements) {
    const parts = text.split(oldS);
    if (parts.length > 1) {
      count += parts.length - 1;
      text = parts.join(newS);
    }
  }
  fs.writeFileSync(full, text, 'utf8');
  console.log(rel + ': ' + count + ' trocas');
}

replaceInFile('js/panel.js', [
  ['Erro ao cargar publicações.', 'Erro ao carregar publicações.'],
  ['Erro ao cargar personagens.', 'Erro ao carregar personagens.'],
  ['Erro ao cargar as estatísticas.', 'Erro ao carregar as estatísticas.'],
  ['Erro ao cargar usuários.', 'Erro ao carregar usuários.'],
  ['Error de conexión con el servidor.', 'Erro de conexão com o servidor.'],
  ['Não foi possível mudar o rol.', 'Não foi possível mudar o papel.'],
  ['Rol atualizado.', 'Papel atualizado.'],
  ['Erro ao mudar o rol.', 'Erro ao mudar o papel.'],
  ['Seções do blog', 'Seções do blog'],
  ['<!-- ===== ABA DE ESTADÍSTICAS ===== -->', '<!-- ===== ABA DE ESTATÍSTICAS ===== -->'],
  ['// 3) Sessão válida e rol correto -> se renderiza o painel', '// 3) Sessão válida e papel correto -> painel renderizado'],
  ['// 2) ¿El rol del usuario tiene permitido estar en esta página?', '// 2) O papel do usuário tem permissão para estar nesta página?'],
  ['// Eventos de formularios', '// Eventos dos formulários'],
  ['// Exponer funções usadas pelos onclick do HTML gerado', '// Expõe funções usadas pelos onclick do HTML gerado'],
]);

replaceInFile('backend/server.js', [
  ['// ROTA 19: Dashboard / funcionamento do site', '// ROTA 19: Dashboard / desempenho do site'],
]);

replaceInFile('style.css', [
  ['/* Badge del rol del usuario */', '/* Badge do papel do usuário */'],
  ['/* Fila del formulario con dos columnas */', '/* Linha do formulário com duas colunas */'],
  ['/* Acesso negado em vermelho para diferenciar do simples "fazer login" */', '/* Acesso negado em vermelho para diferenciar do simples "fazer login" */'],
  ['/* Tarjetas de estatísticas do dashboard (só admin) */', '/* Cartões de estatísticas do dashboard (só admin) */'],
  ['/* Tablas (estatísticas recentes e usuários) */', '/* Tabelas (estatísticas recentes e usuários) */'],
  ['14. PANEL POR ROLES - ESCRITOR.HTML, EDITOR.HTML, ADM.HTML', '14. PAINEL POR PAPÉIS - ESCRITOR.HTML, EDITOR.HTML, ADM.HTML'],
]);

console.log('OK');
