/**
 * @file log_in.js
 * @description Lógica del lado del cliente para el inicio de sesión.
 * Captura las credenciales del usuario, las valida y se comunica con el servidor.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los elementos del DOM
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const mensajeError = document.getElementById("mensajeError");
    const mensajeExito = document.getElementById("mensajeExito");

    /**
     * @function limpiarMensajes
     * @description Oculta y limpia los textos de los contenedores de error y éxito de forma segura.
     * @returns {void}
     */
    const limpiarMensajes = () => {
        if (mensajeError) {
            mensajeError.textContent = "";
            mensajeError.style.display = "none";
        }
        if (mensajeExito) {
            mensajeExito.textContent = "";
            mensajeExito.style.display = "none";
        }
    };

    // Envío del formulario
    if (form) {
        /**
         * @event submit
         * @description Controla el envío del formulario de inicio de sesión.
         * Extrae los valores, los envía al backend y redirige al dashboard si es exitoso.
         */
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            limpiarMensajes();

            const correoTexto = emailInput ? emailInput.value.trim() : "";
            const passTexto = passwordInput ? passwordInput.value.trim() : "";

            // Validación de campos vacíos
            if (!correoTexto || !passTexto) {
                mensajeError.textContent = "Por favor ingresa tu correo y contraseña.";
                mensajeError.style.display = "block";
                return;
            }

            try {
                /**
                 * Petición real al servidor enviando el correo y contraseña.
                 * @type {Response}
                 */
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        correo: correoTexto,
                        email: correoTexto,
                        password: passTexto
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    mensajeError.textContent = data.message || "Error al iniciar sesión.";
                    mensajeError.style.display = "block";
                    return;
                }

                // La sesión queda viva únicamente en la memoria del servidor
                mensajeExito.textContent = "Iniciando sesión... ¡Bienvenido!";
                mensajeExito.style.display = "block";

                // Redirección al panel principal tras el login exitoso
                setTimeout(() => {
                    window.location.href = "../dashboard.html";
                }, 1000);

            } catch (error) {
                console.error("Error en login:", error);
                mensajeError.textContent = "Error de conexión con el servidor.";
                mensajeError.style.display = "block";
            }
        });
    }
});