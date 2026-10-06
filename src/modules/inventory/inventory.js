/**
 * @file inventory.js
 * @description Lógica del lado del cliente para el módulo de inventario.
 * Se encarga de cargar los productos, mostrar métricas, filtrar mediante búsqueda
 * y ajustar el stock directamente desde la interfaz, comunicándose con la API.
 */

/**
 * @type {Array<Object>}
 * @description Arreglo global que almacena los datos del inventario cargados desde el servidor.
 */
let inventory = [];

// Referencias a los elementos del DOM
const tbody = document.getElementById("inventory-tbody");
const searchInput = document.getElementById("input-search");
const metricTotal = document.getElementById("metric-total");
const metricUnits = document.getElementById("metric-units");
const metricAlerts = document.getElementById("metric-alerts");

/**
 * @async
 * @function fetchInventory
 * @description Obtiene los datos del inventario desde la base de datos (backend) 
 * y llama a la función para renderizar la tabla.
 * @returns {Promise<void>} No retorna valor, actualiza el estado global y la vista.
 */
async function fetchInventory() {
    try {
        const res = await fetch('/api/inventory');
        if (!res.ok) throw new Error("Error al obtener inventario");
        inventory = await res.json();
        renderTable();
    } catch (error) {
        console.error("Error al cargar inventario:", error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color: red;">Error al conectar con la base de datos.</td></tr>`;
    }
}

/**
 * @function calculateMetrics
 * @description Calcula y actualiza en el DOM las métricas generales del inventario:
 * total de productos únicos, total de unidades físicas y cantidad de productos con stock bajo.
 * @returns {void}
 */
function calculateMetrics() {
    const totalItems = inventory.length;
    const totalUnits = inventory.reduce((acc, item) => acc + (parseInt(item.stock_actual) || 0), 0);
    const lowStockCount = inventory.filter(item => (item.stock_actual || 0) <= (item.stock_minimo || 5)).length;

    metricTotal.textContent = totalItems;
    metricUnits.textContent = totalUnits;
    metricAlerts.textContent = lowStockCount;
}

/**
 * @function getStatusBadge
 * @description Genera el código HTML para la etiqueta visual de estado de un producto.
 * @param {number} stock - El stock actual del producto.
 * @param {number} min - El stock mínimo permitido antes de mostrar alerta.
 * @returns {string} Cadena de texto con el HTML del badge ('Agotado', 'Stock Bajo' o 'Disponible').
 */
function getStatusBadge(stock, min) {
    if (stock === 0) {
        return `<span class="badge badge-out" style="color: red; font-weight: bold;">Agotado</span>`;
    } else if (stock <= min) {
        return `<span class="badge badge-low" style="color: orange; font-weight: bold;">Stock Bajo</span>`;
    }
    return `<span class="badge badge-ok" style="color: green; font-weight: bold;">Disponible</span>`;
}

/**
 * @function renderTable
 * @description Construye e inyecta las filas de la tabla de inventario en el DOM.
 * @param {Array<Object>} [data=inventory] - Arreglo de productos a renderizar (por defecto usa el inventario completo).
 * @returns {void}
 */
function renderTable(data = inventory) {
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px;">No se encontraron productos coincidentes.</td></tr>`;
        return;
    }

    data.forEach((item) => {
        const tr = document.createElement("tr");
        const stockActual = item.stock_actual !== undefined ? item.stock_actual : (item.stock || 0);
        const stockMin = item.stock_minimo !== undefined ? item.stock_minimo : (item.stockMinimo || 5);
        const precio = item.precio_venta !== undefined ? item.precio_venta : (item.precio || 0);

        tr.innerHTML = `
            <td>#${item.id}</td>
            <td><strong>${item.nombre}</strong></td>
            <td>${item.categoria}</td>
            <td>$${parseFloat(precio).toFixed(2)}</td>
            <td><strong>${stockActual}</strong></td>
            <td>${stockMin}</td>
            <td>${getStatusBadge(stockActual, stockMin)}</td>
            <td>
                <button class="btn-action" data-action="add" data-id="${item.id}" style="padding: 2px 8px; cursor: pointer;">+1</button>
                <button class="btn-action" data-action="sub" data-id="${item.id}" style="padding: 2px 8px; cursor: pointer;">-1</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Actualizar los KPIs cada vez que se redibuja la tabla
    calculateMetrics();
}

// ==========================================
// EVENTOS DE LA INTERFAZ
// ==========================================

/**
 * @event input
 * @description Escucha los cambios en el campo de búsqueda de texto para filtrar 
 * la tabla de inventario en tiempo real por nombre o categoría.
 */
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = inventory.filter(
            (item) =>
                item.nombre.toLowerCase().includes(term) ||
                item.categoria.toLowerCase().includes(term)
        );
        renderTable(filtered);
    });
}

/**
 * @event click
 * @description Delegación de eventos en el cuerpo de la tabla para manejar los botones de sumar (+1) o restar (-1) stock.
 * Actualiza la interfaz de inmediato, persiste el cambio de stock y registra la merma si se resta stock (-1).
 */
tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const product = inventory.find((p) => String(p.id) === String(id));

    if (!product) return;

    let stockPrevio = product.stock_actual !== undefined ? product.stock_actual : product.stock;
    let nuevoStock = stockPrevio;

    if (action === "add") {
        nuevoStock += 1;
    } else if (action === "sub" && stockPrevio > 0) {
        nuevoStock -= 1;
    } else {
        return; // Si el stock ya es 0 y se presiona -1, no hace nada
    }

    product.stock_actual = nuevoStock;

    // Actualizar visualmente de inmediato
    renderTable();

    // 1. Persistir el nuevo stock en el backend
    try {
        await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: product.id, stock: nuevoStock })
        });
    } catch (error) {
        console.error("Error al actualizar stock en el servidor:", error);
    }

    // 2. Si la acción fue restar (-1), registrar la merma en la base de datos
    if (action === "sub" && stockPrevio > 0) {
        try {
            const precioRef = product.precio_venta !== undefined ? product.precio_venta : (product.precio || 0);
            await fetch('/api/losses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    productName: product.nombre,
                    quantity: 1,
                    cost: parseFloat(precioRef) || 0,
                    reason: 'Ajuste manual de inventario (-1)'
                })
            });
        } catch (error) {
            console.error("Error al registrar merma:", error);
        }
    }
});

// Cargar los productos reales al iniciar la página
fetchInventory();