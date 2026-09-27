document.addEventListener('DOMContentLoaded', () => {
    // 1. OBTENER LOS ELEMENTOS DEL FORMULARIO
    const form = document.getElementById('recoverForm');
    const emailInput = document.getElementById('email');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const btnRecover = document.getElementById('btnRecover');
    const mensajeError = document.getElementById('mensajeError');
    
    // 2. OBTENER LOS ELEMENTOS DEL MODAL DE CONFIRMACIÓN
    const modalConfirmacion = document.getElementById('modalConfirmacion');
    const btnAceptarModal = document.getElementById('btnAceptarModal');

    function limpiarMensajes() {
        if (mensajeError) mensajeError.textContent = '';
    }

    // 3. EVENTO CUANDO LE DAN CLIC AL BOTÓN DE RESTABLECER
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        limpiarMensajes();

        const email = emailInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validaciones básicas
        if (!email || !newPassword || !confirmPassword) {
            mensajeError.textContent = 'Por favor, llena todos los campos.';
            return;
        }

        if (newPassword !== confirmPassword) {
            mensajeError.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        if (newPassword.length < 3) {
            mensajeError.textContent = 'La contraseña debe tener al menos 3 caracteres.';
            return;
        }

        btnRecover.disabled = true;
        btnRecover.textContent = 'PROCESANDO...';

        try {
            // Envío al servidor
            const respuesta = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    correo: email,
                    nuevaPassword: newPassword
                })
            });

            const data = await respuesta.json();

            if (respuesta.ok) {
                // AQUÍ SE MUESTRA EL MODAL DE CONFIRMACIÓN:
                if (modalConfirmacion) {
                    modalConfirmacion.style.display = 'flex';
                }
                form.reset();
            } else {
                mensajeError.textContent = data.message || 'Error al actualizar la contraseña.';
            }
        } catch (error) {
            console.error('Error:', error);
            mensajeError.textContent = 'No se pudo conectar con el servidor. Intenta de nuevo.';
        } finally {
            btnRecover.disabled = false;
            btnRecover.textContent = 'RESTABLECER CONTRASEÑA';
        }
    });

    // 4. AQUÍ SE CONFIGURA EL BOTÓN DEL MODAL PARA IR AL LOGIN
    if (btnAceptarModal) {
        btnAceptarModal.addEventListener('click', () => {
            window.location.href = 'log_in.html';
        });
    }
});