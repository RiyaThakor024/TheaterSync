
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  if (req.user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
    return;
  }

  next();
};
