const express = require('express');
const path = require('path');
const fs = require('fs'); 

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(express.static(__dirname));

app.use(express.static(path.join(__dirname, 'src', 'modules', 'auth')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'sign_in.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'log_in.html'));
});

app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'sign_in.html'));
});

const dbPath = path.join(__dirname, 'database.json');

function readDB() {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/inventory', (req, res) => {
    const db = readDB();
    res.json(db.inventory);
});

app.post('/api/inventory/descontar', (req, res) => {
    const { itemsVendidos } = req.body; 
    const db = readDB();

    itemsVendidos.forEach(item => {
        const producto = db.inventory.find(p => p.id === item.id);
        if (producto) {
            producto.stock -= item.cantidad;
        }
    });

    writeDB(db);
    res.json({ message: "Inventario descontado exitosamente" });
});

app.listen(PORT, () => {
    console.log(`>>> Servidor activo en: http://127.0.0.1:${PORT}`);
    console.log(`>>> Iniciar sesión (login): http://127.0.0.1:${PORT}/login`);
});