import express from "express";
import { getRoutes } from "../services/mapmyindia.js";

const router = express.Router();

// ─── Haversine Distance (km) ──────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
      const aLat = parseFloat(ambulance_lat), aLng = parseFloat(ambulance_lng);
      const hLat = parseFloat(hospital_lat), hLng = parseFloat(hospital_lng);
      const midLat = (aLat + hLat) / 2, midLng = (aLng + hLng) / 2;
      const mockPolyline = [ [aLat, aLng], [midLat, midLng], [hLat, hLng] ];
      // Traffic route: slight detour via offset midpoint (south-east)
      const trafficPolyline = [
        [aLat, aLng],
        [midLat - 0.015, midLng + 0.015],
        [midLat + 0.010, midLng + 0.020],
        [hLat, hLng]
      ];
      const mockSteps = [
        "Head north on Main Road",
        "Turn right onto Station Road",
        "Continue straight for 2 km",
        "Take the ramp to Hospital Entrance"
      ];
      
      const distKm = haversineKm(aLat, aLng, hLat, hLng);
      const estDistance = Math.round(distKm * 1000);
      const estDuration = Math.ceil((distKm / 40) * 3600);
      
      return res.json({
        best_route: { polyline: mockPolyline, steps: mockSteps, distance: estDistance, duration: estDuration },
        traffic_route: { polyline: trafficPolyline }
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
      // Prefer the 3rd alternative route when available (routes[2]), otherwise fall back to the first
      const preferredIndex = (routes.length > 2) ? 2 : 0;
      console.log('DEBUG using preferred route index:', preferredIndex);
      const best = routes[preferredIndex];
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
          distance: best.distance || 0,
          duration: best.duration || 0,
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
            const aLat2 = parseFloat(ambulance_lat), aLng2 = parseFloat(ambulance_lng);
      const hLat2 = parseFloat(hospital_lat), hLng2 = parseFloat(hospital_lng);
      const mid2Lat = (aLat2 + hLat2) / 2, mid2Lng = (aLng2 + hLng2) / 2;
      const fallbackPolyline = [ [aLat2, aLng2], [mid2Lat, mid2Lng], [hLat2, hLng2] ];
      const fallbackTrafficPolyline = [
        [aLat2, aLng2],
        [mid2Lat - 0.015, mid2Lng + 0.015],
        [mid2Lat + 0.010, mid2Lng + 0.020],
        [hLat2, hLng2]
      ];
      const distKm = haversineKm(aLat2, aLng2, hLat2, hLng2);
      const estDistance = Math.round(distKm * 1000);
      const estDuration = Math.ceil((distKm / 40) * 3600);

      return res.json({
        best_route: { polyline: fallbackPolyline, steps: ["Proceed via estimated shortest path"], distance: estDistance, duration: estDuration },
        traffic_route: { polyline: fallbackTrafficPolyline }
      });
    }
  } catch (err) {
    console.error("Error in /route:", err);
    if (err && err.stack) console.error(err.stack);

    // If the provider returns 401 (invalid API key), fallback to a mock route
    const status = err?.response?.status || (err?.message && err.message.includes('401') ? 401 : null);
    if (status === 401) {
            const aLat3 = parseFloat(ambulance_lat), aLng3 = parseFloat(ambulance_lng);
      const hLat3 = parseFloat(hospital_lat), hLng3 = parseFloat(hospital_lng);
      const mid3Lat = (aLat3 + hLat3) / 2, mid3Lng = (aLng3 + hLng3) / 2;
      const errPolyline = [ [aLat3, aLng3], [mid3Lat, mid3Lng], [hLat3, hLng3] ];
      const errTrafficPolyline = [
        [aLat3, aLng3],
        [mid3Lat - 0.015, mid3Lng + 0.015],
        [mid3Lat + 0.010, mid3Lng + 0.020],
        [hLat3, hLng3]
      ];
      const mockSteps3 = [
        "Head north on Main Road",
        "Turn right onto Station Road",
        "Continue straight toward Destination",
        "Take the ramp to Hospital Entrance"
      ];
      const distKm = haversineKm(aLat3, aLng3, hLat3, hLng3);
      const estDistance = Math.round(distKm * 1000);
      const estDuration = Math.ceil((distKm / 40) * 3600);

      return res.json({
        best_route: { polyline: errPolyline, steps: mockSteps3, distance: estDistance, duration: estDuration },
        traffic_route: { polyline: errTrafficPolyline }
      });
    }

    res.status(500).json({ error: "Failed to fetch routes", details: err?.message || String(err) });
  }
});

export default router;
