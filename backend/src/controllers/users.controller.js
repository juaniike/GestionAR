const usersServices = require("../services/users.service");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS, 10) || 3;
const BLOCK_TIME = parseInt(process.env.BLOCK_TIME, 10) || 24 * 60 * 60 * 1000;

//-------------------REGISTER-------------------
const register = async (req, res, next) => {
  let { username, password, role } = req.body;

  username = String(username).trim();
  password = String(password).trim();

  const requiredFields = [
    { field: username, name: "Username" },
    { field: password, name: "Password" },
  ];

  for (const item of requiredFields) {
    if (
      !item.field ||
      (typeof item.field === "string" && item.field.trim() === "")
    ) {
      return next({ error: 400, message: `${item.name} is required` });
    }
  }

  const allowedRoles = ["owner", "employee"];
  const userRole = role || "employee";

  if (!allowedRoles.includes(userRole)) {
    return next({
      error: 400,
      message: `Role must be one of: ${allowedRoles.join(", ")}`,
    });
  }

  try {
    if (userRole === "owner") {
      const existingOwner = await usersServices.getByRole("owner");
      if (existingOwner) {
        return next({ error: 400, message: "Owner already exists" });
      }
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await usersServices.create({
      username,
      password: hashedPassword,
      role: userRole,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return next({ error: 400, message: "Username already exists" });
    }
    next({ error: 500, message: err.message });
  }
};

//-------------------LOGIN-------------------
const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const user = await usersServices.getByUsername(username);
    if (!user) return next({ error: 401, message: "Invalid Credentials" });

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + BLOCK_TIME);
        user.loginAttempts = 0;
        await user.save();
        return next({
          error: 429,
          message: "Too many attempts. User blocked for 24 hours",
        });
      }
      await user.save();
      return next({ error: 401, message: "Invalid Credentials" });
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      signed: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      message: `Successful Login, ${user.username}!`,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token: token,
    });
  } catch (err) {
    next({ error: 500, message: err.message });
  }
};

//-------------------LOGOUT-------------------
const logout = (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      signed: true,
    });
    res.status(200).json({ message: "Successful Logout" });
  } catch (err) {
    next({ error: 500, message: err.message });
  }
};

module.exports = {
  register,
  login,
  logout,
};
