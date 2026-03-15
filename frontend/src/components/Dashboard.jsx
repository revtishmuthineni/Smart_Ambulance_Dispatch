import { useState, useEffect, useRef } from "react";
import MapView from "./MapView";
import NavigationPanel from "./NavigationPanel";
import { setupNetworkSyncListeners } from "../services/syncService.js";
import { getOfflineHospitals, logTrip } from "../services/offlineDB.js";
import { findNearestHospitals } from "../services/offlineRouting.js";
import heroImage from "../assets/ai_ambulance_hero.png";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Dashboard({ onPlaySound }) {
  const [pos, setPos] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedCity, setDetectedCity] = useState(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("syncing"); // "syncing" | "cached" | "fresh" | "offline"
  const watchIdRef = useRef(null);

  // ── 1. Boot: Proactive sync + network listeners ─────────────────
  useEffect(() => {
    // Set initial online state
    setIsOffline(!navigator.onLine);

    // Setup sync: proactively cache hospitals NOW and auto-sync when online returns
    setupNetworkSyncListeners((offline) => {
      setIsOffline(offline);
      if (!offline) {
        setSyncStatus("syncing");
      }
    });

    // Cleanup for watchPosition (which will now be triggered by the button)
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── 2. Load nearby hospitals whenever the GPS position updates ───
  useEffect(() => {
    if (!pos) return;

    async function loadNearbyHospitals() {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

      if (navigator.onLine) {
        // Online: Fetch from backend (which also re-caches to IndexedDB)
        try {
          const res = await fetch(`${backendUrl}/hospitals/nearby`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ambulance_lat: pos[0], ambulance_lng: pos[1] }),
            signal: AbortSignal.timeout(6000)
          });
          if (res.ok) {
            const data = await res.json();
            console.log(`🌐 Online: Found ${data.hospitals.length} hospitals in ${data.city || "area"}`);
            setDetectedCity(data.city);
            setHospitals(data.hospitals);
            setSyncStatus("fresh");
            if (data.hospitals.length > 0) setSelectedHospital(data.hospitals[0]);
            return;
          }
        } catch (err) {
          console.warn("Backend fetch failed, falling back to offline DB:", err.message);
        }
      }

      // Offline: Load from IndexedDB
      try {
        const allHospitals = await getOfflineHospitals();
        if (allHospitals.length > 0) {
          const sorted = findNearestHospitals(pos[0], pos[1], allHospitals);
          console.log(`📦 Offline: Showing ${sorted.length} hospitals from local DB`);
          setHospitals(sorted);
          setSyncStatus("cached");
          if (sorted.length > 0) setSelectedHospital(sorted[0]);
        } else {
          console.warn("No offline hospital data available.");
          setSyncStatus("offline");
        }
      } catch (err) {
        console.error("Failed to load offline hospitals:", err);
        setSyncStatus("offline");
      }
    }

    loadNearbyHospitals();
  }, [pos]);

  const detectLocation = () => {
    setLoading(true);
    
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    // Start continuous GPS tracking once the button is clicked
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude]);
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLoading(false);
        alert("Could not detect location. Please enable location services.");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  const handleReached = async () => {
    // Log the trip (synced to backend when online returns)
    if (pos && selectedHospital) {
      await logTrip({
        ambulanceLat: pos[0],
        ambulanceLng: pos[1],
        hospitalName: selectedHospital.name,
        status: "reached"
      });
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance("Location reached. Route cleared.");
      msg.rate = 1.0;
      msg.pitch = 1.1;
      window.speechSynthesis.speak(msg);
    }
    
    // Stop continuous GPS tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setPos(null); // Reset back to initial hero image state
    setRoutes(null);
    setSelectedHospital(null);
    setEmergencyActive(false);
    setCurrentStep(0);
  };

  // ── Status Banner ─────────────────────────────────────────────────
  const getStatusBanner = () => {
    if (isOffline) return {
      bg: "rgba(255,71,87,0.15)",
      border: "rgba(255,71,87,0.4)",
      icon: "📴",
      text: "OFFLINE MODE — Using locally cached hospital data. GPS is active."
    };
    if (syncStatus === "fresh") return {
      bg: "rgba(46,213,115,0.12)",
      border: "rgba(46,213,115,0.3)",
      icon: "🌐",
      text: "Online — Live hospital data loaded and cached for offline use."
    };
    if (syncStatus === "cached") return {
      bg: "rgba(255,165,0,0.12)",
      border: "rgba(255,165,0,0.3)",
      icon: "📦",
      text: "Weak / No signal — Showing pre-cached hospital data."
    };
    return null;
  };

  const banner = getStatusBanner();

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", background: "var(--dark-bg)" }}>
      {/* Header Panel */}
      <div className="glass-panel" style={{
        margin: "20px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        zIndex: 10,
        position: "relative",
        animation: "slide-up-fade 0.6s ease-out"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", animation: "slide-up-fade 0.8s ease-out" }}>
          <span style={{ fontSize: "32px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>🚑</span>
          <h1 className="text-gradient" style={{ margin: 0, fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Smart Ambulance Dispatch
          </h1>
        </div>

        {/* Network / Cache Status Banner */}
        {banner && (
          <div style={{
            background: banner.bg,
            border: `1px solid ${banner.border}`,
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            color: "var(--text-light)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 600,
          }}>
            <span style={{ fontSize: "16px" }}>{banner.icon}</span>
            {banner.text}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "4px" }}>
          <button
            onClick={detectLocation}
            disabled={loading || !!pos}
            className="btn-primary"
            style={{ 
              padding: "16px 24px", 
              animation: "none", 
              gridColumn: pos ? "1" : "1 / -1", 
              fontSize: "16px", 
              letterSpacing: "1px",
              opacity: pos ? 0.6 : 1,
              cursor: pos ? "default" : "pointer"
            }}
          >
            {pos ? "✅ Location Detected" : loading ? "⏳ Detecting Location..." : "📍 Detect Ambulance Location"}
          </button>

          {pos && (
            <select
              value={selectedHospital ? JSON.stringify(selectedHospital) : ""}
              onChange={(e) => {
                const newHospital = JSON.parse(e.target.value);
                setSelectedHospital(newHospital);
                // Reset route state so the Dispatch button becomes active again
                setRoutes(null);
                setEmergencyActive(false);
                setCurrentStep(0);
              }}
              style={{ width: "100%", padding: "14px" }}
            >
              <option value="">-- Select Destination Hospital --</option>
              {hospitals.map((hospital, idx) => (
                <option key={idx} value={JSON.stringify(hospital)}>
                  🏥 {hospital.name} 📞 {hospital.phone} {hospital.distance ? `(${hospital.distance.toFixed(1)} km)` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Hero Image - Appears only before location is detected */}
        {!pos && (
          <div style={{
            marginTop: "8px",
            width: "100%",
            height: "400px",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            animation: "slide-up-fade 0.8s ease-out 0.2s both",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 240, 255, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <img 
              src={heroImage} 
              alt="Futuristic AI Ambulance Dashboard"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "contrast(1.1) brightness(0.95)"
              }}
            />
            {/* Dark gradient overlay at the bottom for aesthetic blending */}
            <div style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              height: "40%",
              background: "linear-gradient(to top, rgba(7, 9, 15, 0.9), transparent)",
              pointerEvents: "none"
            }} />
          </div>
        )}

        {pos && selectedHospital && (
          <div style={{
            background: "rgba(0, 240, 255, 0.08)",
            border: "1px solid rgba(0, 240, 255, 0.25)",
            padding: "16px 20px",
            borderRadius: "14px",
            fontSize: "14px",
            color: "var(--text-light)",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)",
            animation: "slide-up-fade 0.5s ease-out 0.2s both"
          }}>
            <span style={{ color: "var(--accent-color)", fontWeight: 700, letterSpacing: "1px" }}>● Location Confirmed</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>{detectedCity ? <strong style={{color:"#fff"}}>{detectedCity}</strong> : "Coordinates"} ({pos[0].toFixed(4)}, {pos[1].toFixed(4)})</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>Target: <strong style={{ color: "var(--primary-color)" }}>🏥 {selectedHospital.name}</strong> 📞 <strong style={{color:"#fff"}}>{selectedHospital.phone}</strong></span>
            {selectedHospital.distance &&
              <span style={{ background: "rgba(0, 230, 118, 0.2)", color: "var(--secondary-color)", padding: "4px 10px", borderRadius: "12px", fontSize: "13px", marginLeft: "auto", fontWeight: 800, border: "1px solid rgba(0, 230, 118, 0.3)" }}>
                {selectedHospital.distance.toFixed(1)} km away
              </span>
            }
          </div>
        )}
      </div>

      {pos && (
        <MapView
          ambulancePos={pos}
          routes={routes}
          setRoutes={setRoutes}
          selectedHospital={selectedHospital}
          onPlaySound={onPlaySound}
          setEmergencyActive={setEmergencyActive}
          setCurrentStep={setCurrentStep}
          onReached={handleReached}
          isOffline={isOffline}
        />
      )}

      {routes && (
        <NavigationPanel
          steps={routes.best_route.steps}
          distance={routes.best_route.distance}
          duration={routes.best_route.duration}
          selectedHospital={selectedHospital}
          emergencyActive={emergencyActive}
          onReached={handleReached}
          onPlaySound={onPlaySound}
          currentStep={currentStep}
          isOffline={isOffline}
          ambulancePos={pos}
        />
      )}
    </div>
  );
}
