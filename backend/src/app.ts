
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import movieRoutes from "./routes/movies.routes";
import theaterRoutes from "./routes/theaters.routes";
import showRoutes from "./routes/shows.routes";
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/booking.routes";

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log("\n========== INCOMING REQUEST ==========");
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("Time:", new Date().toISOString());

  res.on("finish", () => {
    console.log("Status:", res.statusCode);
    console.log("======================================\n");
  });

  next();
});

// General middleware
app.use(cors());
app.use(express.json());

// IMPORTANT: Parse cookies BEFORE registering routes
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "TheaterSync backend is running",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theaters", theaterRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
export default app;
