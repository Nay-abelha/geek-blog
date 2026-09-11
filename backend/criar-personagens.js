const mysql = require('mysql2');
require('dotenv').config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const createTable = `
CREATE TABLE IF NOT EXISTS personagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    editora VARCHAR(100) NOT NULL,
    descricao TEXT,
    imagem_url VARCHAR(500),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`;

const insertData = `
INSERT INTO personagens (nome, editora, descricao, imagem_url) VALUES
('Homem-Aranha', 'Marvel Comics', 'Peter Parker, um jovem que ganhou poderes de aranha e luta contra o crime em Nova York.', 'https://rollingstone.com.br/wp-content/uploads/cropped-homem-aranha-original-reproducao.jpg'),
('Batman', 'DC Comics', 'Bruce Wayne, o cavaleiro das trevas que protege Gotham City.', 'https://blog.pensanddolls.com.br/wp-content/uploads/2023/01/Conheca-a-historia-do-Batman-scaled.jpg'),
('Wolverine', 'Marvel Comics', 'Logan, um mutante com garras de adamantium e fator de cura.', 'https://rollingstone.com.br/wp-content/uploads/img-1026415-wolverine1.jpg'),
('Mulher-Maravilha', 'DC Comics', 'Diana Prince, a princesa amazona que luta pela justiça.', 'https://www.planocritico.com/wp-content/uploads/2025/04/mulher_maravilha_absoluta_absolute_wonder_woman_vol_1_a_ultima_amazona_plano_critico.jpg'),
('Deadpool', 'Marvel Comics', 'Wade Wilson, o mercenário tagarela que quebra a quarta parede.', 'https://nerdizmo.ig.com.br/wp-content/uploads/2021/06/habilidade-grotesca-de-deadpool-capa.jpg'),
('Superman', 'DC Comics', 'Kal-El, o último filho de Krypton e o maior herói da Terra.', 'https://segredosdomundo.r7.com/wp-content/uploads/2020/07/superman-historia-poderes-fraquezas-e-curiosidades.jpg')
`;

conn.connect(err => {
    if (err) {
        console.error('ERRO DE CONEXÃO:', err.message);
        process.exit(1);
    }
    console.log('Conectado!');
    
    conn.query(createTable, (err) => {
        if (err) {
            console.error('ERRO AO CRIAR TABELA:', err.message);
            process.exit(1);
        }
        console.log('Tabela personagens criada/verificada com sucesso!');
        
        conn.query(insertData, (err2) => {
            if (err2) {
                console.error('ERRO AO INSERIR DADOS:', err2.message);
                process.exit(1);
            }
            console.log('Dados inseridos com sucesso!');
            
            conn.query('SELECT * FROM personagens', (err3, rows) => {
                if (err3) {
                    console.error('ERRO AO BUSCAR:', err3.message);
                    process.exit(1);
                }
                console.log('Personagens cadastrados:', rows.length);
                rows.forEach(p => console.log(`  - ${p.nome} (${p.editora})`));
                conn.end();
            });
        });
    });
});