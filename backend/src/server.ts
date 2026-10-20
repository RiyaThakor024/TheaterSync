
import * as dotenv from "dotenv";
import app from "./app";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`TheaterSync backend running on port ${PORT}`);
});
