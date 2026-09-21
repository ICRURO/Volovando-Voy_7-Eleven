const express = require('express');
const path = require('path');
const fs = require('fs'); 

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname, 'src', 'modules', 'auth')));
app.use(express.static(path.join(__dirname, 'src', 'modules', 'shifts')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'sign_in.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'log_in.html'));
});

app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'sign_in.html'));
});

app.get('/shifts/empleado', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'shifts', 'shifts_employee.html'));
});

app.get('/shifts/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'shifts', 'shifts_admin.html'));
});

const dbPath = path.join(__dirname, 'database.json');

function readDB() {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}


let usuarioSesionActiva = null;

// AUTENTICACIÓN Y SESIÓN
app.post('/api/auth/login', (req, res) => {
    const { correo, email, password } = req.body;
    const db = readDB();

    if (!db.usuarios) db.usuarios = [];

    // Lee el correo enviado sin importar si llegó en 'correo' o en 'email'
    const correoEntrante = (correo || email || '').trim().toLowerCase();

    // Busca coincidencia en la BD ignorando espacios y mayúsculas
    const usuario = db.usuarios.find(u => {
        const correoBD = (u.correo || u.email || '').trim().toLowerCase();
        return correoBD === correoEntrante;
    });

    if (!usuario) {
        return res.status(401).json({ message: "El correo ingresado no está registrado." });
    }

    if (usuario.password !== password) {
        return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    // Valida 'desactivado' e 'inactivo'
    const estatusLimpio = (usuario.estatus || '').toLowerCase();
    if (estatusLimpio === 'desactivado' || estatusLimpio === 'inactivo' || usuario.activo === false) {
        return res.status(403).json({ message: "Tu cuenta está inactiva o desactivada. Contacta al administrador." });
    }

    
    usuarioSesionActiva = {
        id_empleado: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        correo: usuario.correo
    };

    return res.json({ message: "Login exitoso", usuario: usuarioSesionActiva });
});


app.get('/api/auth/session', (req, res) => {
    if (!usuarioSesionActiva) {
        return res.status(401).json({ message: "No hay sesión activa" });
    }
    res.json(usuarioSesionActiva);
});




// INVENTARIO
app.get('/api/inventory', (req, res) => {
    const db = readDB();
    res.json(db.inventory || db.inventario);
});

app.post('/api/inventory/descontar', (req, res) => {
    const { itemsVendidos } = req.body; 
    const db = readDB();

    const listaInv = db.inventory || db.inventario || [];

    itemsVendidos.forEach(item => {
        const producto = listaInv.find(p => p.id === item.id);
        if (producto) {
            producto.stock_actual = (producto.stock_actual || producto.stock) - item.cantidad;
        }
    });

    writeDB(db);
    res.json({ message: "Inventario descontado exitosamente" });
});

// HORARIOS Y TURNOS
app.get('/api/horarios', (req, res) => {
    const db = readDB();
    res.json(db.horarios_config || { hora_apertura: "07:00", hora_cierre: "21:00", tolerancia_minutos: 15 });
});

app.post('/api/horarios', (req, res) => {
    const { hora_apertura, hora_cierre, tolerancia_minutos } = req.body;
    const db = readDB();

    db.horarios_config = {
        hora_apertura: hora_apertura || "07:00",
        hora_cierre: hora_cierre || "21:00",
        tolerancia_minutos: parseInt(tolerancia_minutos) || 15
    };

    writeDB(db);
    res.json({ message: "Configuración de horarios actualizada correctamente." });
});

app.get('/api/turnos/estado-actual', (req, res) => {
    if (!usuarioSesionActiva) {
        return res.status(401).json({ message: "No hay sesión activa" });
    }

    const db = readDB();
    if (!db.turnos) db.turnos = [];

    const turnoAbierto = db.turnos.find(t => t.id_empleado === usuarioSesionActiva.id_empleado && t.estatus === 'abierto');
    res.json({ usuario: usuarioSesionActiva, tieneTurnoAbierto: !!turnoAbierto });
});


app.get('/api/turnos/estado/:id_empleado', (req, res) => {
    const { id_empleado } = req.params;
    const db = readDB();
    
    if (!db.turnos) db.turnos = [];
    
    const turnoAbierto = db.turnos.find(t => t.id_empleado === id_empleado && t.estatus === 'abierto');
    res.json({ tieneTurnoAbierto: !!turnoAbierto });
});


app.post('/api/turnos/abrir', (req, res) => {
    const { id_empleado, fondo_caja_inicial } = req.body;
    const db = readDB();

    if (!db.turnos) db.turnos = [];

    const turnoExistente = db.turnos.find(t => t.id_empleado === id_empleado && t.estatus === 'abierto');

    if (turnoExistente) {
        return res.status(400).json({ 
            success: false, 
            message: `El empleado ${id_empleado} ya tiene un turno abierto actualmente.` 
        });
    }

    const nuevoTurno = {
        id_turno: `T-${String(db.turnos.length + 1).padStart(3, '0')}`,
        id_empleado: id_empleado,
        fecha_inicio: new Date().toISOString(),
        fecha_fin: null,
        fondo_caja_inicial: Number(fondo_caja_inicial),
        ventas_efectivo_sistema: 0.00,
        efectivo_cierre_real: null,
        diferencia: null,
        estatus: 'abierto'
    };

    db.turnos.push(nuevoTurno);
    writeDB(db);

    return res.json({ 
        success: true, 
        message: 'Turno y caja abiertos correctamente.',
        turno: nuevoTurno 
    });
});


app.post('/api/turnos/cerrar', (req, res) => {
    const { id_empleado, efectivo_cierre_real } = req.body;
    const db = readDB();

    if (!db.turnos) db.turnos = [];

    const turnoIndex = db.turnos.findIndex(t => t.id_empleado === id_empleado && t.estatus === 'abierto');
    if (turnoIndex === -1) {
        return res.status(404).json({ error: "No se encontró un turno abierto para este empleado." });
    }

    const turno = db.turnos[turnoIndex];
    const fechaFin = new Date().toISOString();

    let totalVentasEfectivo = 0;
    if (db.ventas) {
        db.ventas.forEach(v => {
            if (v.id_empleado === id_empleado && 
                v.metodo_pago === 'efectivo' &&
                new Date(v.fecha) >= new Date(turno.fecha_inicio) &&
                new Date(v.fecha) <= new Date(fechaFin)) {
                totalVentasEfectivo += parseFloat(v.total) || 0;
            }
        });
    }

    const efectivoEsperado = turno.fondo_caja_inicial + totalVentasEfectivo;
    const realConteo = parseFloat(efectivo_cierre_real) || 0;
    const diferencia = realConteo - efectivoEsperado;

    turno.fecha_fin = fechaFin;
    turno.efectivo_cierre_real = realConteo;
    turno.ventas_efectivo_sistema = totalVentasEfectivo;
    turno.diferencia = diferencia;
    turno.estatus = "cerrado";

    db.turnos[turnoIndex] = turno;
    writeDB(db);

    res.json({
        message: "Turno cerrado exitosamente.",
        resumen: {
            fondo_inicial: turno.fondo_caja_inicial,
            ventas_efectivo: totalVentasEfectivo,
            efectivo_esperado: efectivoEsperado,
            efectivo_real: realConteo,
            diferencia: diferencia
        }
    });
});


app.get('/api/turnos/historial', (req, res) => {
    const { id_empleado } = req.query;
    const db = readDB();

    let historial = db.turnos || [];

    if (id_empleado) {
        historial = historial.filter(t => t.id_empleado === id_empleado);
    }

    const resultado = historial.map(t => {
        const usuario = (db.usuarios || []).find(u => u.id === t.id_empleado);
        return {
            ...t,
            nombre_empleado: usuario ? usuario.nombre : 'Desconocido'
        };
    });

    res.json(resultado);
});

// INICIALIZACIÓN DEL SERVIDOR 
app.listen(PORT, () => {
    console.log(`>>> Servidor activo en: http://127.0.0.1:${PORT}`);
    console.log(`>>> Iniciar sesión (login): http://127.0.0.1:${PORT}/login`);
});