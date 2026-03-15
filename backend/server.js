import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import hospitalRoutes from "./routes/hospital.js";
import routeRoutes from "./routes/route.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Validate API configuration
const apiKey = process.env.MAPMYINDIA_API_KEY;
if (apiKey) {
  console.log("✅ MapMyIndia API Key loaded successfully");
} else {
  console.warn("⚠️  Warning: MAPMYINDIA_API_KEY is not set in .env file");
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date(), message: "🚑 Backend is alive and kicking!" });
});

app.use("/hospitals", hospitalRoutes);
app.use("/route", routeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚑 Backend running on port", PORT);
});
