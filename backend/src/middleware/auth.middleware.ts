
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email?: string;
    role: "ADMIN" | "CUSTOMER";
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Access token is required.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Access token is missing.",
    });
    return;
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not configured.");
    }

    const decoded = jwt.verify(token, secret) as {
      userId: number;
      email?: string;
      tokenType?: string;
    };

    if (
      decoded.tokenType !== "access" ||
      typeof decoded.userId !== "number"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid access token.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found.",
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "JWT_ACCESS_SECRET is not configured."
    ) {
      console.error(error.message);
      res.status(500).json({
        success: false,
        message: "Authentication configuration error.",
      });
      return;
    }

    console.error("Authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
}
