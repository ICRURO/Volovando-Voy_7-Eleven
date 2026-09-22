import { products } from "./mockData.js";

let carrito = [];
let clienteActual = null;
let categoriaActiva = "salados";

const catalogGrid = document.getElementById("product-grid");
const ticketItems = document.getElementById("ticket-items");
const subtotalLabel = document.getElementById("subtotal");
const totalLabel = document.getElementById("total");
const searchProduct = document.getElementById("search");
const searchClient = document.getElementById("client-search");
const clientInfo = document.getElementById("client-name");
const btnCheckout = document.getElementById("btn-pay");
const ckMetodoPago = document.getElementsByName("metodo-pago");

function renderCatalogo() {
  const query = searchProduct.value.toLowerCase();
  const filtrados = products.filter(p =>
    p.category === categoriaActiva && p.name.toLowerCase().includes(query)
  );

  catalogGrid.innerHTML = filtrados.map(p => `
    <div class="product-card">
      <div><strong>${p.name}</strong></div>
      <img src="${p.img}" alt="${p.name}">
      <div style="margin-bottom: 8px;">$${p.price.toFixed(2)}</div>
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
    const producto = products.find(p => p.id === id);
    if (producto) carrito.push({ ...producto, cantidad: 1 });
  }
  renderTicket();
}

function renderTicket() {
  ticketItems.innerHTML = carrito.map(item => `
    <div class="ticket-item-line">
      <span>${item.cantidad}X ${item.name}</span>
      <span>$${(item.price * item.cantidad).toFixed(2)}</span>
    </div>
  `).join("");

  const total = carrito.reduce((acc, item) => acc + (item.price * item.cantidad), 0);
  subtotalLabel.textContent = `$${total.toFixed(2)}`;
  totalLabel.textContent = `$${total.toFixed(2)}`;
}

searchClient.addEventListener('input', (e) => {
  const query = e.target.value.trim().toUpperCase();
  clienteActual = null;
  clientInfo.textContent = query ? "-- No encontrado --" : "-- Sin cliente asociado --";
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    categoriaActiva = btn.dataset.category;
    renderCatalogo();
  });
});

searchProduct.addEventListener("input", renderCatalogo);

btnCheckout.addEventListener("click", () => {
  if (carrito.length === 0) {
    alert("El ticket está vacío.");
    return;
  }
  const tipoVenta = document.querySelector('input[name="tipo-venta"]:checked').value;
  const tipoPago = [];
  var metodosPago = Array.from(document.querySelectorAll('input[name="metodo-pago"]:checked')).map(function(metodopago){
    return metodopago.value;
  });
  metodosPago.forEach(element => {
    tipoPago.push(element);
  });
  
  alert(`Venta completada con éxito.\nTipo: ${tipoVenta}\nCliente: ${clienteActual ? clienteActual.nombre : "Mostrador general"}\nMétodo de pago: ${tipoPago}`);
  
  carrito = [];
  renderTicket();
});

renderCatalogo();