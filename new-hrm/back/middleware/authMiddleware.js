const jwt = require("jsonwebtoken");
const { Admin } = require("../models/personalOffice/authModel");
const { Employee } = require("../models/personalOffice/employeeModel");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
  token,
  process.env.ACCESS_TOKEN_SECRET
);

const admin = await Admin.findById(decoded.id);


const employee = await Employee.findById(decoded.id);

    let user = null;

    // 🔥 STEP 1: Try Admin
    user = await Admin.findById(decoded.id).populate("companyId", "name logo");

    // 🔥 STEP 2: If not admin → try employee
    if (!user) {
      user = await Employee.findById(decoded.id)
        .populate("createdBy", "name logo")
        .populate("assignedRole");
    }

    if (!user) {
      console.log("❌ USER NOT FOUND:", decoded.id);
      return res.status(401).json({ message: "User not found" });
    }

   // ======================================
// GLOBAL COMPANY RESOLUTION
// ======================================
let companyId = null;

// ADMIN
if (user.role === "admin") {

  companyId =
    user.companyId?._id ||
    user.companyId ||
    user._id;
}

// EMPLOYEE / HR / MANAGER
else {

  companyId =
    user.companyId?._id ||
    user.createdBy?._id ||
    user.companyId ||
    user.createdBy ||
    decoded.companyId ||
    null;
}

req.user = {
  ...user.toObject(),
  id: user._id.toString(),
  role: user.role,
  companyId: companyId.toString(),
};


    next();

  } catch (error) {
    console.log("❌ AUTH ERROR:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token expired" });
    }

    return res.status(403).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;