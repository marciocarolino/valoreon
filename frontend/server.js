import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

const port = Number(process.env.PORT) || 8080;

console.log('ENV PORT:', process.env.PORT);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CAMINHO CORRETO
const distPath = path.join(__dirname, 'dist/Valoreon_Front/browser');

console.log('distPath:', distPath);

app.use(express.static(distPath));

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});