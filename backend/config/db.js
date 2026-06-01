const dotenv = require("dotenv");
dotenv.config();
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  timezone: "+05:30", // 🔥 CRITICAL FIX
  dateStrings: true, // 🔥 MOST IMPORTANT FIX
});

db.checkDbConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log(
      `✅ MySQL connectedD → ${process.env.DB_HOST}:${process.env.DB_PORT}`,
    );
    connection.release();
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = db;
