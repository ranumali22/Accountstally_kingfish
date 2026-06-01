const jwt = require("jsonwebtoken");

exports.companyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1️⃣ Header check
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing",
    });
  }

  // 2️⃣ Token extract
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token missing",
    });
  }

  try {
    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Attach company info
    req.company = decoded;
    req.company_id = decoded.company_id; // 👈 IMPORTANT LINE
    // 5️⃣ Allow request
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
