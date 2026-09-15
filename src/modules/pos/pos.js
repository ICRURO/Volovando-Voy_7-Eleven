import { mockProductos, mockClientes } from "./mockData.js";

let carrito = [];
let clienteActual = null;
let categoriaActiva = "salados";

const catalogGrid = document.getElementById("catalogGrid");
const ticketItems = document.getElementById("ticketItems");
const subtotalLabel = document.getElementById("subtotalLabel");
const totalLabel = document.getElementById("totalLabel");
const searchProduct = document.getElementById("searchProduct");
const searchClient = document.getElementById("searchClient");
const clientInfo = document.getElementById("clientInfo");
const btnCheckout = document.getElementById("btnCheckout");

function renderCatalogo() {
  const query = searchProduct.value.toLowerCase();
  const filtrados = mockProductos.filter(p => 
    p.categoria === categoriaActiva && p.nombre.toLowerCase().includes(query)
  );

  catalogGrid.innerHTML = filtrados.map(p => `
    <div class="product-card">
      <div><strong>${p.nombre}</strong></div>
      <img src="${p.img}" alt="${p.nombre}">
      <div style="margin-bottom: 8px;">$${p.precio.toFixed(2)}</div>
      <button class="btn-add" data-id="${p.id}">+ Agregar</button>
    </div>
  `).join("");

  catalogGrid.querySelectorAll(".btn-add").forEach(btn => {
    btn.addEventListener("click", () => agregarAlTicket(Number(btn.dataset.id)));
  });
}

function agregarAlTicket(id) {
  const existente = carrito.find(item => item.id === id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    const producto = mockProductos.find(p => p.id === id);
    carrito.push({ ...producto, cantidad: 1 });
  }
  renderTicket();
}

function renderTicket() {
  ticketItems.innerHTML = carrito.map(item => `
    <div class="ticket-item-line">
      <span>${item.cantidad}X ${item.nombre}</span>
      <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
    </div>
  `).join("");

  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  subtotalLabel.textContent = `$${total.toFixed(2)}`;
  totalLabel.textContent = `$${total.toFixed(2)}`;
}

searchClient.addEventListener("input", (e) => {
  const query = e.target.value.trim().toUpperCase();
  clienteActual = mockClientes.find(c => c.id === query) || null;

  if (clienteActual) {
    clientInfo.textContent = `-- ${clienteActual.nombre} (Cashback: $${clienteActual.cashback.toFixed(2)})`;
  } else {
    clientInfo.textContent = query ? "-- No encontrado --" : "-- Sin cliente asociado --";
  }
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    categoriaActiva = btn.dataset.cat;
    renderCatalogo();
  });
});

searchProduct.addEventListener("input", renderCatalogo);

btnCheckout.addEventListener("click", () => {
  if (carrito.length === 0) {
    alert("El ticket está vacío.");
    return;
  }
  const tipoVenta = document.querySelector('input[name="saleType"]:checked').value;
  alert(`Venta completada con éxito.\nTipo: ${tipoVenta}\nCliente: ${clienteActual ? clienteActual.nombre : "Mostrador general"}`);
  
  carrito = [];
  renderTicket();
});

renderCatalogo();