
let menuVisible = false;
//Función que oculta o muestra el menu
function mostrarOcultarMenu(){
    if(menuVisible){
        document.getElementById("nav").classList ="";
        menuVisible = false;
    }else{
        document.getElementById("nav").classList ="responsive";
        menuVisible = true;
    }
}
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
            const email = document.getElementById("email").value;
            const nombre = document.getElementById("nombre").value;
            const contrasena = document.getElementById("contrasena").value;

            // Validar el formato del correo electrónico
            if (!isValidEmail(email)) {
                alert("Ingrese un correo electrónico válido.");
                return;
            }

            // Validar que se haya proporcionado un nombre
            if (!nombre) {
                alert("El campo 'Nombre' es obligatorio.");
                return;
            }
            // Validar la contraseña
            if (!isValidPassword(contrasena)) {
                alert("La contraseña debe contener al menos una mayúscula, una minúscula y un número.");
                return;
            }

            console.log("Email:", email);
            console.log("Nombre:", nombre);
            console.log("Contraseña:", contrasena);

            const userData = {
                email: email,
                nombre: nombre,
                contrasena: contrasena
            };

            const userDataJSON = JSON.stringify(userData);

            // Guardar los datos en localStorage
            localStorage.setItem("userData", userDataJSON);

            // Redirigir a otra página (reemplaza "otrapagina.html" con la URL deseada)
            window.location.href = "login.html";
        });
    }
    document.addEventListener("DOMContentLoaded", function () {
        const username = document.getElementById('email');
        const password = document.getElementById('contrasena');
        const button = document.getElementById('button');
    
        button.addEventListener('click', function (e) {
            e.preventDefault();
    
            // Recupera los datos del usuario almacenados en localStorage
            const userDataJSON = localStorage.getItem("userData");
    
            if (userDataJSON) {
                const userData = JSON.parse(userDataJSON);
                const storedEmail = userData.email;
                const storedContrasena = userData.contrasena;
    
                // Obtén los valores ingresados por el usuario en el formulario de inicio de sesión
                const enteredEmail = username.value;
                const enteredContrasena = password.value;
    
                // Verifica si los datos ingresados coinciden con los almacenados
                if (enteredEmail === storedEmail && enteredContrasena === storedContrasena) {
                    // Los datos coinciden, redirige al usuario a la página de su cuenta
                    window.location.href = "alumnos.html"; // Reemplaza con la URL correcta
                } else {
                    alert("Credenciales incorrectas. Por favor, inténtalo de nuevo.");
                }
            } else {
                alert("No se encontraron datos de usuario. Por favor, crea una cuenta primero.");
            }
        });
    });
    
    
    // Recuperar datos del almacenamiento local y llenar los campos si están disponibles
    const userDataJSON = localStorage.getItem("userData");
    if (userDataJSON) {
        const userData = JSON.parse(userDataJSON);
        document.getElementById("email").value = userData.email;
        document.getElementById("contrasena").value = userData.contrasena;
    }
});

// Función para validar el formato del correo electrónico
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para validar la contraseña (debe contener al menos una mayúscula, una minúscula y un número)
function isValidPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    return passwordRegex.test(password);
}

// Verificar si los datos se han guardado en localStorage
const userDataJSON = localStorage.getItem("userData");

if (userDataJSON !== null) {
    console.log("Los datos se han guardado en el almacenamiento local.");

    const userData = JSON.parse(userDataJSON);
    console.log("Datos guardados:", userData);
} else {
    console.log("Los datos no se han guardado en el almacenamiento local.");
}


const username = document.getElementById('email')
const password = document.getElementById('password')
const button = document.getElementById('button')

button.addEventListener('click', (e) => {
    e.preventDefault()
    const data = {
        username: username.value,
        contrasena: contrasena.value
    }

    console.log(data)
})

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
            const email = document.getElementById("email").value;
            const nombre = document.getElementById("nombre").value;
            const contrasena = document.getElementById("contrasena").value;

            // Validar el formato del correo electrónico
            if (!isValidEmail(email)) {
                alert("Ingrese un correo electrónico válido.");
                return;
            }

            // Validar la contraseña
            if (!isValidPassword(contrasena)) {
                alert("La contraseña debe contener al menos una mayúscula, una minúscula y un número.");
                return;
            }

            console.log("Email:", email);
            console.log("Nombre:", nombre);
            console.log("Contraseña:", contrasena);

            const userData = {
                email: email,
                nombre: nombre,
                contrasena: contrasena
            };

            const userDataJSON = JSON.stringify(userData);

            // Guardar los datos en localStorage
            localStorage.setItem("userData", userDataJSON);

            // Redirigir a otra página (reemplaza "otrapagina.html" con la URL deseada)
            window.location.href = "login.html";
        });
    }

    const username = document.getElementById('email');
    const password = document.getElementById('contrasena');
    const button = document.getElementById('button');

    button.addEventListener('click', function (e) {
        e.preventDefault();

        // Recupera los datos del usuario almacenados en localStorage
        const userDataJSON = localStorage.getItem("userData");

        if (userDataJSON) {
            const userData = JSON.parse(userDataJSON);
            const storedEmail = userData.email;
            const storedContrasena = userData.contrasena;

            // Obtén los valores ingresados por el usuario en el formulario de inicio de sesión
            const enteredEmail = username.value;
            const enteredContrasena = password.value;

            // Verifica si los datos ingresados coinciden con los almacenados
            if (enteredEmail === storedEmail && enteredContrasena === storedContrasena) {
                // Los datos coinciden, redirige al usuario a la página deseada
                window.location.href = "carrodecompras.html"; // Reemplaza con la URL correcta
            } else {
                alert("Credenciales incorrectas. Por favor, inténtalo de nuevo.");
            }
        } else {
            alert("No se encontraron datos de usuario. Por favor, crea una cuenta primero.");
        }
    });

    // Recuperar datos del almacenamiento local y llenar los campos si están disponibles
    const userDataJSON = localStorage.getItem("userData");
    if (userDataJSON) {
        const userData = JSON.parse(userDataJSON);
        document.getElementById("email").value = userData.email;
        document.getElementById("contrasena").value = userData.contrasena;
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const username = document.getElementById('email');
    const password = document.getElementById('contrasena');
    const button = document.getElementById('button');

    button.addEventListener('click', function (e) {
        e.preventDefault();

        // ... Tu código de validación de inicio de sesión ...

        // Verifica si los datos ingresados coinciden con los almacenados
        if (enteredEmail === storedEmail && enteredContrasena === storedContrasena) {
            mostrarToast(); // Muestra el toast de inicio de sesión exitoso
            // Redirige al usuario a la página deseada
            window.location.href = "carrodecompras.html"; // Reemplaza con la URL correcta
        } else {
            alert("Credenciales incorrectas. Por favor, inténtalo de nuevo.");
        }
    });
});

