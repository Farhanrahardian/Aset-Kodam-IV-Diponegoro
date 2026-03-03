// reset-passwords.js
require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "asset_management",
});

const users = [
  { id: 1, password: "admin123" },
  { id: 2, password: "pengguna123" },
  { id: 3, password: "rudi1234" },
  { id: 4, password: "yazna155455" },
];

(async () => {
  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
    console.log(`✅ User id ${user.id} password updated`);
  }
  console.log("Selesai!");
  process.exit(0);
})();