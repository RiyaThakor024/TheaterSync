
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";

import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthRequest,
} from "../middleware/auth.middleware";

const router = Router();

// REGISTER
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      res.status(400).json({
        success: false,
        message:
          "Name and email are required. Password must be at least 8 characters.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: { user },
    });
  } catch (error) {
    console.error("[AUTH][REGISTER] Error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
});

// LOGIN
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      res.status(500).json({
        success: false,
        message: "JWT secrets are not configured.",
      });
      return;
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tokenType: "access",
      },
      accessSecret,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        tokenType: "refresh",
      },
      refreshSecret,
      { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error("[AUTH][LOGIN] Error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
});

// REFRESH ACCESS TOKEN
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessSecret = process.env.JWT_ACCESS_SECRET;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token cookie is missing. Please log in again.",
      });
      return;
    }

    if (!refreshSecret || !accessSecret) {
      res.status(500).json({
        success: false,
        message: "JWT secrets are not configured.",
      });
      return;
    }

    const decoded = jwt.verify(
      refreshToken,
      refreshSecret
    ) as JwtPayload;

    if (
      decoded.tokenType !== "refresh" ||
      typeof decoded.userId !== "number"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User no longer exists. Please log in again.",
      });
      return;
    }

    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tokenType: "access",
      },
      accessSecret,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error("[AUTH][REFRESH] Error:", error);

    res.status(401).json({
      success: false,
      message:
        "Refresh token is invalid or expired. Please log in again.",
    });
  }
});

// LOGOUT
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  });

  res.status(200).json({
    success: true,
    message: "Logout successful.",
  });
});

// PROFILE
router.get(
  "/profile",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;

      if (!authReq.user?.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: authReq.user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Profile fetched successfully.",
        data: { user },
      });
    } catch (error) {
      console.error("[AUTH][PROFILE] Error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch profile.",
      });
    }
  }
);

export default router;
