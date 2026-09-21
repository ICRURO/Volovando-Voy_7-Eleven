document.addEventListener('DOMContentLoaded', () => {
    const formHorarios = document.getElementById('form-horarios');
    const inputApertura = document.getElementById('hora_apertura');
    const inputCierre = document.getElementById('hora_cierre');
    const inputTolerancia = document.getElementById('tolerancia_minutos');
    const divMensajeHorarios = document.getElementById('mensaje-horarios');

    const btnConsultar = document.getElementById('btn-consultar');
    const inputFiltro = document.getElementById('filtro-empleado');
    const tablaBody = document.getElementById('tabla-historial-body');
    const divMensajeHistorial = document.getElementById('mensaje-historial');

    let temporizadorAlerta;

    // Cargar la configuración de horarios actual 
    cargarConfiguracionHorarios();

    async function cargarConfiguracionHorarios() {
        try {
            const res = await fetch('/api/horarios');
            if (res.ok) {
                const config = await res.json();
                if (inputApertura) inputApertura.value = config.hora_apertura || "07:30";
                if (inputCierre) inputCierre.value = config.hora_cierre || "21:00";
                if (inputTolerancia) inputTolerancia.value = config.tolerancia_minutos !== undefined ? config.tolerancia_minutos : 15;
            }
        } catch (error) {
            console.error("Error al cargar la configuración de horarios:", error);
        }
    }

    // GUARDAR LOS HORARIOS
    if (formHorarios) {
        formHorarios.addEventListener('submit', async (e) => {
            e.preventDefault();

            const hora_apertura = inputApertura ? inputApertura.value : '';
            const hora_cierre = inputCierre ? inputCierre.value : '';
            const tolerancia_minutos = inputTolerancia ? inputTolerancia.value : '';

            try {
                const res = await fetch('/api/horarios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hora_apertura, hora_cierre, tolerancia_minutos })
                });

                const data = await res.json();

                if (res.ok) {
                    mostrarMensaje(divMensajeHorarios, data.message || 'Configuración actualizada con éxito.', 'exito');
                } else {
                    mostrarMensaje(divMensajeHorarios, data.message || 'Error al guardar horarios.', 'error');
                }
            } catch (error) {
                mostrarMensaje(divMensajeHorarios, 'Error de conexión con el servidor.', 'error');
            }
        });
    }

    // CONSULTAR EL HISTORIAL DE TURNOS
    if (btnConsultar) {
        btnConsultar.addEventListener('click', async () => {
            const id_empleado = inputFiltro ? inputFiltro.value.trim() : '';
            const url = id_empleado ? `/api/turnos/historial?id_empleado=${encodeURIComponent(id_empleado)}` : '/api/turnos/historial';

            try {
                const res = await fetch(url);
                const historial = await res.json();

                if (!res.ok) {
                    mostrarMensaje(divMensajeHistorial, 'Error al obtener el historial.', 'error');
                    return;
                }

                renderizarTablaHistorial(historial);
            } catch (error) {
                mostrarMensaje(divMensajeHistorial, 'Error de conexión con el servidor.', 'error');
            }
        });
    }

    function renderizarTablaHistorial(lista) {
        if (!tablaBody) return;

        if (!Array.isArray(lista) || lista.length === 0) {
            tablaBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 1.5rem; color: #666;">
                        No se encontraron registros de turnos.
                    </td>
                </tr>
            `;
            return;
        }

        tablaBody.innerHTML = lista.map(t => {
            const fechaEntrada = t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleString() : '-';
            const fechaSalida = t.fecha_fin ? new Date(t.fecha_fin).toLocaleString() : 'En turno activo';
            const estatusClass = t.estatus === 'abierto' ? 'badge-abierto' : 'badge-cerrado';

            return `
                <tr>
                    <td><strong>${t.id_turno || '-'}</strong></td>
                    <td>${t.nombre_empleado || t.id_empleado}</td>
                    <td>${fechaEntrada}</td>
                    <td>${fechaSalida}</td>
                    <td>$${Number(t.fondo_caja_inicial || 0).toFixed(2)}</td>
                    <td>$${Number(t.ventas_efectivo_sistema || 0).toFixed(2)}</td>
                    <td>${t.efectivo_cierre_real !== null ? '$' + Number(t.efectivo_cierre_real).toFixed(2) : '-'}</td>
                    <td style="color: ${(t.diferencia || 0) < 0 ? '#c62828' : '#2e7d32'}; font-weight: bold;">
                        ${t.diferencia !== null ? '$' + Number(t.diferencia).toFixed(2) : '-'}
                    </td>
                    <td><span class="badge ${estatusClass}">${t.estatus}</span></td>
                </tr>
            `;
        }).join('');
    }

    // MENSAJES Y TIEMPO DE VISTA DEL MISMO
    function mostrarMensaje(elementoDiv, texto, tipo) {
        if (!elementoDiv) return;

        clearTimeout(temporizadorAlerta);
        elementoDiv.classList.add('hidden');

        setTimeout(() => {
            elementoDiv.textContent = texto;
            elementoDiv.className = `alert alert-${tipo}`;
            elementoDiv.classList.remove('hidden');

            temporizadorAlerta = setTimeout(() => {
                elementoDiv.classList.add('hidden');
            }, 3500);
        }, 100);
    }
});