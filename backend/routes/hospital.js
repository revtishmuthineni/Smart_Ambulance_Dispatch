import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json([
    { name: "City Hospital", lat: 12.9716, lng: 77.5946 },
    { name: "Metro Care", lat: 12.975, lng: 77.605 }
  ]);
});

export default router;
