
import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";

const router = Router();

// GET /api/theaters
// Public: Get all theaters
router.get("/", async (_req, res) => {
  try {
    const theaters = await prisma.theater.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      count: theaters.length,
      data: theaters,
    });
  } catch (error) {
    console.error("Get theaters error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch theaters.",
    });
  }
});

// GET /api/theaters/:id
// Public: Get a single theater
router.get("/:id", async (req, res) => {
  try {
    const theaterId = Number(req.params.id);

    if (!Number.isInteger(theaterId) || theaterId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater ID.",
      });
    }

    const theater = await prisma.theater.findUnique({
      where: {
        id: theaterId,
      },
    });

    if (!theater) {
      return res.status(404).json({
        success: false,
        message: "Theater not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: theater,
    });
  } catch (error) {
    console.error("Get theater error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch theater.",
    });
  }
});

// POST /api/theaters
// Admin only: Create a theater
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, location, address } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      (address !== undefined && typeof address !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid name, location, and optional address are required.",
      });
    }

    const theater = await prisma.theater.create({
      data: {
        name: name.trim(),
        city: location.trim(),
        address: address !== undefined ? address.trim() : location.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Theater created successfully.",
      data: theater,
    });
  } catch (error) {
    console.error("Create theater error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create theater.",
    });
  }
});

// PUT /api/theaters/:id
// Admin only: Update a theater
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const theaterId = Number(req.params.id);
    const { name, location, address } = req.body;

    if (!Number.isInteger(theaterId) || theaterId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater ID.",
      });
    }

    if (
      name === undefined &&
      location === undefined &&
      address === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    if (
      (name !== undefined &&
        (typeof name !== "string" || !name.trim())) ||
      (location !== undefined &&
        (typeof location !== "string" || !location.trim())) ||
      (address !== undefined && typeof address !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater update data.",
      });
    }

    const existingTheater = await prisma.theater.findUnique({
      where: {
        id: theaterId,
      },
    });

    if (!existingTheater) {
      return res.status(404).json({
        success: false,
        message: "Theater not found.",
      });
    }

    const updatedTheater = await prisma.theater.update({
      where: {
        id: theaterId,
      },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(address !== undefined
          ? { address: address.trim() }
          : location !== undefined
            ? { address: location.trim() }
            : {}),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Theater updated successfully.",
      data: updatedTheater,
    });
  } catch (error) {
    console.error("Update theater error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update theater.",
    });
  }
});

// DELETE /api/theaters/:id
// Admin only: Delete a theater
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const theaterId = Number(req.params.id);

    if (!Number.isInteger(theaterId) || theaterId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater ID.",
      });
    }

    const existingTheater = await prisma.theater.findUnique({
      where: {
        id: theaterId,
      },
      include: {
        shows: true,
      },
    });

    if (!existingTheater) {
      return res.status(404).json({
        success: false,
        message: "Theater not found.",
      });
    }

    // Do not delete a theater that has shows associated with it.
    if (existingTheater.shows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete this theater because it has associated shows. Remove or reassign those shows first.",
      });
    }

    await prisma.theater.delete({
      where: {
        id: theaterId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Theater deleted successfully.",
    });
  } catch (error) {
    console.error("Delete theater error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete theater.",
    });
  }
});

export default router;