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

bioBtn.addEventListener("click", () => {
  setMsg("Biometric authentication triggered (UI simulation).", "ok");
});

const API = "http://localhost:5000";

// LOGIN -> backend
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("Logging in...", "");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPass").value;

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const text = await res.text();
    setMsg(text, text.toLowerCase().includes("successful") ? "ok" : "bad");
  } catch (err) {
    setMsg("Backend not reachable  (is server.js running?)", "bad");
  }
});

// REGISTER -> backend
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("Registering...", "");

  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPass").value;

  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const text = await res.text();
    setMsg(text, text.toLowerCase().includes("registered") ? "ok" : "bad");
  } catch (err) {
    setMsg("Backend not reachable (is server.js running?)", "bad");
  }
});

