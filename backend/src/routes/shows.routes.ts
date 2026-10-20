
import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";

const router = Router();

// GET /api/shows
// Public: List shows, optionally filtered by movieId or theaterId
router.get("/", async (req: Request, res: Response) => {
  try {
    const { movieId, theaterId, date } = req.query;

    const where: {
      movieId?: number;
      theaterId?: number;
      showDate?: {
        gte?: Date;
        lt?: Date;
      };
    } = {};

    if (movieId !== undefined) {
      const id = Number(movieId);

      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid movieId.",
        });
        return;
      }

      where.movieId = id;
    }

    if (theaterId !== undefined) {
      const id = Number(theaterId);

      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid theaterId.",
        });
        return;
      }

      where.theaterId = id;
    }

    if (date !== undefined) {
      if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
      ) {
        res.status(400).json({
          success: false,
          message: "Date must use YYYY-MM-DD format.",
        });
        return;
      }

      const start = new Date(`${date}T00:00:00.000Z`);

      if (
        Number.isNaN(start.getTime()) ||
        start.toISOString().slice(0, 10) !== date
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid calendar date.",
        });
        return;
      }

      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      where.showDate = {
        gte: start,
        lt: end,
      };
    }

    const shows = await prisma.show.findMany({
      where,
      include: {
        movie: true,
        theater: true,
      },
      orderBy: [{ showDate: "asc" }, { showTime: "asc" }],
    });

    res.status(200).json({
      success: true,
      count: shows.length,
      data: shows,
    });
  } catch (error) {
    console.error("Error fetching shows:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shows.",
    });
  }
});

// GET /api/shows/:id
// Public: Get show details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const showId = Number(req.params.id);

    if (!Number.isInteger(showId) || showId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid show ID.",
      });
      return;
    }

    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        movie: true,
        theater: true,
        seats: {
          orderBy: { seatNumber: "asc" },
        },
      },
    });

    if (!show) {
      res.status(404).json({
        success: false,
        message: "Show not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: show,
    });
  } catch (error) {
    console.error("Error fetching show:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch show.",
    });
  }
});

// POST /api/shows
// Admin only: Create a show
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        movieId,
        theaterId,
        showDate,
        showTime,
        ticketPrice,
        totalSeats = 100,
      } = req.body;

      if (
        !Number.isInteger(movieId) ||
        movieId <= 0 ||
        !Number.isInteger(theaterId) ||
        theaterId <= 0
      ) {
        res.status(400).json({
          success: false,
          message: "Valid movieId and theaterId are required.",
        });
        return;
      }

      if (
        typeof showDate !== "string" ||
        Number.isNaN(Date.parse(showDate))
      ) {
        res.status(400).json({
          success: false,
          message: "A valid showDate is required.",
        });
        return;
      }

      if (
        typeof showTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(showTime)
      ) {
        res.status(400).json({
          success: false,
          message: "showTime must use 24-hour HH:mm format.",
        });
        return;
      }

      if (
        typeof ticketPrice !== "number" ||
        !Number.isFinite(ticketPrice) ||
        ticketPrice <= 0
      ) {
        res.status(400).json({
          success: false,
          message: "ticketPrice must be a positive number.",
        });
        return;
      }

      if (
        !Number.isInteger(totalSeats) ||
        totalSeats <= 0
      ) {
        res.status(400).json({
          success: false,
          message: "totalSeats must be a positive integer.",
        });
        return;
      }

      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { id: true },
      });

      if (!movie) {
        res.status(404).json({
          success: false,
          message: "Movie not found.",
        });
        return;
      }

      const theater = await prisma.theater.findUnique({
        where: { id: theaterId },
        select: { id: true },
      });

      if (!theater) {
        res.status(404).json({
          success: false,
          message: "Theater not found.",
        });
        return;
      }

      const show = await prisma.show.create({
        data: {
          movieId,
          theaterId,
          showDate: new Date(showDate),
          showTime,
          ticketPrice,
          totalSeats,
          availableSeats: totalSeats,
        },
        include: {
          movie: true,
          theater: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Show created successfully.",
        data: show,
      });
    } catch (error) {
      console.error("Error creating show:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create show.",
      });
    }
  }
);

// PUT /api/shows/:id
// Admin only: Update a show
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const showId = Number(req.params.id);

      if (!Number.isInteger(showId) || showId <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid show ID.",
        });
        return;
      }

      const {
        movieId,
        theaterId,
        showDate,
        showTime,
        ticketPrice,
        totalSeats,
      } = req.body;

      const data: {
        movieId?: number;
        theaterId?: number;
        showDate?: Date;
        showTime?: string;
        ticketPrice?: number;
        totalSeats?: number;
      } = {};

      if (movieId !== undefined) {
        if (!Number.isInteger(movieId) || movieId <= 0) {
          res.status(400).json({
            success: false,
            message: "Invalid movieId.",
          });
          return;
        }

        const movie = await prisma.movie.findUnique({
          where: { id: movieId },
          select: { id: true },
        });

        if (!movie) {
          res.status(404).json({
            success: false,
            message: "Movie not found.",
          });
          return;
        }

        data.movieId = movieId;
      }

      if (theaterId !== undefined) {
        if (!Number.isInteger(theaterId) || theaterId <= 0) {
          res.status(400).json({
            success: false,
            message: "Invalid theaterId.",
          });
          return;
        }

        const theater = await prisma.theater.findUnique({
          where: { id: theaterId },
          select: { id: true },
        });

        if (!theater) {
          res.status(404).json({
            success: false,
            message: "Theater not found.",
          });
          return;
        }

        data.theaterId = theaterId;
      }

      if (showDate !== undefined) {
        if (
          typeof showDate !== "string" ||
          Number.isNaN(Date.parse(showDate))
        ) {
          res.status(400).json({
            success: false,
            message: "Invalid showDate.",
          });
          return;
        }

        data.showDate = new Date(showDate);
      }

      if (showTime !== undefined) {
        if (
          typeof showTime !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(showTime)
        ) {
          res.status(400).json({
            success: false,
            message: "showTime must use HH:mm format.",
          });
          return;
        }

        data.showTime = showTime;
      }

      if (ticketPrice !== undefined) {
        if (
          typeof ticketPrice !== "number" ||
          !Number.isFinite(ticketPrice) ||
          ticketPrice <= 0
        ) {
          res.status(400).json({
            success: false,
            message: "ticketPrice must be a positive number.",
          });
          return;
        }

        data.ticketPrice = ticketPrice;
      }

      if (totalSeats !== undefined) {
        if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
          res.status(400).json({
            success: false,
            message: "totalSeats must be a positive integer.",
          });
          return;
        }

        data.totalSeats = totalSeats;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          success: false,
          message: "Provide at least one field to update.",
        });
        return;
      }

      const existingShow = await prisma.show.findUnique({
        where: { id: showId },
      });

      if (!existingShow) {
        res.status(404).json({
          success: false,
          message: "Show not found.",
        });
        return;
      }

      if (
        data.totalSeats !== undefined &&
        data.totalSeats < existingShow.totalSeats
      ) {
        res.status(400).json({
          success: false,
          message: "totalSeats cannot be reduced. Existing seats may be booked.",
        });
        return;
      }

      const updatedShow = await prisma.show.update({
        where: { id: showId },
        data: {
          ...data,
          ...(data.totalSeats !== undefined
            ? {
                availableSeats: {
                  increment: data.totalSeats - existingShow.totalSeats,
                },
              }
            : {}),
        },
        include: {
          movie: true,
          theater: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Show updated successfully.",
        data: updatedShow,
      });
    } catch (error) {
      console.error("Error updating show:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update show.",
      });
    }
  }
);

// DELETE /api/shows/:id
// Admin only: Delete a show
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const showId = Number(req.params.id);

      if (!Number.isInteger(showId) || showId <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid show ID.",
        });
        return;
      }

      const show = await prisma.show.findUnique({
        where: { id: showId },
      });

      if (!show) {
        res.status(404).json({
          success: false,
          message: "Show not found.",
        });
        return;
      }

      if (show.availableSeats < show.totalSeats) {
        res.status(409).json({
          success: false,
          message: "Cannot delete a show with existing bookings.",
        });
        return;
      }

      await prisma.show.delete({
        where: { id: showId },
      });

      res.status(200).json({
        success: true,
        message: "Show deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting show:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete show.",
      });
    }
  }
);

export default router;
