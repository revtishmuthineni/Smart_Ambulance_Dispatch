import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import hospitalRoutes from "./routes/hospital.js";
import routeRoutes from "./routes/route.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/hospitals", hospitalRoutes);
app.use("/route", routeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚑 Backend running on port", PORT);
});
