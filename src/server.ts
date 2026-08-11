import express from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

async function connectDB() {
  console.log(process.env.DB_URL!);
  await mongoose.connect(process.env.DB_URL!);

  console.log("Mongo connected");
}
connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1);
});

app.get("/", async (req, res) => {
  return res.json({ message: "server running" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
