document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
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

        // Validación básica
        if (!email.value.trim() || !password.value.trim()) {
            mensajeError.textContent = "Por favor ingresa tu correo y contraseña.";
            mensajeError.style.display = "block";
            return;
        }

        const credenciales = {
            email: email.value.trim(),
            password: password.value
        };

        console.log("Intentando iniciar sesión con:", credenciales);

        // Feedback visual
        mensajeExito.textContent = "Iniciando sesión... ¡Bienvenido!";
        mensajeExito.style.display = "block";

        // REDIRECCIÓN AL DASHBOARD PRINCIPAL
        // Se suben dos niveles (../../) para salir de 'auth' y 'modules', llegando a 'src/dashboard.html'
        setTimeout(() => {
            window.location.href = "../../dashboard.html";
        }, 1000);
    });
});