document.addEventListener("DOMContentLoaded", () => {
    initReports();
});

function initReports() {
    setupTabs();
    loadReportData('sales-period');
}

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
            headers = ['ID Producto', 'Descripción', 'Cantidad Baja', 'Motivo', 'Fecha'];
            break;
        case 'cashback':
            headers = ['Cliente', 'Cashback Otorgado', 'Cashback Redimido', 'Balance Actual'];
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

    let trHead = document.createElement('tr');
    headers.forEach(h => {
        let th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    try {
        const response = await fetch(`/api/reports/${type}`);
        if (response.ok) {
            const data = await response.json();
            rowsData = data.rows || [];
        }
    } catch (error) {
        console.error("Error al conectar con la base de datos de reportes:", error);
    }

    if (rowsData.length > 0) {
        rowsData.forEach(rowItem => {
            let tr = document.createElement('tr');
            rowItem.forEach(cellText => {
                let td = document.createElement('td');
                td.textContent = cellText;
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