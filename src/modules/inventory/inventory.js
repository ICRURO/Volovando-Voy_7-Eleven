let inventory = [];

const tbody = document.getElementById("inventory-tbody");
const searchInput = document.getElementById("input-search");
const metricTotal = document.getElementById("metric-total");
const metricUnits = document.getElementById("metric-units");
const metricAlerts = document.getElementById("metric-alerts");

// Cargar inventario desde el backend (database.json)
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

function calculateMetrics() {
    const totalItems = inventory.length;
    const totalUnits = inventory.reduce((acc, item) => acc + (parseInt(item.stock_actual) || 0), 0);
    const lowStockCount = inventory.filter(item => (item.stock_actual || 0) <= (item.stock_minimo || 5)).length;

    metricTotal.textContent = totalItems;
    metricUnits.textContent = totalUnits;
    metricAlerts.textContent = lowStockCount;
}

function getStatusBadge(stock, min) {
    if (stock === 0) {
        return `<span class="badge badge-out" style="color: red; font-weight: bold;">Agotado</span>`;
    } else if (stock <= min) {
        return `<span class="badge badge-low" style="color: orange; font-weight: bold;">Stock Bajo</span>`;
    }
    return `<span class="badge badge-ok" style="color: green; font-weight: bold;">Disponible</span>`;
}

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

    calculateMetrics();
}

// Búsqueda en tiempo real
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

// Ajustar existencias (+1 / -1) y guardarlas en el servidor
tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const product = inventory.find((p) => String(p.id) === String(id));

    if (!product) return;

    let nuevoStock = product.stock_actual !== undefined ? product.stock_actual : product.stock;

    if (action === "add") {
        nuevoStock += 1;
    } else if (action === "sub" && nuevoStock > 0) {
        nuevoStock -= 1;
    }

    product.stock_actual = nuevoStock;

    // Actualizar visualmente de inmediato
    renderTable();

    // Persistir en database.json
    try {
        await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: product.id, stock: nuevoStock })
        });
    } catch (error) {
        console.error("Error al actualizar stock en el servidor:", error);
    }
});

// Cargar los productos reales al iniciar
fetchInventory();