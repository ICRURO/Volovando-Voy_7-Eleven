document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const mensajeError = document.getElementById("mensajeError");
    const mensajeExito = document.getElementById("mensajeExito");

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
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            limpiarMensajes();

            const correoTexto = emailInput ? emailInput.value.trim() : "";
            const passTexto = passwordInput ? passwordInput.value.trim() : "";

            if (!correoTexto || !passTexto) {
                mensajeError.textContent = "Por favor ingresa tu correo y contraseña.";
                mensajeError.style.display = "block";
                return;
            }

            try {
                // Petición real al servidor enviando el correo
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

                setTimeout(() => {
                    window.location.href = "../../dashboard.html";
                }, 1000);

            } catch (error) {
                console.error("Error en login:", error);
                mensajeError.textContent = "Error de conexión con el servidor.";
                mensajeError.style.display = "block";
            }
        });
    }
});