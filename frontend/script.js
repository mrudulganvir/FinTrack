console.log("Script loaded");

const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const msg = document.getElementById("msg");
const bioBtn = document.getElementById("bioBtn");

function setMsg(text, type="") {
  msg.className = "msg " + type;
  msg.textContent = text;
}

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  setMsg("");
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  setMsg("");
});

if (bioBtn) {
  bioBtn.addEventListener("click", () => {
    setMsg("Biometric authentication triggered (UI simulation).", "ok");
  });
}

const API = "https://fintrack-backend.onrender.com";

// FIX 1: Login now has try/catch for network errors
// FIX 2: Login errors are now shown to the user via setMsg instead of only console.error
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPass").value;

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        console.log("Redirecting...");
        window.location.href = "prototype.html";
      } else {
        // FIX 2: Show the error to the user instead of silently logging it
        setMsg(data.detail || "Invalid email or password.", "bad");
      }
    } catch (err) {
      // FIX 1: Catch network failures and show a message
      setMsg("Backend not reachable. Please try again.", "bad");
    }
  });
}

// REGISTER -> backend
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("Registering...");

    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPass").value;

    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        setMsg("Account created successfully!", "ok");
      } else {
        setMsg(data.detail || "Registration failed", "bad");
      }

    } catch (err) {
      setMsg("Backend not reachable", "bad");
    }
  });
}