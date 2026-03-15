import { useState, useEffect, useCallback } from "react";

// 12 realistic emergency navigation steps
const FALLBACK_STEPS = [
  "Start heading north on Main Road toward City Center",
  "Turn right onto Station Road at the traffic signal",
  "Continue straight for 400 meters on Station Road",
  "Turn left onto Gandhi Marg at the roundabout",
  "Keep right, stay on Gandhi Marg past the bus stop",
  "Turn right onto MG Road — hospital is ahead",
  "Slow down, approaching school zone — drive with caution",
  "Turn left onto Hospital Road after the flyover",
  "Continue 200 meters on Hospital Road",
  "Enter the hospital premise via the main gate",
  "Proceed slowly toward the Emergency Wing",
  "Stop at the Emergency Bay — destination reached"
];

// Removed synthetic siren per user request

export default function NavigationPanel({ steps, distance, duration, selectedHospital, emergencyActive, onReached, isOffline, ambulancePos }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Use provided steps or fallback to our built-in 12-step list
  // Limit to max 12 steps — use API steps if available, otherwise use fallback
  const navSteps = (steps && steps.length > 0) ? steps.slice(0, 12) : FALLBACK_STEPS;

  // Reset step index when emergency starts fresh
  useEffect(() => {
    if (emergencyActive) setCurrentStep(0);
  }, [emergencyActive]);

  // Auto-advance steps every 8 seconds
  useEffect(() => {
    if (emergencyActive && navSteps.length > 0) {
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < navSteps.length - 1) return prev + 1;
          return prev; // stay on last step
        });
      }, 8000);
      return () => clearInterval(stepInterval);
    }
  }, [emergencyActive, navSteps.length]);

  // Read current step aloud; announce offline mode on step 0
  useEffect(() => {
    if (emergencyActive && navSteps[currentStep] && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      let text = navSteps[currentStep];
      if (isOffline && currentStep === 0) {
        text = "Network unavailable. Using offline navigation. " + text;
      }
      const msg = new SpeechSynthesisUtterance(text);
      msg.rate = 1.0;
      msg.pitch = 1.0;
      window.speechSynthesis.speak(msg);
    }
  }, [currentStep, emergencyActive, isOffline]);

  // Periodic "please clear the route" voice warning every 15 seconds
  useEffect(() => {
    if (!emergencyActive) return;
    const warningInterval = setInterval(() => {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const msg = new SpeechSynthesisUtterance("Ambulance is coming, please clear the route.");
          msg.rate = 1.0;
          msg.pitch = 1.1;
          window.speechSynthesis.speak(msg);
        }
    }, 15000);
    return () => clearInterval(warningInterval);
  }, [emergencyActive]);

  if (!navSteps || navSteps.length === 0) return null;


  // Convert distance from meters to km
  const distanceKm = distance ? (distance / 1000).toFixed(1) : "N/A";

  // Convert duration from seconds to minutes
  const durationMin = duration ? Math.ceil(duration / 60) : "N/A";

  return (
    <div className="glass-panel" style={{
      position: 'absolute',
      bottom: '30px',
      right: '30px',
      width: '380px',
      maxHeight: '60vh',
      background: emergencyActive ? 'rgba(255, 71, 87, 0.85)' : 'var(--glass-bg)',
      borderTop: emergencyActive ? '4px solid var(--text-light)' : '3px solid var(--primary-color)',
      padding: '20px',
      overflowY: 'auto',
      zIndex: 1000,
      color: 'var(--text-light)',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      animation: 'slide-up-fade 0.5s ease-out',
      backdropFilter: 'blur(24px)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-light)', fontSize: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>
            {emergencyActive ? '🚨 LIVE ETA & ROUTE' : '📍 Navigation Details'}
          </h3>
          {selectedHospital && (
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
              Dest: <strong>{selectedHospital.name}</strong>
            </p>
          )}
        </div>
        <div style={{
          display: 'flex',
          gap: '15px',
          fontSize: '15px',
          fontWeight: '700',
          color: emergencyActive ? '#fff' : 'var(--primary-color)',
          background: emergencyActive ? 'rgba(0,0,0,0.3)' : 'rgba(255, 71, 87, 0.1)',
          padding: '10px 15px',
          borderRadius: '8px',
          border: emergencyActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255, 71, 87, 0.2)'
        }}>
          <span>📏 {distanceKm} km</span>
          <span>⏱️ {durationMin} min</span>
        </div>
      </div>

      {emergencyActive && (
        <div style={{
          background: 'rgba(0, 240, 255, 0.08)',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: '4px solid var(--accent-color)',
          fontSize: '15px',
          fontWeight: '700',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
        }}>
          <span style={{opacity: 0.8, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px"}}>▶️ Step {currentStep + 1} of {navSteps.length}</span> <br/>
          <span className="text-gradient" style={{fontSize: '18px', display: 'inline-block', marginTop: '6px', fontWeight: 800}}>{navSteps[currentStep]}</span>
        </div>
      )}

      <ol style={{ margin: 0, paddingLeft: '20px', color: '#fff', listStyleType: 'decimal' }}>
        {navSteps.map((step, idx) => (
          <li
            key={idx}
            style={{
              marginBottom: '14px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#ffffff',
              background: idx === currentStep && emergencyActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
              padding: idx === currentStep && emergencyActive ? '12px 16px' : '6px 0 6px 10px',
              borderRadius: idx === currentStep && emergencyActive ? '10px' : '0',
              borderLeft: idx === currentStep && emergencyActive ? '4px solid var(--accent-color)' : '2px solid rgba(255,255,255,0.1)',
              fontWeight: idx === currentStep && emergencyActive ? '700' : '500',
              opacity: idx > currentStep && emergencyActive ? 0.4 : 1,
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <strong style={{ color: idx === currentStep && emergencyActive ? 'var(--accent-color)' : 'var(--text-muted)', marginRight: '8px' }}>Step {idx + 1}:</strong>
            {step || `Navigation step ${idx + 1}`}
          </li>
        ))}
      </ol>

      {emergencyActive && (
        <button 
          onClick={onReached}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            background: 'linear-gradient(135deg, #2ed573, #1e90ff)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(46, 213, 115, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          🏁 Mark Destination Reached
        </button>
      )}

      {/* — Emergency Communications Fallback — */}
      {(emergencyActive || isOffline) && selectedHospital && (
        <div style={{
          marginTop: '18px',
          padding: '14px',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.7, fontWeight: 700, letterSpacing: '1px', marginBottom: '10px' }}>
            📡 EMERGENCY COMMUNICATIONS
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* One-tap Call */}
            <a
              href={`tel:${selectedHospital.phone}`}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                background: 'linear-gradient(135deg, #2ed573, #1abc9c)',
                color: '#fff',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 3px 10px rgba(46,213,115,0.4)'
              }}
            >
              📞 Call {selectedHospital.phone}
            </a>
            {/* One-tap SMS with prefilled message */}
            {ambulancePos && (
              <a
                href={`sms:${selectedHospital.phone}?body=${encodeURIComponent(
                  `Ambulance en route. ETA ${durationMin} mins. Patient critical. Location: lat ${ambulancePos[0].toFixed(5)}, lon ${ambulancePos[1].toFixed(5)}`
                )}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #1e90ff, #6c5ce7)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: '0 3px 10px rgba(30,144,255,0.4)'
                }}
              >
                💬 SMS Location
              </a>
            )}
          </div>
          {isOffline && (
            <p style={{ margin: '10px 0 0 0', fontSize: '11px', opacity: 0.65, textAlign: 'center' }}>
              📴 Offline Mode — Phone &amp; SMS work without internet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
