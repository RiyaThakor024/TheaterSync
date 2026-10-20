-- CreateTable
CREATE TABLE "Show" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "theaterId" INTEGER NOT NULL,
    "showDate" TIMESTAMP(3) NOT NULL,
    "showTime" TEXT NOT NULL,
    "ticketPrice" DOUBLE PRECISION NOT NULL,
    "totalSeats" INTEGER NOT NULL DEFAULT 100,
    "availableSeats" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_theaterId_fkey" FOREIGN KEY ("theaterId") REFERENCES "Theater"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
