document.addEventListener("DOMContentLoaded", function () {
    // Obtener referencia a los elementos del formulario con los nuevos IDs
    const emailInput = document.getElementById("contacto-email");
    const nombreInput = document.getElementById("contacto-nombre");
    const mensajeInput = document.getElementById("contacto-mensaje");
    const enviarBtn = document.getElementById("contacto-enviar");

    // Agregar un evento de clic al nuevo botón de enviar
    enviarBtn.addEventListener("click", function () {
        // Obtener los valores de los nuevos campos de entrada
        const email = emailInput.value;
        const nombre = nombreInput.value;
        const mensaje = mensajeInput.value;

        // Validar que los campos no estén vacíos
        if (!email || !nombre || !mensaje) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        // Validar el formato del correo electrónico
        if (!isValidEmail(email)) {
            alert("Ingrese un correo electrónico válido.");
            return;
        }

        // Crear un objeto con los datos del formulario
        const contactoData = {
            email: email,
            nombre: nombre,
            mensaje: mensaje
        };

        // Convertir el objeto a JSON
        const contactoDataJSON = JSON.stringify(contactoData);

        // Guardar los datos en el almacenamiento local (localStorage)
        localStorage.setItem("contactoData", contactoDataJSON);

        // Redirigir a la página de WhatsApp con los datos del formulario
        const urlWhatsApp = `https://api.whatsapp.com/send?phone=5491166739161&text=Email:%20${email}%0D%0ANombre:%20${nombre}%0D%0AMensaje:%20${mensaje}`;
        window.open(urlWhatsApp, "_blank");
    });

    // Función para validar el formato del correo electrónico
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});
