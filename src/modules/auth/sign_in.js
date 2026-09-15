document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registroForm");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const mensajeError = document.getElementById("mensajeError");
    const mensajeExito = document.getElementById("mensajeExito");

    const limpiarMensajes = () => {
        mensajeError.textContent = "";
        mensajeError.style.display = "none";
        mensajeExito.textContent = "";
        mensajeExito.style.display = "none";
    };

    form.addEventListener("submit", (e) => {
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

        const datosRegistro = {
            email: email.value.trim(),
            password: password.value
        };

        console.log("Datos listos para enviar:", datosRegistro);

        // Notificación de éxito y redirección a log_in.html
        mensajeExito.textContent = "¡Cuenta creada con éxito! Redirigiendo...";
        mensajeExito.style.display = "block";

        setTimeout(() => {
            window.location.href = "log_in.html";
        }, 1200);
    });
});