import express from "express";
import { getRoutes } from "../services/mapmyindia.js";

const router = express.Router();

// Decode an encoded polyline string (Google/Mapbox algorithm) to [lat,lng] pairs
function decodePolyline(str, precision = 5) {
  let index = 0, lat = 0, lng = 0, coordinates = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let result = 1, shift = 0, b;
    do {
      b = str.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 1; shift = 0;
    do {
      b = str.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

router.post("/", async (req, res) => {
  try {
    const { ambulance_lat, ambulance_lng, hospital_lat, hospital_lng } = req.body || {};

    if (
      ambulance_lat == null ||
      ambulance_lng == null ||
      hospital_lat == null ||
      hospital_lng == null
    ) {
      return res.status(400).json({ error: "Missing required coordinates in request body." });
    }

    const start = `${ambulance_lng},${ambulance_lat}`;
    const end = `${hospital_lng},${hospital_lat}`;

    // If FORCE_MOCK_ROUTE is set, immediately return a safe mock route for frontend preview
    if (process.env.FORCE_MOCK_ROUTE === 'true') {
      const mockPolyline = [
        [parseFloat(ambulance_lat), parseFloat(ambulance_lng)],
        [ (parseFloat(ambulance_lat) + parseFloat(hospital_lat)) / 2, (parseFloat(ambulance_lng) + parseFloat(hospital_lng)) / 2 ],
        [parseFloat(hospital_lat), parseFloat(hospital_lng)]
      ];
      const mockSteps = [
        "Head north",
        "Turn right onto Main St",
        "Continue straight for 2 km",
        "Take the ramp to Hospital Entrance"
      ];

      return res.json({
        best_route: { polyline: mockPolyline, steps: mockSteps },
        traffic_route: { polyline: mockPolyline }
      });
    }

    const apiKey = process.env.MAPMYINDIA_API_KEY;
    const routes = await getRoutes(start, end, apiKey);
    // Debug: log a short preview of the provider response to diagnose mapping errors
    try {
      console.log('DEBUG routes length:', Array.isArray(routes) ? routes.length : typeof routes);
      if (Array.isArray(routes) && routes[0]) console.log('DEBUG first route keys:', Object.keys(routes[0]));
    } catch (e) {
      console.log('DEBUG failed to log routes:', e);
    }
    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(502).json({ error: "No routes returned from provider." });
    }

    // Attempt to map provider response to our shape; if mapping fails, fall back to a safe mock
    try {
      const best = routes[0];
      const traffic = routes[routes.length - 1];

      // Helper to normalize geometry into array of [lat,lng]
      const toLatLngArray = (geom) => {
        if (!geom) return [];
        try {
          if (Array.isArray(geom.coordinates)) {
            return geom.coordinates.map((c) => [c[1], c[0]]);
          }
          // geom may already be an encoded polyline string
          if (typeof geom === "string") {
            try { return decodePolyline(geom); } catch (e) { return []; }
          }
          // or geometry may be nested as { geometry: "..." }
          if (geom && typeof geom.geometry === "string") {
            try { return decodePolyline(geom.geometry); } catch (e) { return []; }
          }
        } catch (e) {
          console.error('toLatLngArray error:', e);
        }
        return [];
      };

      return res.json({
        best_route: {
          polyline: toLatLngArray(best.geometry || best),
          steps: (best.legs && best.legs[0] && Array.isArray(best.legs[0].steps))
            ? best.legs[0].steps.map((s) => (s && s.maneuver) ? s.maneuver.instruction || "" : "")
            : []
        },
        traffic_route: {
          polyline: toLatLngArray(traffic.geometry || traffic)
        }
      });
    } catch (mapErr) {
      console.error('Mapping provider response failed:', mapErr);
      if (mapErr && mapErr.stack) console.error(mapErr.stack);
      const mockPolyline = [
        [parseFloat(ambulance_lat), parseFloat(ambulance_lng)],
        [ (parseFloat(ambulance_lat) + parseFloat(hospital_lat)) / 2, (parseFloat(ambulance_lng) + parseFloat(hospital_lng)) / 2 ],
        [parseFloat(hospital_lat), parseFloat(hospital_lng)]
      ];
      return res.json({
        best_route: { polyline: mockPolyline, steps: [] },
        traffic_route: { polyline: mockPolyline }
      });
    }
  } catch (err) {
    console.error("Error in /route:", err);
    if (err && err.stack) console.error(err.stack);

    // If the provider returns 401 (invalid API key), fallback to a mock route
    const status = err?.response?.status || (err?.message && err.message.includes('401') ? 401 : null);
    if (status === 401) {
      const mockPolyline = [
        [parseFloat(ambulance_lat), parseFloat(ambulance_lng)],
        [ (parseFloat(ambulance_lat) + parseFloat(hospital_lat)) / 2, (parseFloat(ambulance_lng) + parseFloat(hospital_lng)) / 2 ],
        [parseFloat(hospital_lat), parseFloat(hospital_lng)]
      ];
      const mockSteps = [
        "Head north",
        "Turn right onto Main St",
        "Continue straight for 2 km",
        "Take the ramp to Hospital Entrance"
      ];

      return res.json({
        best_route: { polyline: mockPolyline, steps: mockSteps },
        traffic_route: { polyline: mockPolyline }
      });
    }

    res.status(500).json({ error: "Failed to fetch routes", details: err?.message || String(err) });
  }
});

export default router;
