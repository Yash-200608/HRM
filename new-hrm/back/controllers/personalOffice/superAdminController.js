const {SuperAdmin} = require("../../models/personalOffice/superadminModel");
const bcrypt = require("bcrypt");
const { generateAccessToken, generateRefreshToken } = require("../../service/service.js")


const registerSuperAdmin = async (req, res) => {
  try {
    console.log("========= REGISTER SUPER ADMIN =========");
    console.log("BODY:", req.body);

    const { username, email, password, mobile, address } = req.body;

    // VALIDATION
    if (!username || !email || !password) {
      console.log("VALIDATION FAILED");

      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    // CHECK EXISTING
    const superAdmin = await SuperAdmin.findOne({ email });

    console.log("EXISTING SUPER ADMIN:", superAdmin);

    if (superAdmin && superAdmin?.role === "super_admin") {
      return res.status(403).json({
        message: "This email already exists.",
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("PASSWORD HASHED");

    // CREATE USER
    const newSuperAdmin = await SuperAdmin.create({
      username,
      email,
      password: hashedPassword,
      role: "super_admin",
      mobile,
      address,
    });

    console.log("SUPER ADMIN CREATED:", newSuperAdmin);

    return res.status(201).json({
      message: "Super Admin registered successfully",
      user: {
        id: newSuperAdmin._id,
        username: newSuperAdmin.username,
        email: newSuperAdmin.email,
        role: newSuperAdmin.role,
      },
    });

  } catch (err) {
    console.log("========= REGISTER ERROR =========");
    console.log(err);

    return res.status(500).json({
      message: err.message,
    });
  }
};




const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
 

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let user = null;
 

    // 1️⃣ Try Admin login
    user = await SuperAdmin.findOne({ email }).select("+password");


    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // 3️⃣ Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 4️⃣ Generate Access + Refresh Token
    const payload = {
      id: user._id,
      role : user?.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: user._id });

    // 🔥 Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // 🔥 Send refresh token in httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // production me true
      sameSite: "strict",
    });

    // 5️⃣ Response formatting
    const userData = user.toObject();
    delete userData.password;


    return res.status(200).json({
      message: "Login successful",
      accessToken, // 🔥 now access token
      user: {
        ...userData,
        role:user?.role,
        fullName: userData.username,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};



module.exports = {registerSuperAdmin, loginSuperAdmin};
