document.addEventListener("DOMContentLoaded", function () {
    let enviarBtn;

    // Verifica la URL de la página actual y selecciona el botón correspondiente
    if (window.location.pathname.includes("contacto.html")) {
        enviarBtn = document.getElementById("enviarContacto");
    } else if (window.location.pathname.includes("crearcuenta.html")) {
        enviarBtn = document.getElementById("enviarCrearCuenta");
    }

    // Agrega el evento de clic solo si se encontró el botón
    if (enviarBtn) {
        enviarBtn.addEventListener("click", function () {
            const email = encodeURIComponent(document.getElementById("email").value);
            const nombre = encodeURIComponent(document.getElementById("nombre").value);
            const mensaje = encodeURIComponent(document.getElementById("mensaje").value);
    
            console.log("Email:", email);
            console.log("Nombre:", nombre);
            console.log("Mensaje:", mensaje);

            const userData = {
                email: email,
                nombre: nombre,
                mensaje: mensaje
            };

            const userDataJSON = JSON.stringify(userData);

            // Guardar los datos en localStorage
            localStorage.setItem("userData", userDataJSON);

            const url = `https://api.whatsapp.com/send?phone=5491166739161&text=Email: ${email}%0A%0ANombre: ${nombre}%0A%0AMensaje: ${mensaje}`;
            window.open(url, '_blank');
        });
    }

    // Recuperar datos del almacenamiento local y llenar los campos si están disponibles
    const userDataJSON = localStorage.getItem("userData");
    if (userDataJSON) {
        const userData = JSON.parse(userDataJSON);
        document.getElementById("email").value = userData.email;
        document.getElementById("nombre").value = userData.nombre;
        document.getElementById("mensaje").value = userData.mensaje;
    }
});

// Verificar si los datos se han guardado en localStorage
const userDataJSON = localStorage.getItem("userData");

if (userDataJSON !== null) {
    console.log("Los datos se han guardado en el almacenamiento local.");

    const userData = JSON.parse(userDataJSON);
    console.log("Datos guardados:", userData);
} else {
    console.log("Los datos no se han guardado en el almacenamiento local.");
}
