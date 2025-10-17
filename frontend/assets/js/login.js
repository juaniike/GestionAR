// login.js - VERSIÓN CORREGIDA

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // Deshabilitar el botón mientras se procesa el login
  loginButton.disabled = true;
  loginButton.innerText = "Ingresando...";

  try {
    const res = await fetch("http://localhost:3000/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // para cookies
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Error al iniciar sesión");

    console.log("Login exitoso:", data);

    // ✅ CORREGIDO: Guardar usuario CON token
    const userWithToken = {
      ...data.user, // Datos del usuario (id, username, etc.)
      token: data.token, // ← ESTE ES EL TOKEN QUE FALTABA
    };

    console.log("Usuario con token:", userWithToken);

    // Guardar en sessionStorage
    sessionStorage.setItem("user", JSON.stringify(userWithToken));

    // Redirigir al dashboard
    window.location.href = "./dashboard.html";
  } catch (err) {
    alert(err.message || "Usuario o contraseña incorrectos");
    console.error(err);
  } finally {
    // Restaurar botón
    loginButton.disabled = false;
    loginButton.innerText = "Iniciar sesión";
  }
});
