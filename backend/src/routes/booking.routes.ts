
import { Router } from "express";
import prisma from "../lib/prisma";
import {
  authenticateToken,
  AuthRequest,
} from "../middleware/auth.middleware";

const prismaClient = prisma as any;
const router = Router();

// GET /api/bookings/my
// Get bookings belonging only to the logged-in user.
router.get(
  "/my",
  authenticateToken,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const bookings = await prismaClient.booking.findMany({
        where: {
          userId,
        },
        orderBy: {
          id: "desc",
        },
        include: {
          seats: true,
          show: {
            include: {
              movie: true,
              theater: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Your bookings retrieved successfully.",
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      console.error("Error fetching user bookings:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve your bookings.",
      });
    }
  }
);

// POST /api/bookings
// Create a booking for a logged-in user.
router.post(
  "/",
  authenticateToken,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { showId, seatNumbers } = req.body;

      if (
        !userId ||
        !Number.isInteger(showId) ||
        showId <= 0 ||
        !Array.isArray(seatNumbers) ||
        seatNumbers.length === 0 ||
        !seatNumbers.every(
          (seat: unknown) =>
            typeof seat === "string" && seat.trim().length > 0
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Provide a valid showId and a non-empty array of seatNumbers.",
        });
        return;
      }

      const normalizedSeats = seatNumbers.map(
        (seat: string) => seat.trim()
      );
      const uniqueSeats = new Set(normalizedSeats);

      if (uniqueSeats.size !== normalizedSeats.length) {
        res.status(400).json({
          success: false,
          message: "Duplicate seat numbers are not allowed.",
        });
        return;
      }

      const booking = await prisma.$transaction(async (tx) => {
        const seatModel = (tx as any).seat;
        const bookingModel = (tx as any).booking;

        const show = await tx.show.findUnique({
          where: { id: showId },
        });

        if (!show) {
          throw new Error("SHOW_NOT_FOUND");
        }

        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        // Create missing seat records as available.
        for (const seatNumber of normalizedSeats) {
          await seatModel.upsert({
            where: {
              showId_seatNumber: {
                showId,
                seatNumber,
              },
            },
            create: {
              showId,
              seatNumber,
              status: "AVAILABLE",
            },
            update: {},
          });
        }

        const seats = await seatModel.findMany({
          where: {
            showId,
            seatNumber: { in: normalizedSeats },
          },
        });

        if (seats.length !== normalizedSeats.length) {
          throw new Error("SEAT_LOOKUP_FAILED");
        }

        if (
          seats.some(
            (seat: { status: string }) => seat.status !== "AVAILABLE"
          )
        ) {
          throw new Error("SEAT_UNAVAILABLE");
        }

        const totalPrice =
          show.ticketPrice * normalizedSeats.length;

        const newBooking = await bookingModel.create({
          data: {
            userId,
            showId,
            totalPrice,
            status: "CONFIRMED",
          },
        });

        // Update only seats that are still available.
        for (const seatNumber of normalizedSeats) {
          const updated = await seatModel.updateMany({
            where: {
              showId,
              seatNumber,
              status: "AVAILABLE",
            },
            data: {
              status: "BOOKED",
              bookingId: newBooking.id,
            },
          });

          if (updated.count !== 1) {
            throw new Error("SEAT_UNAVAILABLE");
          }
        }

        const updatedShow = await tx.show.updateMany({
          where: {
            id: showId,
            availableSeats: {
              gte: normalizedSeats.length,
            },
          },
          data: {
            availableSeats: {
              decrement: normalizedSeats.length,
            },
          },
        });

        if (updatedShow.count !== 1) {
          throw new Error("NOT_ENOUGH_SEATS");
        }

        return bookingModel.findUniqueOrThrow({
          where: { id: newBooking.id },
          include: {
            seats: true,
            show: {
              include: {
                movie: true,
                theater: true,
              },
            },
          },
        });
      });

      res.status(201).json({
        success: true,
        message: "Booking created successfully.",
        data: booking,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "SHOW_NOT_FOUND") {
          res.status(404).json({
            success: false,
            message: "Show not found.",
          });
          return;
        }

        if (error.message === "USER_NOT_FOUND") {
          res.status(401).json({
            success: false,
            message: "User account not found.",
          });
          return;
        }

        if (error.message === "SEAT_UNAVAILABLE") {
          res.status(409).json({
            success: false,
            message: "One or more selected seats are already booked.",
          });
          return;
        }

        if (error.message === "NOT_ENOUGH_SEATS") {
          res.status(409).json({
            success: false,
            message: "Not enough available seats for this booking.",
          });
          return;
        }
      }

      console.error("Error creating booking:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create booking.",
      });
    }
  }
);

/*
POST /api/bookings/:bookingId/cancel

Cancel a confirmed booking owned by the logged-in user.
*/
router.post(
  "/:bookingId/cancel",
  authenticateToken,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const bookingId = Number(req.params.bookingId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        res.status(400).json({
          success: false,
          message: "A valid booking ID is required.",
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const txClient = tx as any;
        const bookingModel = txClient.booking;
        const booking = await bookingModel.findFirst({
          where: {
            id: bookingId,
            userId,
          },
          include: {
            seats: true,
          },
        });

        if (!booking) {
          throw new Error("BOOKING_NOT_FOUND");
        }

        if (booking.status !== "CONFIRMED") {
          throw new Error("BOOKING_NOT_CONFIRMED");
        }

        // Only one request can cancel this confirmed booking.
        const cancelled = await txClient.booking.updateMany({
          where: {
            id: bookingId,
            userId,
            status: "CONFIRMED",
          },
          data: {
            status: "CANCELLED",
          },
        });

        if (cancelled.count !== 1) {
          throw new Error("BOOKING_NOT_CONFIRMED");
        }

        // Release only seats assigned to this booking.
        const releasedSeats = await txClient.seat.updateMany({
          where: {
            bookingId,
            status: "BOOKED",
          },
          data: {
            status: "AVAILABLE",
            bookingId: null,
          },
        });

        // Restore the number of seats actually released.
        if (releasedSeats.count > 0) {
          await txClient.show.update({
            where: {
              id: booking.showId,
            },
            data: {
              availableSeats: {
                increment: releasedSeats.count,
              },
            },
          });
        }

        return txClient.booking.findUniqueOrThrow({
          where: {
            id: bookingId,
          },
          include: {
            seats: true,
            show: {
              include: {
                movie: true,
                theater: true,
              },
            },
          },
        });
      });

      res.status(200).json({
        success: true,
        message: "Booking cancelled successfully.",
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "BOOKING_NOT_FOUND") {
          res.status(404).json({
            success: false,
            message: "Booking not found.",
          });
          return;
        }

        if (error.message === "BOOKING_NOT_CONFIRMED") {
          res.status(409).json({
            success: false,
            message: "This booking is already cancelled or cannot be cancelled.",
          });
          return;
        }
      }

      console.error("Error cancelling booking:", error);

      res.status(500).json({
        success: false,
        message: "Failed to cancel booking.",
      });
    }
  }
);


export default router;
