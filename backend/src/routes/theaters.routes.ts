
import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// POST - Create a theater (authentication required)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, city, address } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof city !== "string" ||
      !city.trim() ||
      typeof address !== "string" ||
      !address.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Name, city, and address are required",
      });
      return;
    }

    const theater = await prisma.theater.create({
      data: {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Theater created successfully",
      data: theater,
    });
  } catch (error) {
    console.error("Error creating theater:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create theater",
    });
  }
});

// GET all theaters (public)
router.get("/", async (_req, res) => {
  try {
    const theaters = await prisma.theater.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      count: theaters.length,
      data: theaters,
    });
  } catch (error) {
    console.error("Error fetching theaters:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch theaters",
    });
  }
});

// GET one theater by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid theater ID",
      });
      return;
    }

    const theater = await prisma.theater.findUnique({
      where: { id },
    });

    if (!theater) {
      res.status(404).json({
        success: false,
        message: "Theater not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: theater,
    });
  } catch (error) {
    console.error("Error fetching theater:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch theater",
    });
  }
});

// PUT - Update a theater (authentication required)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid theater ID",
      });
      return;
    }

    const { name, city, address } = req.body;

    if (
      (name !== undefined &&
        (typeof name !== "string" || !name.trim())) ||
      (city !== undefined &&
        (typeof city !== "string" || !city.trim())) ||
      (address !== undefined &&
        (typeof address !== "string" || !address.trim()))
    ) {
      res.status(400).json({
        success: false,
        message: "Provided fields must be non-empty strings",
      });
      return;
    }

    const existingTheater = await prisma.theater.findUnique({
      where: { id },
    });

    if (!existingTheater) {
      res.status(404).json({
        success: false,
        message: "Theater not found",
      });
      return;
    }

    const theater = await prisma.theater.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(city !== undefined && { city: city.trim() }),
        ...(address !== undefined && { address: address.trim() }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Theater updated successfully",
      data: theater,
    });
  } catch (error) {
    console.error("Error updating theater:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update theater",
    });
  }
});

// DELETE - Remove a theater (authentication required)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid theater ID",
      });
      return;
    }

    const theater = await prisma.theater.findUnique({
      where: { id },
    });

    if (!theater) {
      res.status(404).json({
        success: false,
        message: "Theater not found",
      });
      return;
    }

    await prisma.theater.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Theater deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting theater:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete theater",
    });
  }
});

export default router;
