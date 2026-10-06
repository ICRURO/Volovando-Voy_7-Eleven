/**
 * @file reports.js
 * @description Lógica del lado del cliente para el módulo de reportes.
 * Permite la navegación entre diferentes pestañas de reportes, actualiza dinámicamente
 * los encabezados de la tabla y consume la API para mostrar los datos solicitados.
 */

document.addEventListener("DOMContentLoaded", () => {
    initReports();
});

/**
 * @function initReports
 * @description Inicializa el módulo de reportes configurando los eventos de las pestañas
 * y cargando el reporte por defecto ('sales-period').
 * @returns {void}
 */
function initReports() {
    setupTabs();
    loadReportData('sales-period');
}

/**
 * @function setupTabs
 * @description Asigna los eventos de clic a los botones de las pestañas (.tab-btn).
 * Gestiona el cambio de la clase 'active' para resaltar la pestaña seleccionada,
 * actualiza el título del reporte y llama a la función para cargar los datos correspondientes.
 * @returns {void}
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            const reportType = e.target.dataset.report;
            updateReportTitle(reportType);
            loadReportData(reportType);
        });
    });
}

/**
 * @function updateReportTitle
 * @description Actualiza el elemento del DOM que muestra el título del reporte actual
 * basándose en el tipo de reporte seleccionado.
 * @param {string} type - El identificador del tipo de reporte.
 * @returns {void}
 */
function updateReportTitle(type) {
    const titles = {
        'sales-period': 'Reporte de Ventas por Periodo',
        'sales-employee': 'Reporte de Ventas por Empleado',
        'top-products': 'Reporte de Productos Más Vendidos',
        'inventory-shrinks': 'Reporte de Mermas y Bajas de Inventario',
        'cashback': 'Reporte de Cashback Otorgado vs Redimido',
        'attendance': 'Reporte de Asistencia y Horarios',
        'payment-methods': 'Reporte de Ventas por Método de Pago'
    };
    document.getElementById('reportTitle').textContent = titles[type] || 'Reporte';
}

/**
 * @async
 * @function loadReportData
 * @description Limpia la tabla actual, genera dinámicamente los encabezados y consume la API.
 * @param {string} type - El identificador del tipo de reporte.
 * @returns {Promise<void>}
 */
async function loadReportData(type) {
    const thead = document.querySelector('#reportTable thead');
    const tbody = document.querySelector('#reportTable tbody');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';

    let headers = [];
    let rowsData = [];

    switch(type) {
        case 'sales-period':
            headers = ['ID Venta', 'Fecha', 'Total'];
            break;
        case 'sales-employee':
            headers = ['Empleado', 'Ventas Realizadas', 'Monto Total'];
            break;
        case 'top-products':
            headers = ['Producto', 'Unidades Vendidas', 'Ingresos Generados'];
            break;
        case 'inventory-shrinks':
            headers = ['ID Producto', 'Producto / Volován', 'Total Mermas (-1)', 'Costo Ref.', 'Última Fecha'];
            break;
        case 'cashback':
            // Encabezados exactos que tienes en tu vista actual
            headers = ['ID', 'FECHA', 'VENTA / CLIENTE', 'MONTO', 'MOTIVO / BALANCE'];
            break;
        case 'attendance':
            headers = ['Empleado', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Estado'];
            break;
        case 'payment-methods':
            headers = ['Método de Pago', 'Número de Transacciones', 'Monto Acumulado'];
            break;
        default:
            headers = ['Información'];
    }

    // Dibujar encabezados
    let trHead = document.createElement('tr');
    headers.forEach(h => {
        let th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    try {
        if (type === 'inventory-shrinks') {
            const response = await fetch('/api/losses');
            if (response.ok) {
                const losses = await response.json();
                const agrupado = {};
                losses.forEach(item => {
                    const key = item.productId || item.productName;
                    if (!agrupado[key]) {
                        agrupado[key] = {
                            id: item.productId || 'N/A',
                            name: item.productName || 'Volován',
                            totalQty: 0,
                            cost: Number(item.cost) || 0,
                            lastDate: item.date || item.fecha
                        };
                    }
                    agrupado[key].totalQty += (Number(item.quantity) || 1);
                    agrupado[key].lastDate = item.date || item.fecha || agrupado[key].lastDate;
                });

                rowsData = Object.values(agrupado).map(p => [
                    `#${p.id}`,
                    p.name,
                    p.totalQty.toString(),
                    `$${p.cost.toFixed(2)}`,
                    p.lastDate ? new Date(p.lastDate).toLocaleString() : 'N/D'
                ]);
            }
        } else if (type === 'cashback') {
            // Obtenemos los movimientos de cashback
            const response = await fetch('/api/cashback');
            if (response.ok) {
                const movimientos = await response.json();
                
                rowsData = movimientos.map(c => {
                    // Soporte para id_movimiento o id
                    const idMov = c.id_movimiento || c.id || 'N/D';
                    
                    // Soporte para fecha o date
                    const rawDate = c.fecha || c.date;
                    const fechaFormateada = rawDate ? new Date(rawDate).toLocaleString() : 'N/D';
                    
                    // Identificación de venta y cliente
                    const venta = c.id_venta || c.ticket || 'Venta N/D';
                    const cliente = c.id_cliente || c.cliente || '';
                    const ventaCliente = cliente ? `${venta} (${cliente})` : venta;

                    // Validar si fue acreditación (+5%) o redención (usado en compra)
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
        } else {
            const response = await fetch(`/api/reports/${type}`);
            if (response.ok) {
                const data = await response.json();
                rowsData = data.rows || [];
            }
        }
    } catch (error) {
        console.error("Error al conectar con la base de datos de reportes:", error);
    }

    // Renderizar filas
    if (rowsData.length > 0) {
        rowsData.forEach(rowItem => {
            let tr = document.createElement('tr');
            rowItem.forEach((cellText, idx) => {
                let td = document.createElement('td');
                td.textContent = cellText;
                
                // Color verde si sumó (+) o rojo si usó cashback (-)
                if (type === 'cashback' && idx === 3) {
                    if (cellText.startsWith('+')) td.style.color = '#2e7d32';
                    if (cellText.startsWith('-')) td.style.color = '#c62828';
                    td.style.fontWeight = 'bold';
                }

                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    } else {
        let tr = document.createElement('tr');
        let td = document.createElement('td');
        td.colSpan = headers.length;
        td.textContent = "No hay registros disponibles en la base de datos para este reporte.";
        td.style.textAlign = "center";
        td.style.color = "#64748b";
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}