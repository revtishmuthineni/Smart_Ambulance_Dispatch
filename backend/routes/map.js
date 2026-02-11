import express from "express";
import { getRoutes } from "../services/mapmyindia.js";

const router = express.Router();

router.post("/route", async (req, res) => {
  try {
    const { start, end } = req.body || {};

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end required" });
    }

    const data = await getRoutes(start, end);
    res.json(data);
  } catch (error) {
    console.error(error?.response?.data || error?.message || error);
    res.status(500).json({ error: "Failed to fetch route" });
  }
});

export default router;
