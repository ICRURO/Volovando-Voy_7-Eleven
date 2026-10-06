/**
 * @file sign_in.js
 * @description Lógica del lado del cliente para el registro de nuevos usuarios/clientes.
 * Controla la validación del formulario de registro y la comunicación con la API.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los elementos del DOM
    const form = document.getElementById("registroForm");
    const nombre = document.getElementById("nombre");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const btnRegistrar = document.getElementById("btnRegistrar");
    const mensajeError = document.getElementById("mensajeError");
    const mensajeExito = document.getElementById("mensajeExito");

    /**
     * @function limpiarMensajes
     * @description Oculta y limpia los mensajes de éxito y error en la interfaz.
     * @returns {void}
     */
    const limpiarMensajes = () => {
        mensajeError.textContent = "";
        mensajeError.style.display = "none";
        mensajeExito.textContent = "";
        mensajeExito.style.display = "none";
    };

    /**
     * @event submit
     * @description Maneja el evento de envío del formulario de registro.
     * Valida las contraseñas y realiza la petición POST para registrar al usuario.
     */
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        limpiarMensajes();

        // 1. Validar coincidencia de contraseñas
        if (password.value !== confirmPassword.value) {
            mensajeError.textContent = "Las contraseñas no coinciden.";
            mensajeError.style.display = "block";
            return;
        }

        // 2. Validar longitud mínima
        if (password.value.length < 8) {
            mensajeError.textContent = "La contraseña debe tener al menos 8 caracteres.";
            mensajeError.style.display = "block";
            return;
        }

        // Deshabilitar botón durante la carga
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = "REGISTRANDO...";

        try {
            /**
             * Petición a la API para registrar el nuevo usuario.
             * @type {Response}
             */
            const respuesta = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: nombre ? nombre.value.trim() : 'Cliente Nuevo',
                    correo: email.value.trim(),
                    password: password.value
                })
            });

            const data = await respuesta.json();

            if (respuesta.ok) {
                mensajeExito.textContent = "¡Cuenta creada con éxito! Redirigiendo...";
                mensajeExito.style.display = "block";
                form.reset();

                // Redirigir al login después de 1.5 segundos
                setTimeout(() => {
                    window.location.href = "log_in.html";
                }, 1500);
            } else {
                mensajeError.textContent = data.message || "Error al registrar la cuenta.";
                mensajeError.style.display = "block";
            }
        } catch (error) {
            console.error("Error al registrar:", error);
            mensajeError.textContent = "No se pudo conectar con el servidor.";
            mensajeError.style.display = "block";
        } finally {
            // Restaurar estado del botón
            btnRegistrar.disabled = false;
            btnRegistrar.textContent = "REGISTRARME Y COMENZAR";
        }
    });
});