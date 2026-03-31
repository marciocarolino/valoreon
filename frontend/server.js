import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// 🔥 Porta correta para Railway
const port = Number(process.env.PORT) || 8080;

// 🔍 Debug (importante)
console.log('ENV PORT:', process.env.PORT);

// Corrigir __dirname no ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚠️ Caminho do build Angular (ajustado ao seu projeto)
const distPath = path.join(__dirname, 'dist/Valoreon Front/browser');

// Servir arquivos estáticos
app.use(express.static(distPath));

// ✅ SPA fallback (Angular routing)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 🚀 Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});