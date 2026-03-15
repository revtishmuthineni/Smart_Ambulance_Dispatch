import { useEffect } from "react";
import Dashboard from "./components/Dashboard";

export default function App() {
  console.log("🏠 App component rendering...");

  useEffect(() => {
    console.log("🛡️ App useEffect mounting...");
    const checkBackend = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        console.log(`🏥 Checking backend connectivity at: ${backendUrl}`);
        const res = await fetch(`${backendUrl}/health`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("✅ Backend connectivity verified:", data.message);
      } catch (err) {
        console.error("❌ Backend connectivity failed:", err);
      }
    };
    checkBackend();
  }, []);

  // Audio alerts removed as per user request

  return (
    <>
      <div className="alert-banner">
        🚨 AMBULANCE ON THE WAY – PLEASE CLEAR THE ROUTE
      </div>
      <Dashboard />
    </>
  );
}

