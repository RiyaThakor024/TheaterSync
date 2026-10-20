
import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";

const router = Router();

// GET /api/movies
// Public: Get all movies with optional filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, genre, language, status } = req.query;

    const movies = await prisma.movie.findMany({
      where: {
        ...(typeof search === "string" && search.trim()
          ? {
              title: {
                contains: search.trim(),
                mode: "insensitive",
              },
            }
          : {}),
        ...(typeof genre === "string" && genre.trim()
          ? {
              genre: {
                equals: genre.trim(),
                mode: "insensitive",
              },
            }
          : {}),
        ...(typeof language === "string" && language.trim()
          ? {
              language: {
                equals: language.trim(),
                mode: "insensitive",
              },
            }
          : {}),
        ...(status === "NOW_SHOWING" || status === "UPCOMING"
          ? { status }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch movies.",
    });
  }
});

// GET /api/movies/:id
// Public: Get one movie
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const movieId = Number(req.params.id);

    if (!Number.isInteger(movieId) || movieId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid movie ID.",
      });
      return;
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        shows: {
          include: {
            theater: true,
          },
          orderBy: {
            showDate: "asc",
          },
        },
      },
    });

    if (!movie) {
      res.status(404).json({
        success: false,
        message: "Movie not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    console.error("Error fetching movie:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch movie.",
    });
  }
});

// POST /api/movies
// Admin only: Create a movie
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        genre,
        language,
        durationMinutes,
        rating,
        posterUrl,
        releaseDate,
        status,
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !description.trim() ||
        typeof genre !== "string" ||
        !genre.trim() ||
        typeof language !== "string" ||
        !language.trim() ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Provide title, description, genre, language, and a positive integer durationMinutes.",
        });
        return;
      }

      if (
        rating !== undefined &&
        rating !== null &&
        (typeof rating !== "number" ||
          !Number.isFinite(rating) ||
          rating < 0 ||
          rating > 10)
      ) {
        res.status(400).json({
          success: false,
          message: "Rating must be a number between 0 and 10.",
        });
        return;
      }

      if (
        status !== undefined &&
        status !== "NOW_SHOWING" &&
        status !== "UPCOMING"
      ) {
        res.status(400).json({
          success: false,
          message: "Status must be NOW_SHOWING or UPCOMING.",
        });
        return;
      }

      let parsedReleaseDate: Date | null = null;

      if (releaseDate !== undefined && releaseDate !== null) {
        if (
          typeof releaseDate !== "string" ||
          Number.isNaN(Date.parse(releaseDate))
        ) {
          res.status(400).json({
            success: false,
            message: "Provide a valid releaseDate.",
          });
          return;
        }

        parsedReleaseDate = new Date(releaseDate);
      }

      if (
        posterUrl !== undefined &&
        posterUrl !== null &&
        typeof posterUrl !== "string"
      ) {
        res.status(400).json({
          success: false,
          message: "posterUrl must be a string or null.",
        });
        return;
      }

      const movie = await prisma.movie.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          genre: genre.trim(),
          language: language.trim(),
          durationMinutes,
          rating: rating ?? null,
          posterUrl: posterUrl?.trim() || null,
          releaseDate: parsedReleaseDate,
          status: status ?? "NOW_SHOWING",
        },
      });

      res.status(201).json({
        success: true,
        message: "Movie created successfully.",
        data: movie,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          success: false,
          message: "A movie with this title already exists.",
        });
        return;
      }

      console.error("Error creating movie:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create movie.",
      });
    }
  }
);

// PUT /api/movies/:id
// Admin only: Update a movie
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const movieId = Number(req.params.id);

      if (!Number.isInteger(movieId) || movieId <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid movie ID.",
        });
        return;
      }

      const {
        title,
        description,
        genre,
        language,
        durationMinutes,
        rating,
        posterUrl,
        releaseDate,
        status,
      } = req.body;

      const data: {
        title?: string;
        description?: string;
        genre?: string;
        language?: string;
        durationMinutes?: number;
        rating?: number | null;
        posterUrl?: string | null;
        releaseDate?: Date | null;
        status?: "NOW_SHOWING" | "UPCOMING";
      } = {};

      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          res.status(400).json({
            success: false,
            message: "Title must be a non-empty string.",
          });
          return;
        }
        data.title = title.trim();
      }

      if (description !== undefined) {
        if (typeof description !== "string" || !description.trim()) {
          res.status(400).json({
            success: false,
            message: "Description must be a non-empty string.",
          });
          return;
        }
        data.description = description.trim();
      }

      if (genre !== undefined) {
        if (typeof genre !== "string" || !genre.trim()) {
          res.status(400).json({
            success: false,
            message: "Genre must be a non-empty string.",
          });
          return;
        }
        data.genre = genre.trim();
      }

      if (language !== undefined) {
        if (typeof language !== "string" || !language.trim()) {
          res.status(400).json({
            success: false,
            message: "Language must be a non-empty string.",
          });
          return;
        }
        data.language = language.trim();
      }

      if (durationMinutes !== undefined) {
        if (
          !Number.isInteger(durationMinutes) ||
          durationMinutes <= 0
        ) {
          res.status(400).json({
            success: false,
            message: "durationMinutes must be a positive integer.",
          });
          return;
        }
        data.durationMinutes = durationMinutes;
      }

      if (rating !== undefined) {
        if (
          rating !== null &&
          (typeof rating !== "number" ||
            !Number.isFinite(rating) ||
            rating < 0 ||
            rating > 10)
        ) {
          res.status(400).json({
            success: false,
            message: "Rating must be between 0 and 10, or null.",
          });
          return;
        }
        data.rating = rating;
      }

      if (posterUrl !== undefined) {
        if (
          posterUrl !== null &&
          typeof posterUrl !== "string"
        ) {
          res.status(400).json({
            success: false,
            message: "posterUrl must be a string or null.",
          });
          return;
        }
        data.posterUrl =
          typeof posterUrl === "string"
            ? posterUrl.trim() || null
            : null;
      }

      if (releaseDate !== undefined) {
        if (releaseDate === null) {
          data.releaseDate = null;
        } else if (
          typeof releaseDate === "string" &&
          !Number.isNaN(Date.parse(releaseDate))
        ) {
          data.releaseDate = new Date(releaseDate);
        } else {
          res.status(400).json({
            success: false,
            message: "Provide a valid releaseDate or null.",
          });
          return;
        }
      }

      if (status !== undefined) {
        if (
          status !== "NOW_SHOWING" &&
          status !== "UPCOMING"
        ) {
          res.status(400).json({
            success: false,
            message: "Status must be NOW_SHOWING or UPCOMING.",
          });
          return;
        }
        data.status = status;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          success: false,
          message: "Provide at least one field to update.",
        });
        return;
      }

      const existingMovie = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { id: true },
      });

      if (!existingMovie) {
        res.status(404).json({
          success: false,
          message: "Movie not found.",
        });
        return;
      }

      const updatedMovie = await prisma.movie.update({
        where: { id: movieId },
        data,
      });

      res.status(200).json({
        success: true,
        message: "Movie updated successfully.",
        data: updatedMovie,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          success: false,
          message: "A movie with this title already exists.",
        });
        return;
      }

      console.error("Error updating movie:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update movie.",
      });
    }
  }
);

// DELETE /api/movies/:id
// Admin only: Delete a movie
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const movieId = Number(req.params.id);

      if (!Number.isInteger(movieId) || movieId <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid movie ID.",
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

      await prisma.movie.delete({
        where: { id: movieId },
      });

      res.status(200).json({
        success: true,
        message: "Movie deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting movie:", error);
      res.status(500).json({
        success: false,
        message:
          "Failed to delete movie. It may have associated shows or bookings.",
      });
    }
  }
);

export default router;
