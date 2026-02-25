const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// IMPORTANT: Use your database name
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",      // XAMPP default
  database: "pbl_db", // Your DB name
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed ");
  } else {
    console.log("Connected to MySQL (pbl_db) ");
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running ");
});

// Register route
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";

  db.query(sql, [email, password], (err) => {
    if (err) {
      res.send("Register failed  (Email may already exist)");
    } else {
      res.send("Registered successfully ");
    }
  });
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      res.send("Server error ");
    } else if (results.length > 0) {
      res.send("Login successful ");
    } else {
      res.send("Invalid credentials ");
    }
  });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000 ");
});


