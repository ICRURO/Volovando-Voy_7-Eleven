// Variables de estado
let inventarioBD = [];
let usuariosBD = [];
let carrito = [];
let clienteActual = null;
let categoriaActiva = "Todos";
let empleadoEnTurno = null; // H30

// Referencias DOM
const catalogGrid = document.getElementById("product-grid");
const ticketItems = document.getElementById("ticket-items");
const subtotalLabel = document.getElementById("subtotal");
const totalLabel = document.getElementById("total");
const searchInput = document.getElementById("search");
const promoInfo = document.getElementById("promo-info");

// Cargar Base de Datos Real
async function cargarBD() {
    try {
        // En un servidor real se pide a una API. Aquí leemos el JSON local.
        const response = await fetch('../../../database.json');
        const db = await response.json();
        
        inventarioBD = db.inventario || [];
        usuariosBD = db.usuarios || [];

        // H30: Simulamos empleado logueado obteniendo el primer admin/cajero de la BD
        empleadoEnTurno = usuariosBD.find(u => u.rol === 'admin' || u.rol === 'cajero');
        if (empleadoEnTurno) {
            document.getElementById("empleado-info").innerText = `Cajero: ${empleadoEnTurno.nombre}`;
        }

        renderCatalogo();
    } catch (error) {
        console.error("Error al cargar la BD:", error);
        alert("Error al conectar con la base de datos.");
    }
}

// Renderizar Catálogo
function renderCatalogo() {
    const query = searchInput.value.toLowerCase();
    const filtrados = inventarioBD.filter(p => {
        const matchCat = categoriaActiva === "Todos" || p.categoria === categoriaActiva;
        const matchSearch = p.nombre.toLowerCase().includes(query);
        return matchCat && matchSearch;
    });

    catalogGrid.innerHTML = filtrados.map(p => `
        <div class="product-card" onclick="agregarAlTicket('${p.id}')">
            <img src="${p.imagen}" alt="${p.nombre}">
            <div class="info">
                <h3>${p.nombre}</h3>
                <p class="price">$${p.precio_venta.toFixed(2)}</p>
                <p style="font-size:0.75rem; color:#666;">Stock: ${p.stock_actual}</p>
            </div>
        </div>
    `).join("");
}

// Agregar al carrito
window.agregarAlTicket = function(idStr) {
    const producto = inventarioBD.find(p => p.id === idStr);
    if (!producto) return;

    if (producto.stock_actual <= 0) {
        alert("Producto sin stock en inventario.");
        return;
    }

    const existente = carrito.find(item => item.id === idStr);
    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }
    renderTicket();
}

// Renderizar Ticket y H27 (Promociones)
function renderTicket() {
    let subtotal = 0;
    let totalItems = 0;

    ticketItems.innerHTML = carrito.map(item => {
        subtotal += item.precio_venta * item.cantidad;
        totalItems += item.cantidad;
        return `
        <div class="ticket-item">
            <span>${item.cantidad}x ${item.nombre}</span>
            <span>$${(item.precio_venta * item.cantidad).toFixed(2)}</span>
        </div>`;
    }).join("");

    // H27: Lógica de Promociones (Ejemplo: Compra 3 productos y obtén 10% de descuento)
    let descuento = 0;
    if (totalItems >= 3) {
        descuento = subtotal * 0.10;
        promoInfo.innerText = `COMBO APLICADO: 10% de descuento (-$${descuento.toFixed(2)})`;
    } else {
        promoInfo.innerText = "";
    }

    const totalFinal = subtotal - descuento;
    subtotalLabel.textContent = `$${subtotal.toFixed(2)}`;
    totalLabel.textContent = `$${totalFinal.toFixed(2)}`;
}

// Búsqueda de Cliente
document.getElementById("client-search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    clienteActual = usuariosBD.find(u => u.rol === 'cliente' && (u.id.toLowerCase() === query || u.correo.includes(query)));
    
    document.getElementById("client-name").textContent = clienteActual ? clienteActual.nombre : "Público General";
});

// H12 y H28: Mostrar campos de domicilio
document.querySelectorAll('input[name="tipo-venta"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('domicilio-fields').style.display = e.target.value === 'Domicilio' ? 'block' : 'none';
    });
});

// H29: Cancelación con autorización
document.getElementById("btn-cancel").addEventListener("click", () => {
    // Si el carrito está vacío, avisar al usuario en lugar de ignorar el clic
    if (carrito.length === 0) {
        alert("No hay productos en el ticket para cancelar.");
        return;
    }

    // Pedir contraseña de admin (Maria de Lourdes = 123)
    const pin = prompt("Requiere PIN de Administrador para anular ticket (Usa la clave: 123):");
    
    // Si el usuario cancela la ventana del prompt
    if (pin === null) return; 

    // Buscar si la clave coincide con un admin en la BD
    const supervisor = usuariosBD.find(u => u.rol === 'admin' && String(u.password) === String(pin));
    
    if (supervisor) {
        // Limpiar todo el estado de la venta
        carrito = [];
        document.getElementById("dom-direccion").value = "";
        document.getElementById("dom-ref").value = "";
        document.querySelector('input[value="Mostrador"]').checked = true;
        document.getElementById('domicilio-fields').style.display = 'none';
        
        renderTicket();
        alert(`Ticket cancelado correctamente. Autorizó: ${supervisor.nombre}`);
    } else {
        alert("PIN Incorrecto. Acción denegada.");
    }
});

// H14: Generar Comprobante de Venta
document.getElementById("btn-pay").addEventListener("click", () => {
    if (carrito.length === 0) {
        alert("El ticket está vacío.");
        return;
    }

    const tipoVenta = document.querySelector('input[name="tipo-venta"]:checked').value;
    let datosEntrega = "";
    if (tipoVenta === 'Domicilio') {
        const dir = document.getElementById("dom-direccion").value;
        if(!dir) return alert("Por favor, ingrese la dirección de entrega.");
        datosEntrega = `<br>Entrega a: ${dir}`;
    }

    const receiptBody = document.getElementById("receipt-body");
    receiptBody.innerHTML = `
        Fecha: ${new Date().toLocaleString()}<br>
        Le atendió: ${empleadoEnTurno ? empleadoEnTurno.nombre : 'Cajero'}<br>
        Cliente: ${clienteActual ? clienteActual.nombre : 'General'}<br>
        Tipo: ${tipoVenta} ${datosEntrega}<br><br>
        ${ticketItems.innerHTML}
        <br><strong>${promoInfo.innerText}</strong>
        <br><strong>TOTAL PAGADO: ${totalLabel.textContent}</strong>
    `;
    
    document.getElementById("receipt-modal").style.display = "flex";
});

// Cerrar recibo y reiniciar
window.cerrarRecibo = function() {
    document.getElementById("receipt-modal").style.display = "none";
    carrito = [];
    document.getElementById("client-search").value = "";
    document.getElementById("client-name").textContent = "Público General";
    clienteActual = null;
    renderTicket();
}

// Filtros y Búsqueda
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        categoriaActiva = e.target.dataset.cat;
        renderCatalogo();
    });
});

searchInput.addEventListener("input", renderCatalogo);

// Inicializar
cargarBD();