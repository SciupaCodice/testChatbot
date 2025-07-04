import { Ollama } from 'ollama';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
const model = 'llama3.2:3b';

// Middleware per abilitare CORS (utile per lo sviluppo)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS'); // Aggiungi i metodi consentiti
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Middleware per parsare il body delle richieste JSON
app.use(bodyParser.json());

// Endpoint per ottenere i modelli disponibili
app.get('/models', (req, res) => {
    const availableModels = ['llama3.2:3b', 'llama3.2:7b', 'llama3.2:13b'];
    res.json({ models: availableModels });
});

// Endpoint API per la chat
app.post('/chat', async (req, res) => {
    const userInput = req.body.message;
    const conversation = req.body.conversation || [];
    const selectedModel = req.body.model || model;

    if (!userInput || userInput.trim() === '') {
        return res.status(400).json({ error: 'Il messaggio non può essere vuoto.' });
    }

    conversation.push({ role: 'user', content: userInput.trim() });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullBotMessage = '';

    try {
        const responseStream = await ollama.chat({
            model: selectedModel,
            messages: conversation,
            stream: true
        });

        for await (const chunk of responseStream) {
            const content = chunk.message.content;
            if (content) {
                fullBotMessage += content;
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: content })}\n\n`);
            }
        }

        conversation.push({ role: 'assistant', content: fullBotMessage });
        res.write(`data: ${JSON.stringify({ type: 'end', conversation: conversation })}\n\n`);
        res.end();

    } catch (error) {
        console.error('❌ Errore durante la comunicazione con Ollama:', error.message);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Si è verificato un errore durante l\'elaborazione della richiesta.' })}\n\n`);
        res.end();
    }
});

// Serve i file statici dalla cartella 'public'
app.use(express.static('public'));

// Avvia il server
app.listen(port, () => {
    console.log(`🚀 Server Node.js in ascolto su http://localhost:${port}`);
});