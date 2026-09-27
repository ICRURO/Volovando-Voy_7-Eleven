document.addEventListener("DOMContentLoaded", () => {
    const inputQuery = document.getElementById("clienteQuery");
    const btnBuscar = document.getElementById("btnBuscar");

    // Elementos de la tarjeta de información
    const txtNombreCliente = document.getElementById("txtNombreCliente");
    const txtIdCliente = document.getElementById("txtIdCliente");
    const txtCorreoCliente = document.getElementById("txtCorreoCliente");
    const txtSaldo = document.getElementById("txtSaldo");
    const txtEstatus = document.getElementById("txtEstatus");

    // Alerta de vencimiento
    const alertaVencimiento = document.getElementById("alertaVencimiento");
    const montoAlerta = document.getElementById("montoAlerta");
    const fechaAlerta = document.getElementById("fechaAlerta");

    // Tabla de movimientos
    const tablaHistorial = document.getElementById("tablaHistorial");

    // Función principal para consultar cliente a la API
    async function consultarCliente(criterio) {
        if (!criterio) {
            alert("Por favor ingresa un ID de cliente o correo.");
            return;
        }

        try {
            const respuesta = await fetch(`/api/cashback/cliente/${encodeURIComponent(criterio)}`);
            
            if (!respuesta.ok) {
                alert("No se encontró ningún cliente registrado con ese dato.");
                return;
            }

            const data = await respuesta.json();
            const { cliente, saldoPorCaducar, fechaLimiteProxima, historial } = data;

            // 1. Mostrar datos de usuario
            txtNombreCliente.textContent = cliente.nombre || "Cliente";
            txtIdCliente.textContent = cliente.id || "--";
            txtCorreoCliente.textContent = cliente.correo || "--";
            txtSaldo.textContent = `$${(parseFloat(cliente.saldo_cashback) || 0).toFixed(2)}`;

            // 2. HU-32: Mostrar notificación si hay saldo por caducar
            if (saldoPorCaducar > 0 && fechaLimiteProxima) {
                montoAlerta.textContent = `$${saldoPorCaducar.toFixed(2)}`;
                fechaAlerta.textContent = new Date(fechaLimiteProxima).toLocaleDateString();
                alertaVencimiento.style.display = "block";
            } else {
                alertaVencimiento.style.display = "none";
            }

            // 3. HU-33: Llenar la tabla del historial
            if (!historial || historial.length === 0) {
                tablaHistorial.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; color: #777; padding: 20px;">
                            Este cliente aún no tiene movimientos de cashback registrados.
                        </td>
                    </tr>
                `;
                return;
            }

            tablaHistorial.innerHTML = historial.map(item => {
                const esAcred = item.tipo === 'acreditacion';
                const claseMonto = esAcred ? 'badge-plus' : 'badge-minus';
                const signo = esAcred ? '+' : '-';
                const textoTipo = esAcred 
                    ? 'Acreditación (+)' 
                    : (item.tipo === 'redencion' ? 'Pago en caja (-)' : 'Vencido');
                
                const fechaTexto = item.fecha ? new Date(item.fecha).toLocaleString() : '--';
                const venceTexto = item.fecha_caducidad ? new Date(item.fecha_caducidad).toLocaleDateString() : 'N/A';

                return `
                    <tr>
                        <td>${fechaTexto}</td>
                        <td><span class="${claseMonto}">${textoTipo}</span></td>
                        <td>${item.id_venta || '---'}</td>
                        <td class="${claseMonto}">${signo}$${(parseFloat(item.monto) || 0).toFixed(2)}</td>
                        <td>${venceTexto}</td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error("Error al cargar la información del cliente:", error);
            alert("Ocurrió un error al consultar el servidor.");
        }
    }

    // Eventos
    btnBuscar.addEventListener("click", () => {
        consultarCliente(inputQuery.value.trim());
    });

    inputQuery.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            consultarCliente(inputQuery.value.trim());
        }
    });

    // Cargar automáticamente a Sara (CLI-1001) para verla de inmediato
    consultarCliente("CLI-1001");
});