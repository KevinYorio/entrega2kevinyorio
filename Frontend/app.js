// app.js (reemplaza todo el contenido actual por este)

(function () {
  // Toggle menú responsive (si lo usás)
  // Esta función global alterna la clase del menú para mostrarlo/ocultarlo en pantallas pequeñas
  let menuVisible = false;
  window.mostrarOcultarMenu = function () {
    const nav = document.getElementById("nav");
    if (!nav) return;
    if (menuVisible) {
      nav.classList = "";           // Restauramos clases (menú oculto)
      menuVisible = false;
    } else {
      nav.classList = "responsive"; // Activamos el modo responsive (menú visible)
      menuVisible = true;
    }
  };

  // Utils de validación
  // Valida estructura básica de email usando regex estándar
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Valida contraseña: requiere al menos una mayúscula, una minúscula y un número
  function isValidPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    return passwordRegex.test(password);
  }

  // DEMO: abstracción de “auth” localStorage (hasta tener backend)
  // Clave donde guardamos los datos del usuario demo
  const LS_KEY = "userDataDemo";

  // Guarda email, nombre y contraseña en localStorage (solo para probar frontend)
  function saveUserLocal(email, nombre, contrasena) {
    const user = { email, nombre, contrasena };
    localStorage.setItem(LS_KEY, JSON.stringify(user));
  }

  // Recupera el usuario guardado (si existe)
  function getUserLocal() {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // ====== REGISTRO ======
    // Si estamos en crearcuenta.html, entonces activamos la lógica de registro demo
    const isCrear = path.includes("crearcuenta.html");
    if (isCrear) {
      const btnCrear = document.getElementById("btn-crear-cuenta");
      const email = document.getElementById("email");
      const nombre = document.getElementById("nombre");
      const contrasena = document.getElementById("contrasena");

      if (btnCrear && email && nombre && contrasena) {
        btnCrear.addEventListener("click", (e) => {
          e.preventDefault();

          // Validaciones básicas
          if (!isValidEmail(email.value)) return alert("Email inválido");
          if (!nombre.value.trim()) return alert("El nombre es obligatorio");
          if (!isValidPassword(contrasena.value)) {
            return alert("La contraseña debe tener mayúscula, minúscula y número");
          }

          // TODO: reemplazar por POST /api/auth/register
          // Guardamos temporalmente el usuario en localStorage para simular registro
          saveUserLocal(email.value, nombre.value, contrasena.value);

          // Redirige al login luego de registrarse
          window.location.href = "login.html";
        });
      }
    }

    // ====== LOGIN ======
    // Si estamos en login.html, activamos la lógica de autenticación demo
    const isLogin = path.includes("login.html");
    if (isLogin) {
      const btnLogin = document.getElementById("btn-login");
      const email = document.getElementById("email");
      const contrasena = document.getElementById("contrasena");

      if (btnLogin && email && contrasena) {
        btnLogin.addEventListener("click", async (e) => {
          e.preventDefault();

          // TODO: reemplazar por POST /api/auth/login y gestionar token
          // Obtenemos datos guardados en localStorage como “usuario registrado”
          const user = getUserLocal();
          if (!user) return alert("No hay usuario registrado. Creá tu cuenta primero.");

          // Compara credenciales ingresadas con las guardadas localmente
          if (email.value === user.email && contrasena.value === user.contrasena) {
            // redirige según tu flujo actual:
            window.location.href = "onboarding.html";
          } else {
            alert("Credenciales incorrectas");
          }
        });
      }
    }

    // ====== AUTORELLENO DEMO (si estás en crear o login) ======
    // Si existe usuario guardado, rellenamos los campos email y contraseña automáticamente
    const user = getUserLocal();
    if (user) {
      const email = document.getElementById("email");
      const contrasena = document.getElementById("contrasena");
      if (email) email.value = user.email || "";
      if (contrasena) contrasena.value = user.contrasena || "";
    }
  });
})();
