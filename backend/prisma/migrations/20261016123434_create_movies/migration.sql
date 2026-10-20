-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('NOW_SHOWING', 'UPCOMING');

-- CreateTable
CREATE TABLE "Movie" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION,
    "posterUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "status" "MovieStatus" NOT NULL DEFAULT 'NOW_SHOWING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_title_key" ON "Movie"("title");
