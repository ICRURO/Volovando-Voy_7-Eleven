import { getInventory, saveInventory } from "./inventoryData.js";

let inventory = getInventory();

const tbody = document.getElementById("inventory-tbody");
const searchInput = document.getElementById("input-search");
const metricTotal = document.getElementById("metric-total");
const metricUnits = document.getElementById("metric-units");
const metricAlerts = document.getElementById("metric-alerts");

function calculateMetrics() {
  const totalItems = inventory.length;
  const totalUnits = inventory.reduce((acc, item) => acc + item.stock, 0);
  const lowStockCount = inventory.filter(item => item.stock <= item.stockMinimo).length;

  metricTotal.textContent = totalItems;
  metricUnits.textContent = totalUnits;
  metricAlerts.textContent = lowStockCount;
}

function getStatusBadge(stock, min) {
  if (stock === 0) {
    return `<span class="badge badge-out">Agotado</span>`;
  } else if (stock <= min) {
    return `<span class="badge badge-low">Stock Bajo</span>`;
  }
  return `<span class="badge badge-ok">Disponible</span>`;
}

function renderTable(data = inventory) {
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px;">No se encontraron productos coincidentes.</td></tr>`;
    return;
  }

  data.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${item.id}</td>
      <td><strong>${item.nombre}</strong></td>
      <td>${item.categoria}</td>
      <td>$${item.precio.toFixed(2)}</td>
      <td><strong>${item.stock}</strong></td>
      <td>${item.stockMinimo}</td>
      <td>${getStatusBadge(item.stock, item.stockMinimo)}</td>
      <td>
        <button class="btn-action" data-action="add" data-id="${item.id}">+1</button>
        <button class="btn-action" data-action="sub" data-id="${item.id}">-1</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  calculateMetrics();
}

// Búsqueda en tiempo real
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase().trim();
  const filtered = inventory.filter(
    (item) =>
      item.nombre.toLowerCase().includes(term) ||
      item.categoria.toLowerCase().includes(term)
  );
  renderTable(filtered);
});

// Sumar o restar existencias
tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  const product = inventory.find((p) => p.id === id);

  if (!product) return;

  if (action === "add") {
    product.stock += 1;
  } else if (action === "sub" && product.stock > 0) {
    product.stock -= 1;
  }

  saveInventory(inventory);
  renderTable();
});

// Render inicial
renderTable();