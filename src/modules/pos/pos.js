// ==========================================
// PUNTO DE VENTA (POS) - VOLOVANDO VOY
// ==========================================

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
        const response = await fetch('../../../database.json');
        const db = await response.json();
        
        inventarioBD = db.inventario || [];
        usuariosBD = db.usuarios || [];

        // H30: Identificar al cajero/empleado en turno
        empleadoEnTurno = usuariosBD.find(u => u.rol === 'admin' || u.rol === 'empleado' || u.rol === 'cajero');
        if (empleadoEnTurno) {
            const empInfo = document.getElementById("empleado-info");
            if (empInfo) empInfo.innerText = `Cajero: ${empleadoEnTurno.nombre}`;
        }

        renderCatalogo();
    } catch (error) {
        console.error("Error al cargar la BD:", error);
        alert("Error al conectar con la base de datos.");
    }
}

// Renderizar Catálogo
function renderCatalogo() {
    const query = searchInput ? searchInput.value.toLowerCase() : "";
    const filtrados = inventarioBD.filter(p => {
        const matchCat = categoriaActiva === "Todos" || p.categoria === categoriaActiva;
        const matchSearch = p.nombre.toLowerCase().includes(query);
        return matchCat && matchSearch;
    });

    if (!catalogGrid) return;

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
        <div class="ticket-item" style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>${item.cantidad}x ${item.nombre}</span>
            <span>$${(item.precio_venta * item.cantidad).toFixed(2)}</span>
        </div>`;
    }).join("");

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

// Búsqueda de Cliente con Saldo de Cashback (HU-3 / HU-18)
const clientSearchInput = document.getElementById("client-search");
if (clientSearchInput) {
    clientSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        if (!query) {
            clienteActual = null;
            document.getElementById("client-name").textContent = "Público General";
            return;
        }

        clienteActual = usuariosBD.find(u => 
            u.rol === 'cliente' && 
            ((u.id && u.id.toLowerCase() === query) || (u.correo && u.correo.toLowerCase().includes(query)))
        );
        
        if (clienteActual) {
            const saldo = parseFloat(clienteActual.saldo_cashback) || 0;
            document.getElementById("client-name").innerHTML = `<strong>${clienteActual.nombre}</strong> <span style="color:#e68a19; font-weight:bold;">(Saldo CB: $${saldo.toFixed(2)})</span>`;
        } else {
            document.getElementById("client-name").textContent = "Público General";
        }
    });
}

// H12 y H28: Mostrar u ocultar campos de entrega a domicilio
document.querySelectorAll('input[name="tipo-venta"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const fields = document.getElementById('domicilio-fields');
        if (fields) fields.style.display = e.target.value === 'Domicilio' ? 'block' : 'none';
    });
});

// H29: Cancelación con autorización de PIN de Administrador
const btnCancel = document.getElementById("btn-cancel");
if (btnCancel) {
    btnCancel.addEventListener("click", () => {
        if (carrito.length === 0) {
            alert("No hay productos en el ticket para cancelar.");
            return;
        }

        const pin = prompt("Requiere PIN de Administrador para anular ticket (Usa la clave: 123):");
        if (pin === null) return; 

        const supervisor = usuariosBD.find(u => u.rol === 'admin' && String(u.password) === String(pin));
        
        if (supervisor) {
            carrito = [];
            const dir = document.getElementById("dom-direccion");
            const ref = document.getElementById("dom-ref");
            if (dir) dir.value = "";
            if (ref) ref.value = "";

            const radioMostrador = document.querySelector('input[value="Mostrador"]');
            if (radioMostrador) radioMostrador.checked = true;

            const fields = document.getElementById('domicilio-fields');
            if (fields) fields.style.display = 'none';
            
            renderTicket();
            alert(`Ticket cancelado correctamente. Autorizó: ${supervisor.nombre}`);
        } else {
            alert("PIN Incorrecto. Acción denegada.");
        }
    });
}

const chkEfectivo = document.getElementById("check-efectivo");
const inpEfectivo = document.getElementById("input-efectivo");
if (chkEfectivo) {
    chkEfectivo.addEventListener("click", async () => {
        if (chkEfectivo.checked) {
            inpEfectivo.disabled = false;
        } else {
            inpEfectivo.disabled = true;
            inpEfectivo.value = "0.00";
        }
    })
}

const chkTarjeta = document.getElementById("check-tarjeta");
const inpTarjeta = document.getElementById("input-tarjeta");
if (chkTarjeta) {
    chkTarjeta.addEventListener("click", async () => {
        if (chkTarjeta.checked) {
            inpTarjeta.disabled = false;
        } else {
            inpTarjeta.disabled = true;
            inpTarjeta.value = "0.00";
        }
    })
}

const chkTransferencia = document.getElementById("check-transferencia");
const inpTransferencia = document.getElementById("input-transferencia");
if (chkTransferencia) {
    chkTransferencia.addEventListener("click", async () => {
        if (chkTransferencia.checked) {
            inpTransferencia.disabled = false;
        } else {
            inpTransferencia.disabled = true;
            inpTransferencia.value = "0.00";
        }
    })
}

const chkCashback = document.getElementById("check-cashback");
const inpCashback = document.getElementById("input-cashback");
if (chkCashback) {
    chkCashback.addEventListener("click", async () => {
        if (chkCashback.checked) {
            inpCashback.disabled = false;
        } else {
            inpCashback.disabled = true;
            inpCashback.value = "0.00";
        }
    })
}

// H14, H17 y H18: Cobro de Venta con integración de Métodos de Pago y Cashback
const btnPay = document.getElementById("btn-pay");
if (btnPay) {
    btnPay.addEventListener("click", async () => {
        if (carrito.length === 0) {
            alert("El ticket está vacío.");
            return;
        }

        const radioVenta = document.querySelector('input[name="tipo-venta"]:checked');
        const tipoVenta = radioVenta ? radioVenta.value : 'Mostrador';
        let datosEntrega = "";

        if (tipoVenta === 'Domicilio') {
            const dir = document.getElementById("dom-direccion").value;
            if (!dir) {
                alert("Por favor, ingrese la dirección de entrega.");
                return;
            }
            datosEntrega = `<br>Entrega a: ${dir}`;
        }

        const totalVenta = parseFloat(totalLabel.textContent.replace('$', '')) || 0;
        const cbInput = document.getElementById("input-cashback");
        const pagoCashback = cbInput ? (parseFloat(cbInput.value) || 0) : 0;

        // Validaciones HU-18 (Pagar con saldo de cashback)
        if (pagoCashback > 0) {
            if (!clienteActual) {
                alert("Debes asociar un cliente registrado para poder descontar saldo de cashback.");
                return;
            }

            const saldoDisponible = parseFloat(clienteActual.saldo_cashback) || 0;
            if (pagoCashback > saldoDisponible) {
                alert(`Saldo insuficiente. El cliente solo tiene $${saldoDisponible.toFixed(2)} de cashback.`);
                return;
            }

            if (pagoCashback > totalVenta) {
                alert("El monto de cashback no puede superar el total de la venta.");
                return;
            }
        }

        // Definir el método de pago principal
        let metodo = 'efectivo';
        if (pagoCashback > 0) {
            metodo = (pagoCashback >= totalVenta) ? 'cashback' : 'mixto';
        }

        const nuevaVenta = {
            id_venta: `V-${Date.now()}`,
            fecha: new Date().toISOString(),
            id_empleado: empleadoEnTurno ? empleadoEnTurno.id : 'EMP-001',
            id_cliente: clienteActual ? clienteActual.id : 'CLI-GENERAL',
            metodo_pago: metodo,
            cashback_usado: pagoCashback,
            tipo_venta: tipoVenta,
            total: totalVenta,
            items: carrito
        };

        btnPay.disabled = true;
        btnPay.textContent = "Procesando...";

        let cbGanado = 0;
        try {
            // Guardar venta y procesar cashback en el servidor
            const res = await fetch('/api/ventas/registrar-con-cashback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevaVenta)
            });

            const data = await res.json();
            cbGanado = data.cashback_generado || 0;

            // Actualizar el saldo local del cliente en pantalla si aplica
            if (clienteActual && data.nuevo_saldo !== undefined) {
                clienteActual.saldo_cashback = data.nuevo_saldo;
            }

            // También descontar el stock en el inventario local
            carrito.forEach(item => {
                const prod = inventarioBD.find(p => p.id === item.id);
                if (prod) prod.stock_actual -= item.cantidad;
            });

        } catch (error) {
            console.error("Error al registrar la venta:", error);
            alert("Hubo un problema de conexión al guardar la venta.");
        } finally {
            btnPay.disabled = false;
            btnPay.textContent = "Cobrar";
        }

        // Descontar inventario en el servidor
        try {
            await fetch('/api/inventory/descontar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemsVendidos: carrito })
            });
        } catch (e) {
            console.warn("No se pudo descontar inventario en backend", e);
        }

        // Mostrar recibo impreso
        const receiptBody = document.getElementById("receipt-body");
        if (receiptBody) {
            receiptBody.innerHTML = `
                Fecha: ${new Date().toLocaleString()}<br>
                Le atendió: ${empleadoEnTurno ? empleadoEnTurno.nombre : 'Cajero'}<br>
                Cliente: ${clienteActual ? clienteActual.nombre : 'Público General'}<br>
                Tipo: ${tipoVenta} ${datosEntrega}<br><br>
                ${ticketItems.innerHTML}
                <br><strong>${promoInfo.innerText}</strong>
                <br><strong>TOTAL PAGADO: ${totalLabel.textContent}</strong>
                ${pagoCashback > 0 ? `<br><span style="color:#1565c0; font-weight:bold;">Pagado con Cashback: -$${pagoCashback.toFixed(2)}</span>` : ''}
                ${cbGanado > 0 ? `<br><span style="color:#2e7d32; font-weight:bold;">¡Cashback ganado hoy!: +$${cbGanado.toFixed(2)}</span>` : ''}
            `;
        }

        const receiptModal = document.getElementById("receipt-modal");
        if (receiptModal) receiptModal.style.display = "flex";
    });
}

// Cerrar recibo y reiniciar ticket
window.cerrarRecibo = function() {
    const modal = document.getElementById("receipt-modal");
    if (modal) modal.style.display = "none";
    
    carrito = [];
    if (clientSearchInput) clientSearchInput.value = "";
    document.getElementById("client-name").textContent = "Público General";
    clienteActual = null;

    // Limpiar inputs de cobro
    const cbInput = document.getElementById("input-cashback");
    if (cbInput) cbInput.value = "";
    
    renderTicket();
    renderCatalogo();
};

// Filtros de categorías
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        categoriaActiva = e.target.dataset.cat;
        renderCatalogo();
    });
});

if (searchInput) searchInput.addEventListener("input", renderCatalogo);

// Inicializar la carga al entrar a la página
cargarBD();