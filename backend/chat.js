import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const response = await client.responses.create({
    model: "gpt-5.6",
    input: "Olá! Explique o que é uma API."
});

console.log(response.output_text);