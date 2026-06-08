
const jwt = require("jsonwebtoken");

const generateAccessToken = (data) => {
    return jwt.sign(
        {
            id: data.id,                     // ✅ FIXED
            role: data.role,
            companyId: data.companyId || null
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
    );
};

const generateRefreshToken = (data) => {
    return jwt.sign(
        { id: data.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};

module.exports = { generateAccessToken, generateRefreshToken };