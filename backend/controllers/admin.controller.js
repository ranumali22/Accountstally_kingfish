const db = require("../config/db");

exports.adminLogin = async (req, res) => {
    try {
        const { login_id, password } = req.body;

        // Validation
        if (!login_id?.trim()) {
            return res.status(400).json({
                success: false,
                field: "login_id",
                message: "Login ID is required.",
            });
        }

        if (!password?.trim()) {
            return res.status(400).json({
                success: false,
                field: "password",
                message: "Password is required.",
            });
        }

        const sql = `
      SELECT 
        id,
        login_id,
        password,
        created_at,
        updated_at
      FROM admin
      WHERE login_id = ?
      LIMIT 1
    `;

        const [result] = await db.query(sql, [login_id.trim()]);

        // Login ID not found
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                field: "login_id",
                message: "Login ID does not exist.",
            });
        }

        const admin = result[0];

        // Password check
        if (admin.password !== password) {
            return res.status(401).json({
                success: false,
                field: "password",
                message: "Incorrect password.",
            });
        }

        // Remove password from response
        delete admin.password;

        return res.status(200).json({
            success: true,
            message: "Admin login successful.",
            data: admin,
        });
    } catch (error) {
        console.error("Admin Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while processing login request.",
            error: error.message,
        });
    }
};