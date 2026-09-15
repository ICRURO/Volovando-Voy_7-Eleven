const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// 1. Servir los archivos estáticos de toda la raíz del proyecto
app.use(express.static(__dirname));

// 2. Servir también la carpeta logs_html directamente para que URLs como /log_in.html funcionen
app.use(express.static(path.join(__dirname, 'Log_in', 'logs_html')));

// 3. Rutas amigables
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Log_in', 'logs_html', 'sign_in.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Log_in', 'logs_html', 'log_in.html'));
});

app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'Log_in', 'logs_html', 'sign_in.html'));
});

app.listen(PORT, () => {
    console.log(`>>> Servidor activo en: http://127.0.0.1:${PORT}`);
    console.log(`>>> Registro (sign_in): http://127.0.0.1:${PORT}/`);
    console.log(`>>> Iniciar sesión (log_in): http://127.0.0.1:${PORT}/login`);
});