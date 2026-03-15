/**
 * offlineRouting.js
 * A lightweight offline routing engine using Dijkstra's algorithm.
 * Uses a locally stored JSON road graph for the target city.
 * Falls back to finding nearest hospital + straight-line route.
 */

// ─── Haversine Distance (km) ──────────────────────────────────────
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Nearest Hospital Finder ──────────────────────────────────────
/** Given the ambulance coordinate and list of hospitals, sort by straight-line distance */
export function findNearestHospitals(ambulanceLat, ambulanceLng, hospitals) {
  return hospitals
    .map(h => ({
      ...h,
      distance: haversineKm(ambulanceLat, ambulanceLng, h.lat, h.lng)
    }))
    .sort((a, b) => a.distance - b.distance);
}

// ─── Straight-line Route Builder ──────────────────────────────────
/**
 * Generates a simple straight-line polyline with a few waypoints.
 * Used when the API and road graph are both unavailable.
 */
export function buildStraightLineRoute(ambulancePos, hospital) {
  const [aLat, aLng] = ambulancePos;
  const hLat = hospital.lat;
  const hLng = hospital.lng;

  // Add 2 intermediate bezier-style waypoints for a slightly curved visual
  const mid1Lat = aLat + (hLat - aLat) * 0.33 + (Math.random() - 0.5) * 0.008;
  const mid1Lng = aLng + (hLng - aLng) * 0.33 + (Math.random() - 0.5) * 0.008;
  const mid2Lat = aLat + (hLat - aLat) * 0.66 + (Math.random() - 0.5) * 0.008;
  const mid2Lng = aLng + (hLng - aLng) * 0.66 + (Math.random() - 0.5) * 0.008;

  const polyline = [
    [aLat, aLng],
    [mid1Lat, mid1Lng],
    [mid2Lat, mid2Lng],
    [hLat, hLng]
  ];

  const distKm = haversineKm(aLat, aLng, hLat, hLng);
  const estimatedDuration = Math.ceil((distKm / 40) * 60 * 60); // 40 km/h average city speed, in seconds

  return {
    isOffline: true,
    best_route: {
      polyline,
      distance: Math.round(distKm * 1000), // meters
      duration: estimatedDuration,
      steps: [
        "📴 Offline Mode – Network not available",
        "📍 Estimated straight-line route to hospital",
        `🏥 Target: ${hospital.name}`,
        `📏 Straight-line distance: ${distKm.toFixed(1)} km`,
        "⚠️ Actual road distance may be longer",
        "📞 Call hospital if needed – number shown below",
        "🛣️ Follow roads toward the highlighted direction",
        "🏁 Arrive at Emergency Bay"
      ]
    },
    traffic_route: null
  };
}

// ─── Dijkstra Algorithm on Preloaded Road Graph ────────────────────
/**
 * Runs Dijkstra's shortest path on a preloaded road network graph.
 * Graph format: { nodes: { id: {lat, lng} }, edges: { id: [{to, weight}] } }
 */
export function dijkstraRoute(graph, startNodeId, endNodeId) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  const queue = Object.keys(graph.nodes).map(n => {
    dist[n] = n === startNodeId ? 0 : Infinity;
    return n;
  });

  while (queue.length > 0) {
    // Get the unvisited node with minimum distance
    queue.sort((a, b) => dist[a] - dist[b]);
    const u = queue.shift();
    if (u === endNodeId || dist[u] === Infinity) break;
    visited.add(u);

    for (const edge of (graph.edges[u] || [])) {
      if (visited.has(edge.to)) continue;
      const alt = dist[u] + edge.weight;
      if (alt < dist[edge.to]) {
        dist[edge.to] = alt;
        prev[edge.to] = u;
      }
    }
  }

  // Reconstruct path
  const path = [];
  let curr = endNodeId;
  while (prev[curr]) {
    path.unshift(curr);
    curr = prev[curr];
  }
  path.unshift(startNodeId);
  return { path, totalDist: dist[endNodeId] };
}

/** Find the nearest graph node to a given lat/lng */
export function nearestNode(graph, lat, lng) {
  let bestId = null;
  let bestDist = Infinity;
  for (const [id, node] of Object.entries(graph.nodes)) {
    const d = haversineKm(lat, lng, node.lat, node.lng);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

/** Convert a node-based path to a lat/lng polyline array */
export function pathToPolyline(graph, path) {
  return path.map(id => [graph.nodes[id].lat, graph.nodes[id].lng]);
}
