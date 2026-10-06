/**
 * @file server.js
 * @description Archivo principal del servidor Express para la aplicación Volovando Voy (7-Eleven).
 * Contiene la configuración del servidor, rutas para servir vistas estáticas y la API REST 
 * para gestionar autenticación, inventario, turnos, ventas, reportes y cashback.
 */

const express = require('express');
const path = require('path');
const fs = require('fs'); 

const app = express();
/** @constant {number} Puerto de escucha del servidor */
const PORT = 3000;

app.use(express.json());

// Middlewares para servir archivos estáticos
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname, 'src', 'modules', 'auth')));
app.use(express.static(path.join(__dirname, 'src', 'modules', 'shifts')));

/** ==========================================
 *  RUTAS DE VISTAS (FRONTEND)
 *  ========================================== */

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'sign_in.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'log_in.html'));
});

app.get('/recover', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'auth', 'recover_password.html'));
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

app.get('/clients', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'modules', 'clients', 'clients.html'));
});

/** ==========================================
 *  CONFIGURACIÓN DE BASE DE DATOS LOCAL
 *  ========================================== */

/** @constant {string} Ruta absoluta hacia el archivo JSON que funge como base de datos */
const dbPath = path.join(__dirname, 'database.json');

/**
 * Lee el archivo JSON de la base de datos de manera síncrona.
 * 
 * @function readDB
 * @returns {Object} Objeto parseado con los datos de `database.json`.
 */
function readDB() {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
}

/**
 * Escribe datos en el archivo JSON de la base de datos de manera síncrona.
 * 
 * @function writeDB
 * @param {Object} data - El objeto con los datos completos a guardar en el JSON.
 */
function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

/** 
 * @type {Object|null} 
 * @description Almacena en memoria los datos del usuario que tiene la sesión activa.
 */
let usuarioSesionActiva = null;

/** ==========================================
 *  AUTENTICACIÓN Y SESIÓN
 *  ========================================== */

/**
 * Endpoint para el inicio de sesión de un usuario.
 * @route POST /api/auth/login
 * @param {string} req.body.correo - (Opcional) Correo electrónico del usuario.
 * @param {string} req.body.email - (Opcional) Correo electrónico del usuario (alternativo).
 * @param {string} req.body.password - Contraseña del usuario.
 * @returns {Object} JSON con el estado de la autenticación y los datos del usuario.
 */
app.post('/api/auth/login', (req, res) => {
    const { correo, email, password } = req.body;
    const db = readDB();

    if (!db.usuarios) db.usuarios = [];

    const correoEntrante = (correo || email || '').trim().toLowerCase();

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

/**
 * Endpoint para registrar un nuevo cliente en el sistema.
 * @route POST /api/auth/register
 * @param {string} req.body.nombre - Nombre del nuevo cliente.
 * @param {string} req.body.correo - Correo electrónico del cliente.
 * @param {string} req.body.password - Contraseña para la cuenta.
 * @returns {Object} JSON confirmando el registro y los datos del nuevo cliente.
 */
app.post('/api/auth/register', (req, res) => {
    const { nombre, correo, password } = req.body;
    const db = readDB();

    if (!db.usuarios) db.usuarios = [];

    const correoLimpio = (correo || '').trim().toLowerCase();

    const usuarioExistente = db.usuarios.find(u => {
        const correoBD = (u.correo || u.email || '').trim().toLowerCase();
        return correoBD === correoLimpio;
    });

    if (usuarioExistente) {
        return res.status(400).json({ message: "Este correo ya se encuentra registrado." });
    }

    const nuevoId = `CLI-${1000 + db.usuarios.length + 1}`;

    const nuevoUsuario = {
        id: nuevoId,
        nombre: nombre || "Cliente",
        correo: correoLimpio,
        password: password,
        rol: "cliente",
        saldo_cashback: 0,
        estatus: "activo"
    };

    db.usuarios.push(nuevoUsuario);
    writeDB(db);

    return res.json({ success: true, message: "Registro exitoso.", usuario: nuevoUsuario });
});

/**
 * Endpoint para recuperar/restablecer la contraseña de un usuario.
 * @route POST /api/auth/reset-password
 * @param {string} req.body.correo - Correo electrónico asociado a la cuenta.
 * @param {string} req.body.nuevaPassword - La nueva contraseña a establecer.
 * @returns {Object} JSON con el mensaje de éxito o error.
 */
app.post('/api/auth/reset-password', (req, res) => {
    const { correo, email, nuevaPassword } = req.body;
    const db = readDB();

    if (!db.usuarios) db.usuarios = [];

    const correoEntrante = (correo || email || '').trim().toLowerCase();

    if (!correoEntrante || !nuevaPassword) {
        return res.status(400).json({ message: "El correo y la nueva contraseña son obligatorios." });
    }

    const usuario = db.usuarios.find(u => {
        const correoBD = (u.correo || u.email || '').trim().toLowerCase();
        return correoBD === correoEntrante;
    });

    if (!usuario) {
        return res.status(404).json({ message: "No existe ninguna cuenta con este correo." });
    }

    const estatusLimpio = (usuario.estatus || '').toLowerCase();
    if (estatusLimpio === 'desactivado' || estatusLimpio === 'inactivo' || usuario.activo === false) {
        return res.status(403).json({ message: "Tu cuenta está desactivada. Contacta al administrador." });
    }

    usuario.password = nuevaPassword;
    writeDB(db);

    return res.json({ message: "¡Contraseña actualizada exitosamente! Redirigiendo..." });
});

/**
 * Endpoint para consultar la sesión activa actual.
 * @route GET /api/auth/session
 * @returns {Object} JSON con los datos del usuario logueado o error si no hay sesión.
 */
app.get('/api/auth/session', (req, res) => {
    if (!usuarioSesionActiva) {
        return res.status(401).json({ message: "No hay sesión activa" });
    }
    res.json(usuarioSesionActiva);
});

/** ==========================================
 *  INVENTARIO
 *  ========================================== */

/**
 * Endpoint para obtener la lista de productos del inventario.
 * @route GET /api/inventory
 * @returns {Array} Array de objetos representando los productos.
 */
app.get('/api/inventory', (req, res) => {
    const db = readDB();
    res.json(db.inventory || db.inventario || []);
});

/**
 * Endpoint para descontar unidades del stock del inventario tras una venta.
 * @route POST /api/inventory/descontar
 * @param {Array<Object>} req.body.itemsVendidos - Lista de productos vendidos con su ID y cantidad.
 * @returns {Object} JSON con mensaje de confirmación.
 */
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

/**
 * Endpoint para actualizar directamente el stock de un producto específico.
 * @route POST /api/inventory/update
 * @param {string|number} req.body.id - Identificador del producto.
 * @param {number} req.body.stock - Nuevo valor del stock.
 * @returns {Object} JSON confirmando el éxito y el inventario actualizado.
 */
app.post('/api/inventory/update', (req, res) => {
    const { id, stock } = req.body;
    const db = readDB();

    if (!db.inventario && !db.inventory) db.inventario = [];
    const listaInv = db.inventario || db.inventory;

    const producto = listaInv.find(p => String(p.id) === String(id));
    if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" });
    }

    producto.stock_actual = Math.max(0, parseInt(stock) || 0);
    writeDB(db);

    res.json({ success: true, inventario: listaInv });
});

/** ==========================================
 *  MERMAS Y BAJAS DE INVENTARIO
 *  ========================================== */

/**
 * Endpoint para consultar el listado de mermas registradas.
 * @route GET /api/losses
 * @returns {Array} Array con las mermas registradas.
 */
app.get('/api/losses', (req, res) => {
    const db = readDB();
    res.json(db.mermas || db.losses || []);
});

/**
 * Endpoint para registrar una nueva merma originada por ajuste (-1).
 * @route POST /api/losses
 * @param {string} req.body.productId - ID del producto mermado.
 * @param {string} req.body.productName - Nombre del producto/volován.
 * @param {number} req.body.quantity - Cantidad de piezas mermadas.
 * @param {number} req.body.cost - Costo unitario o de referencia.
 * @param {string} req.body.reason - Motivo del ajuste.
 * @returns {Object} JSON con la nueva merma registrada.
 */
app.post('/api/losses', (req, res) => {
    const db = readDB();
    if (!db.mermas) db.mermas = [];

    const nuevaMerma = {
        id: `MER-${Date.now()}`,
        productId: req.body.productId || 'N/D',
        productName: req.body.productName || 'Volován',
        quantity: Number(req.body.quantity) || 1,
        cost: parseFloat(req.body.cost) || 0,
        reason: req.body.reason || 'Ajuste manual de inventario (-1)',
        date: new Date().toISOString()
    };

    db.mermas.push(nuevaMerma);
    writeDB(db);

    res.status(201).json({ success: true, merma: nuevaMerma });
});

/** ==========================================
 *  HORARIOS Y TURNOS
 *  ========================================== */

/**
 * Endpoint para obtener la configuración global de horarios.
 * @route GET /api/horarios
 * @returns {Object} JSON con la hora de apertura, cierre y tolerancia.
 */
app.get('/api/horarios', (req, res) => {
    const db = readDB();
    res.json(db.horarios_config || { hora_apertura: "07:00", hora_cierre: "21:00", tolerancia_minutos: 15 });
});

/**
 * Endpoint para actualizar la configuración global de horarios.
 * @route POST /api/horarios
 * @param {string} req.body.hora_apertura - Hora de inicio del día laboral.
 * @param {string} req.body.hora_cierre - Hora de fin del día laboral.
 * @param {number} req.body.tolerancia_minutos - Minutos de tolerancia permitidos.
 * @returns {Object} JSON con mensaje de éxito.
 */
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

/**
 * Endpoint para consultar el estado del turno del usuario con sesión activa.
 * @route GET /api/turnos/estado-actual
 * @returns {Object} JSON con datos del usuario y si tiene un turno abierto.
 */
app.get('/api/turnos/estado-actual', (req, res) => {
    if (!usuarioSesionActiva) {
        return res.status(401).json({ message: "No hay sesión activa" });
    }

    const db = readDB();
    if (!db.turnos) db.turnos = [];

    const turnoAbierto = db.turnos.find(t => t.id_empleado === usuarioSesionActiva.id_empleado && t.estatus === 'abierto');
    res.json({ usuario: usuarioSesionActiva, tieneTurnoAbierto: !!turnoAbierto });
});

/**
 * Endpoint para consultar el estado del turno de un empleado en específico.
 * @route GET /api/turnos/estado/:id_empleado
 * @param {string} req.params.id_empleado - El ID del empleado a buscar.
 * @returns {Object} JSON con un booleano indicando si tiene turno abierto.
 */
app.get('/api/turnos/estado/:id_empleado', (req, res) => {
    const { id_empleado } = req.params;
    const db = readDB();
    
    if (!db.turnos) db.turnos = [];
    
    const turnoAbierto = db.turnos.find(t => t.id_empleado === id_empleado && t.estatus === 'abierto');
    res.json({ tieneTurnoAbierto: !!turnoAbierto });
});

/**
 * Endpoint para abrir un nuevo turno de caja para un empleado.
 * @route POST /api/turnos/abrir
 * @param {string} req.body.id_empleado - ID del empleado que abre el turno.
 * @param {number} req.body.fondo_caja_inicial - Cantidad de efectivo inicial en la caja.
 * @returns {Object} JSON confirmando la apertura del turno.
 */
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

/**
 * Endpoint para cerrar un turno de caja activo, calculando ventas en efectivo y diferencias.
 * @route POST /api/turnos/cerrar
 * @param {string} req.body.id_empleado - ID del empleado.
 * @param {number} req.body.efectivo_cierre_real - Monto físico reportado en caja al cerrar.
 * @returns {Object} JSON con el resumen del cuadre de caja.
 */
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

/**
 * Endpoint para consultar el historial de turnos, opcionalmente filtrado por empleado.
 * @route GET /api/turnos/historial
 * @param {string} [req.query.id_empleado] - ID del empleado a filtrar.
 * @returns {Array} Array con el historial de turnos.
 */
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

/** ==========================================
 *  VENTAS
 *  ========================================== */

/**
 * Endpoint para registrar una venta tradicional en el archivo JSON.
 * @route POST /api/ventas/registrar
 * @param {Object} req.body - Detalles completos de la venta.
 * @returns {Object} JSON de confirmación.
 */
app.post('/api/ventas/registrar', (req, res) => {
    const nuevaVenta = req.body;
    const db = readDB();

    if (!db.ventas) {
        db.ventas = [];
    }

    db.ventas.push(nuevaVenta);
    writeDB(db);

    res.json({ success: true, message: "Venta guardada correctamente", venta: nuevaVenta });
});

/** ==========================================
 *  REPORTES
 *  ========================================== */

/**
 * Endpoint dinámico para generar distintos tipos de reportes tabulares.
 * @route GET /api/reports/:type
 * @param {string} req.params.type - Tipo de reporte ('sales-period', 'sales-employee', 'top-products', 'inventory-shrinks', 'cashback', 'attendance', 'payment-methods').
 * @returns {Object} JSON con la propiedad `rows` formateada para mostrar en tablas.
 */
app.get('/api/reports/:type', (req, res) => {
    const { type } = req.params;
    const db = readDB();
    let rows = [];

    const ventas = db.ventas || [];
    const usuarios = db.usuarios || [];
    const turnos = db.turnos || [];

    switch (type) {
        case 'sales-period':
            rows = ventas.map(v => [
                v.id_venta || v.id || 'N/D',
                v.fecha ? new Date(v.fecha).toLocaleString() : 'N/D',
                `$${(parseFloat(v.total) || 0).toFixed(2)}`
            ]);
            break;

        case 'sales-employee':
            {
                const empleadoMap = {};
                ventas.forEach(v => {
                    const empId = v.id_empleado || 'Desconocido';
                    if (!empleadoMap[empId]) {
                        const userObj = usuarios.find(u => u.id === empId);
                        empleadoMap[empId] = {
                            nombre: userObj ? userObj.nombre : empId,
                            cantidad: 0,
                            total: 0
                        };
                    }
                    empleadoMap[empId].cantidad += 1;
                    empleadoMap[empId].total += parseFloat(v.total) || 0;
                });

                rows = Object.values(empleadoMap).map(e => [
                    e.nombre,
                    e.cantidad.toString(),
                    `$${e.total.toFixed(2)}`
                ]);
            }
            break;

        case 'top-products':
            {
                const prodMap = {};
                ventas.forEach(v => {
                    const items = v.items || v.productos || [];
                    items.forEach(item => {
                        const nombreProd = item.nombre || item.titulo || item.id || 'Producto';
                        const cantidad = parseInt(item.cantidad) || 1;
                        const subtotal = parseFloat(item.subtotal || (item.precio_venta * cantidad)) || 0;

                        if (!prodMap[nombreProd]) {
                            prodMap[nombreProd] = { unidades: 0, ingresos: 0 };
                        }
                        prodMap[nombreProd].unidades += cantidad;
                        prodMap[nombreProd].ingresos += subtotal;
                    });
                });

                rows = Object.entries(prodMap).map(([prod, data]) => [
                    prod,
                    data.unidades.toString(),
                    `$${data.ingresos.toFixed(2)}`
                ]);
            }
            break;

        case 'inventory-shrinks':
            {
                const mermas = db.mermas || db.losses || [];
                const resumenMermas = {};

                mermas.forEach(m => {
                    const prodKey = m.productId || m.productName || m.nombre || 'N/D';
                    const prodName = m.productName || m.nombre || m.descripcion || 'Volován';
                    const cantidad = parseInt(m.quantity || m.cantidad_baja || m.cantidad) || 1;
                    const costo = parseFloat(m.cost || m.precio || 0);

                    if (!resumenMermas[prodKey]) {
                        resumenMermas[prodKey] = {
                            id: prodKey,
                            nombre: prodName,
                            totalCantidad: 0,
                            costoRef: costo,
                            ultimaFecha: m.date || m.fecha || new Date().toISOString()
                        };
                    }
                    resumenMermas[prodKey].totalCantidad += cantidad;
                    resumenMermas[prodKey].ultimaFecha = m.date || m.fecha || resumenMermas[prodKey].ultimaFecha;
                });

                rows = Object.values(resumenMermas).map(item => [
                    `#${item.id}`,
                    item.nombre,
                    item.totalCantidad.toString(),
                    `$${item.costRef.toFixed(2)}`,
                    item.ultimaFecha ? new Date(item.ultimaFecha).toLocaleDateString() : 'N/D'
                ]);
            }
            break;

        case 'cashback':
            {
                // Mapeo adaptado exactamente a las columnas de la vista: ID, FECHA, VENTA / CLIENTE, MONTO, MOTIVO / BALANCE
                const movimientos = db.movimientos_cashback || [];
                const listaUsuarios = db.usuarios || [];

                rows = movimientos.map(c => {
                    const idMov = c.id_movimiento || c.id || 'N/D';
                    const rawDate = c.fecha || c.date;
                    const fechaFormateada = rawDate ? new Date(rawDate).toLocaleString() : 'N/D';

                    const clienteObj = listaUsuarios.find(u => u.id === c.id_cliente);
                    const nombreCliente = clienteObj ? clienteObj.nombre : (c.id_cliente || '');
                    const ticketVenta = c.id_venta || c.ticket || 'Ticket N/D';
                    const ventaCliente = nombreCliente ? `${ticketVenta} (${nombreCliente})` : ticketVenta;

                    const esRedencion = c.tipo === 'redencion' || (c.tipo_movimiento && c.tipo_movimiento.toLowerCase().includes('redención'));
                    const montoNum = Math.abs(parseFloat(c.monto) || 0).toFixed(2);
                    const montoTexto = esRedencion ? `-$${montoNum}` : `+$${montoNum}`;
                    const motivoTexto = esRedencion ? 'Usado en compra' : 'Acumulado 5% compra';

                    return [
                        `#${idMov}`,
                        fechaFormateada,
                        ventaCliente,
                        montoTexto,
                        c.motivo || motivoTexto
                    ];
                });
            }
            break;

        case 'attendance':
            rows = turnos.map(t => {
                const userObj = usuarios.find(u => u.id === t.id_empleado);
                return [
                    userObj ? userObj.nombre : (t.id_empleado || 'N/D'),
                    t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleDateString() : 'N/D',
                    t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleTimeString() : 'N/D',
                    t.fecha_fin ? new Date(t.fecha_fin).toLocaleTimeString() : 'En turno',
                    t.estatus || 'Completado'
                ];
            });
            break;

        case 'payment-methods':
            {
                const metodoMap = {};
                ventas.forEach(v => {
                    const metodo = v.metodo_pago || 'Efectivo';
                    if (!metodoMap[metodo]) {
                        metodoMap[metodo] = { transacciones: 0, monto: 0 };
                    }
                    metodoMap[metodo].transacciones += 1;
                    metodoMap[metodo].monto += parseFloat(v.total) || 0;
                });

                rows = Object.entries(metodoMap).map(([metodo, data]) => [
                    metodo.toUpperCase(),
                    data.transacciones.toString(),
                    `$${data.monto.toFixed(2)}`
                ]);
            }
            break;

        default:
            rows = [];
            break;
    }

    res.json({ rows });
});

/** ==========================================
 *  MÓDULO DE CASHBACK (Historias 16, 17, 18, 31, 32, 33)
 *  ========================================== */

/**
 * Endpoint para consultar la lista de movimientos de cashback.
 * @route GET /api/cashback
 * @returns {Array} Array con el historial de cashback.
 */
app.get('/api/cashback', (req, res) => {
    const db = readDB();
    res.json(db.movimientos_cashback || []);
});

/**
 * Endpoint para consultar la configuración global del sistema de Cashback.
 * @route GET /api/cashback/config
 * @returns {Object} JSON con porcentaje, días de vigencia y aviso de caducidad.
 */
app.get('/api/cashback/config', (req, res) => {
    const db = readDB();
    res.json(db.cashback_config || { porcentaje: 5, dias_vigencia: 30, dias_aviso_caducidad: 7 });
});

/**
 * Endpoint para actualizar las reglas/configuración del sistema de Cashback.
 * @route POST /api/cashback/config
 * @param {number} req.body.porcentaje - Porcentaje de devolución.
 * @param {number} req.body.dias_vigencia - Vigencia del saldo en días.
 * @param {number} req.body.dias_aviso_caducidad - Días previos para alertar caducidad.
 * @returns {Object} JSON con mensaje de éxito y la configuración actualizada.
 */
app.post('/api/cashback/config', (req, res) => {
    const { porcentaje, dias_vigencia, dias_aviso_caducidad } = req.body;
    const db = readDB();

    db.cashback_config = {
        porcentaje: parseFloat(porcentaje) || 5,
        dias_vigencia: parseInt(dias_vigencia) || 30,
        dias_aviso_caducidad: parseInt(dias_aviso_caducidad) || 7
    };

    writeDB(db);
    res.json({ success: true, message: "Reglas de cashback actualizadas.", config: db.cashback_config });
});

/**
 * Endpoint para obtener el estatus, saldo, historial y alertas de cashback de un cliente.
 * @route GET /api/cashback/cliente/:id
 * @param {string} req.params.id - Identificador o correo del cliente.
 * @returns {Object} JSON con el saldo actual, saldo por caducar y el historial de movimientos.
 */
app.get('/api/cashback/cliente/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();

    const cliente = (db.usuarios || []).find(u => u.id === id || (u.correo && u.correo.toLowerCase() === id.toLowerCase()));
    if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const movimientos = (db.movimientos_cashback || []).filter(m => m.id_cliente === cliente.id);
    const config = db.cashback_config || { dias_aviso_caducidad: 7 };

    const hoy = new Date();
    const avisoLimite = new Date();
    avisoLimite.setDate(hoy.getDate() + (config.dias_aviso_caducidad || 7));

    const proximosACaducar = movimientos.filter(m => {
        if (m.tipo !== 'acreditacion' || m.estatus !== 'vigente' || !m.fecha_caducidad) return false;
        const cad = new Date(m.fecha_caducidad);
        return cad > hoy && cad <= avisoLimite;
    });

    const saldoPorCaducar = proximosACaducar.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);

    res.json({
        cliente: {
            id: cliente.id,
            nombre: cliente.nombre,
            correo: cliente.correo,
            saldo_cashback: cliente.saldo_cashback || 0
        },
        saldoPorCaducar: saldoPorCaducar,
        fechaLimiteProxima: proximosACaducar.length > 0 ? proximosACaducar[0].fecha_caducidad : null,
        historial: movimientos.reverse() 
    });
});

/**
 * Endpoint para registrar una venta procesando la acreditación o redención de Cashback.
 * @route POST /api/ventas/registrar-con-cashback
 * @param {Object} req.body - Datos de la venta incluyendo 'cashback_usado' y datos del cliente.
 * @returns {Object} JSON confirmando la transacción y el saldo/cashback generado.
 */
app.post('/api/ventas/registrar-con-cashback', (req, res) => {
    const venta = req.body;
    const db = readDB();

    if (!db.ventas) db.ventas = [];
    if (!db.movimientos_cashback) db.movimientos_cashback = [];
    if (!db.usuarios) db.usuarios = [];

    const config = db.cashback_config || { porcentaje: 5, dias_vigencia: 30 };
    const cliente = db.usuarios.find(u => u.id === venta.id_cliente);

    let cashbackRedimido = parseFloat(venta.cashback_usado) || 0;
    let cashbackGenerado = 0;

    if (cliente) {
        if (cashbackRedimido > 0) {
            cliente.saldo_cashback = Math.max(0, (cliente.saldo_cashback || 0) - cashbackRedimido);
            db.movimientos_cashback.push({
                id_movimiento: `CB-RED-${Date.now()}`,
                id_cliente: cliente.id,
                id_venta: venta.id_venta,
                tipo: 'redencion',
                monto: cashbackRedimido,
                motivo: 'Usado en compra',
                fecha: new Date().toISOString(),
                estatus: 'aplicado'
            });
        }

        const baseCalculo = Math.max(0, venta.total - cashbackRedimido);
        cashbackGenerado = parseFloat(((baseCalculo * config.porcentaje) / 100).toFixed(2));

        if (cashbackGenerado > 0) {
            const fechaCaducidad = new Date();
            fechaCaducidad.setDate(fechaCaducidad.getDate() + config.dias_vigencia);

            cliente.saldo_cashback = parseFloat(((cliente.saldo_cashback || 0) + cashbackGenerado).toFixed(2));

            db.movimientos_cashback.push({
                id_movimiento: `CB-ACR-${Date.now()}`,
                id_cliente: cliente.id,
                id_venta: venta.id_venta,
                tipo: 'acreditacion',
                monto: cashbackGenerado,
                motivo: 'Acumulado 5% compra',
                fecha: new Date().toISOString(),
                fecha_caducidad: fechaCaducidad.toISOString(),
                estatus: 'vigente'
            });
        }
    }

    venta.cashback_generado = cashbackGenerado;
    venta.cashback_redimido = cashbackRedimido;
    db.ventas.push(venta);

    writeDB(db);

    res.json({
        success: true,
        message: "Venta registrada con éxito.",
        cashback_generado: cashbackGenerado,
        nuevo_saldo: cliente ? cliente.saldo_cashback : 0
    });
});

/** ==========================================
 *  INICIALIZACIÓN DEL SERVIDOR 
 *  ========================================== */

/**
 * Inicia el servidor Express en el puerto configurado.
 */
app.listen(PORT, () => {
    console.log(`>>> Servidor activo en: http://127.0.0.1:${PORT}`);
    console.log(`>>> Iniciar sesión (login): http://127.0.0.1:${PORT}/login`);
});