// Este arquivo agora é integrado ao server.js na rota /api/chat
// Mantido aqui apenas como referência de configuração do OpenAI

const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function enviarMensagem(mensagem) {
    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é um assistente do GeekBlog, especializado em cultura geek, HQs, filmes e personagens." },
                { role: "user", content: mensagem }
            ],
            max_tokens: 500
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Erro no chat:', error);
        throw error;
    }
}

module.exports = { enviarMensagem };