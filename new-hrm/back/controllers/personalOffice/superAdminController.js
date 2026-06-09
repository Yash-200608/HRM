const { SuperAdmin } = require("../../models/personalOffice/superadminModel");
const bcrypt = require("bcrypt");
const { generateAccessToken, generateRefreshToken } = require("../../service/service.js");
const { buildAccessTokenInput } = require("../../service/tokenClaimsService.js");
const { shouldRequireMfa, buildMfaLoginChallenge } = require("../../service/mfaService.js");

const registerSuperAdmin = async (req, res) => {
  try {
    const { username, email, password, mobile, address } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    const superAdmin = await SuperAdmin.findOne({ email });

    if (superAdmin && superAdmin?.role === "super_admin") {
      return res.status(403).json({
        message: "This email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newSuperAdmin = await SuperAdmin.create({
      username,
      email,
      password: hashedPassword,
      role: "super_admin",
      mobile,
      address,
    });

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

    const user = await SuperAdmin.findOne({ email }).select("+password +mfaSecret");

    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (shouldRequireMfa(user)) {
      const challenge = await buildMfaLoginChallenge(user);
      return res.status(200).json({
        message: "MFA verification required",
        ...challenge,
      });
    }

    const accessToken = generateAccessToken(
      await buildAccessTokenInput(user, { accountType: "super_admin" })
    );
    const refreshToken = generateRefreshToken({ id: user._id });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    const userData = user.toObject();
    delete userData.password;

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        ...userData,
        role: user?.role,
        fullName: userData.username,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerSuperAdmin, loginSuperAdmin };