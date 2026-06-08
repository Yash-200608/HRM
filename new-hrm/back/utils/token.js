const jwt = require("jsonwebtoken");

// JWT secret (load from env or default)
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET; 

/**
 * Generate JWT token for a user/admin
 * @param {Object} payload - Data to include in token (e.g., id, email, role)
 * @param {String|Number} expiresIn - Token expiry, e.g., "1d", "2h"
 * @returns {String} JWT token
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id.toString(),  // 🔥 IMPORTANT
            role: user.role,
            companyId: user.companyId || null
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};

module.exports = { generateToken };
