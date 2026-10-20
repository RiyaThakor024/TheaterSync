import "dotenv/config";
import prisma from "./lib/prisma";

const movies = [
  {
    title: "Inception",
    description: "A thief enters people's dreams to steal information.",
    genre: "Sci-Fi",
    language: "English",
    durationMinutes: 148,
    rating: 8.8,
    posterUrl: "https://placehold.co/300x450?text=Inception",
    status: "NOW_SHOWING" as const,
  },
  {
    title: "Interstellar",
    description: "Explorers travel through space to find a future for humanity.",
    genre: "Sci-Fi",
    language: "English",
    durationMinutes: 169,
    rating: 8.7,
    posterUrl: "https://placehold.co/300x450?text=Interstellar",
    status: "NOW_SHOWING" as const,
  },
  {
    title: "TheaterSync Upcoming Movie",
    description: "A sample movie for testing upcoming movie listings.",
    genre: "Drama",
    language: "English",
    durationMinutes: 120,
    rating: null,
    posterUrl: "https://placehold.co/300x450?text=Upcoming",
    status: "UPCOMING" as const,
  },
];

async function main() {
  for (const movie of movies) {
    await prisma.movie.upsert({
      where: { title: movie.title },
      update: movie,
      create: movie,
    });
  }

  console.log("Sample movies inserted or updated successfully!");
}

main()
  .catch((error) => {
    console.error("Failed to insert sample movies:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });