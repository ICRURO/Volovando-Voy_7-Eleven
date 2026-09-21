document.addEventListener('DOMContentLoaded', async () => {
    const btnAbrir = document.getElementById('btn-abrir');
    const btnCerrar = document.getElementById('btn-cerrar');
    const divMensaje = document.getElementById('mensaje-operacion');
    const labelEmpleado = document.getElementById('label-empleado');

    let id_empleado_activo = null;
    let temporizadorAlerta;

    // Consultar directo al servidor la información del turno y usuario activo
    await obtenerEstadoBD();

    async function obtenerEstadoBD() {
        try {
            const res = await fetch('/api/turnos/estado-actual');
            if (res.ok) {
                const data = await res.json();
                id_empleado_activo = data.usuario.id_empleado;

                if (labelEmpleado) {
                    labelEmpleado.textContent = `${data.usuario.nombre} (${data.usuario.id_empleado})`;
                }

                // Habilita o deshabilita botones según lo que hay en database.json
                actualizarBotones(data.tieneTurnoAbierto);
            } else {
                mostrarMensaje('No hay una sesión activa en el servidor.', 'error');
            }
        } catch (error) {
            mostrarMensaje('Error de conexión al consultar la base de datos.', 'error');
        }
    }

    function actualizarBotones(tieneTurnoAbierto) {
        if (tieneTurnoAbierto) {
            btnAbrir.disabled = true;
            btnAbrir.style.opacity = "0.5";
            btnAbrir.style.cursor = "not-allowed";

            btnCerrar.disabled = false;
            btnCerrar.style.opacity = "1";
            btnCerrar.style.cursor = "pointer";
        } else {
            btnAbrir.disabled = false;
            btnAbrir.style.opacity = "1";
            btnAbrir.style.cursor = "pointer";

            btnCerrar.disabled = true;
            btnCerrar.style.opacity = "0.5";
            btnCerrar.style.cursor = "not-allowed";
        }
    }

    if (btnAbrir) {
        btnAbrir.addEventListener('click', async () => {
            const fondo_caja_inicial = document.getElementById('monto_caja')?.value;

            if (fondo_caja_inicial === '' || fondo_caja_inicial === undefined) {
                mostrarMensaje('Por favor ingresa el fondo inicial de caja.', 'error');
                return;
            }

            try {
                const res = await fetch('/api/turnos/abrir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_empleado: id_empleado_activo, fondo_caja_inicial })
                });

                const data = await res.json();

                if (!res.ok) {
                    mostrarMensaje(data.message || data.error || 'Error al abrir turno', 'error');
                } else {
                    mostrarMensaje(`¡Turno abierto con éxito! ID Turno: ${data.turno ? data.turno.id_turno : ''}`, 'exito');
                    limpiarFormulario();
                    actualizarBotones(true);
                }
            } catch (error) {
                mostrarMensaje('Error de conexión con el servidor.', 'error');
            }
        });
    }

    if (btnCerrar) {
        btnCerrar.addEventListener('click', async () => {
            const efectivo_cierre_real = document.getElementById('monto_caja')?.value;

            if (efectivo_cierre_real === '' || efectivo_cierre_real === undefined) {
                mostrarMensaje('Por favor ingresa el conteo de efectivo al cierre.', 'error');
                return;
            }

            try {
                const res = await fetch('/api/turnos/cerrar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_empleado: id_empleado_activo, efectivo_cierre_real })
                });

                const data = await res.json();

                if (!res.ok) {
                    mostrarMensaje(data.message || data.error || 'Error al cerrar turno', 'error');
                } else {
                    mostrarMensaje('Turno cerrado correctamente. Que tengas buen día.', 'exito');
                    limpiarFormulario();
                    actualizarBotones(false);
                }
            } catch (error) {
                mostrarMensaje('Error de conexión con el servidor.', 'error');
            }
        });
    }

    function mostrarMensaje(texto, tipo) {
        if (!divMensaje) return;

        clearTimeout(temporizadorAlerta);
        divMensaje.classList.add('hidden');

        setTimeout(() => {
            divMensaje.textContent = texto;
            divMensaje.className = `alert alert-${tipo}`;
            divMensaje.classList.remove('hidden');

            temporizadorAlerta = setTimeout(() => {
                divMensaje.classList.add('hidden');
            }, 3500);
        }, 100);
    }

    function limpiarFormulario() {
        const inputMonto = document.getElementById('monto_caja');
        if (inputMonto) inputMonto.value = '';
    }
});