import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";

export default function MapView({ ambulancePos, routes, setRoutes }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchRoute() {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambulance_lat: ambulancePos[0],
          ambulance_lng: ambulancePos[1],
          hospital_lat: 12.9716,
          hospital_lng: 77.5946
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Route API error: ${res.status}`);
      }
      
      const data = await res.json();
      setRoutes(data);
    } catch (err) {
      console.error("Failed to fetch route:", err);
      setError(err.message || "Failed to fetch route. Check backend is running.");
    } finally {
      setLoading(false);
    }
  }

  if (!ambulancePos) return null;

  return (
    <>
      <button onClick={fetchRoute} disabled={loading} style={{ marginTop: '10px', padding: '10px 15px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? "⏳ Finding Route..." : "🚑 Start Emergency Route"}
      </button>
      {error && <div style={{ color: 'red', marginTop: '10px', padding: '10px', background: '#ffe0e0', borderRadius: '4px' }}>{error}</div>}

      <MapContainer center={ambulancePos} zoom={13} style={{ height: "70vh" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={ambulancePos} />
        {routes && (
          <>
            <Polyline positions={routes.best_route.polyline} color="blue" />
            <Polyline positions={routes.traffic_route.polyline} color="red" />
          </>
        )}
      </MapContainer>
    </>
  );
}
