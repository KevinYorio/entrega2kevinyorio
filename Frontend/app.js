// app.js (reemplaza todo el contenido actual por este)

(function () {
  // Toggle menú responsive (si lo usás)
  let menuVisible = false;
  window.mostrarOcultarMenu = function () {
    const nav = document.getElementById("nav");
    if (!nav) return;
    if (menuVisible) {
      nav.classList = "";
      menuVisible = false;
    } else {
      nav.classList = "responsive";
      menuVisible = true;
    }
  };

  // Utils de validación
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  function isValidPassword(password) {
    // al menos una mayúscula, una minúscula y un número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    return passwordRegex.test(password);
  }

  // DEMO: abstracción de “auth” localStorage (hasta tener backend)
  const LS_KEY = "userDataDemo";
  function saveUserLocal(email, nombre, contrasena) {
    const user = { email, nombre, contrasena };
    localStorage.setItem(LS_KEY, JSON.stringify(user));
  }
  function getUserLocal() {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // ====== REGISTRO ======
    const isCrear = path.includes("crearcuenta.html");
    if (isCrear) {
      const btnCrear = document.getElementById("btn-crear-cuenta");
      const email = document.getElementById("email");
      const nombre = document.getElementById("nombre");
      const contrasena = document.getElementById("contrasena");

      if (btnCrear && email && nombre && contrasena) {
        btnCrear.addEventListener("click", (e) => {
          e.preventDefault();
          if (!isValidEmail(email.value)) return alert("Email inválido");
          if (!nombre.value.trim()) return alert("El nombre es obligatorio");
          if (!isValidPassword(contrasena.value)) {
            return alert("La contraseña debe tener mayúscula, minúscula y número");
          }

          // TODO: reemplazar por POST /api/auth/register
          saveUserLocal(email.value, nombre.value, contrasena.value);
          window.location.href = "login.html";
        });
      }
    }

    // ====== LOGIN ======
    const isLogin = path.includes("login.html");
    if (isLogin) {
      const btnLogin = document.getElementById("btn-login");
      const email = document.getElementById("email");
      const contrasena = document.getElementById("contrasena");

      if (btnLogin && email && contrasena) {
        btnLogin.addEventListener("click", async (e) => {
          e.preventDefault();

          // TODO: reemplazar por POST /api/auth/login y gestionar token
          const user = getUserLocal();
          if (!user) return alert("No hay usuario registrado. Creá tu cuenta primero.");
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
    const user = getUserLocal();
    if (user) {
      const email = document.getElementById("email");
      const contrasena = document.getElementById("contrasena");
      if (email) email.value = user.email || "";
      if (contrasena) contrasena.value = user.contrasena || "";
    }
  });
})();
