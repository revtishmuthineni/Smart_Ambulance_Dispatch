import express from "express";
const router = express.Router();

// Comprehensive Hospital database covering major Indian cities
const hospitalsDatabase = [
  // ===== ANDHRA PRADESH =====
  // Guntur Hospitals
  { name: "Guntur Central Hospital", lat: 16.3853, lng: 80.4294, city: "Guntur", state: "Andhra Pradesh", phone: "0863-2223333" },
  { name: "Ramakrishna Medicare", lat: 16.3910, lng: 80.4350, city: "Guntur", state: "Andhra Pradesh", phone: "0863-2234000" },
  { name: "Apollo Hospitals Guntur", lat: 16.3800, lng: 80.4250, city: "Guntur", state: "Andhra Pradesh", phone: "1066" },
  { name: "Care Hospital Guntur", lat: 16.3900, lng: 80.4400, city: "Guntur", state: "Andhra Pradesh", phone: "10555" },

  // Vijayawada Hospitals
  { name: "Vijayawada Medical Center", lat: 16.5062, lng: 80.6480, city: "Vijayawada", state: "Andhra Pradesh", phone: "0866-2458888" },
  { name: "NRI Hospital Vijayawada", lat: 16.5100, lng: 80.6450, city: "Vijayawada", state: "Andhra Pradesh", phone: "08645-246900" },
  { name: "Apollo Vijayawada", lat: 16.5050, lng: 80.6500, city: "Vijayawada", state: "Andhra Pradesh", phone: "1066" },

  // Visakhapatnam Hospitals
  { name: "Visakhapatnam Apollo Hospital", lat: 17.6869, lng: 83.2185, city: "Visakhapatnam", state: "Andhra Pradesh", phone: "1066" },
  { name: "Care Hospital Visakhapatnam", lat: 17.6900, lng: 83.2200, city: "Visakhapatnam", state: "Andhra Pradesh", phone: "10555" },

  // ===== KARNATAKA =====
  // Bangalore Hospitals
  { name: "City Hospital Bangalore", lat: 12.9716, lng: 77.5946, city: "Bangalore", state: "Karnataka", phone: "080-22221111" },
  { name: "Metro Care Bangalore", lat: 12.9750, lng: 77.6050, city: "Bangalore", state: "Karnataka", phone: "080-23334444" },
  { name: "Apollo Bangalore", lat: 12.9690, lng: 77.5900, city: "Bangalore", state: "Karnataka", phone: "1066" },
  { name: "Manipal Hospital Bangalore", lat: 12.9850, lng: 77.6100, city: "Bangalore", state: "Karnataka", phone: "1800-102-5555" },
  { name: "Fortis Hospital Bangalore", lat: 12.9650, lng: 77.5800, city: "Bangalore", state: "Karnataka", phone: "105010" },

  // Mysore Hospitals
  { name: "Mysore Medical Center", lat: 12.2958, lng: 76.6394, city: "Mysore", state: "Karnataka", phone: "0821-2520101" },
  { name: "Apollo Mysore", lat: 12.3000, lng: 76.6450, city: "Mysore", state: "Karnataka", phone: "1066" },

  // ===== TAMIL NADU =====
  // Chennai Hospitals
  { name: "Apollo Chennai", lat: 13.0827, lng: 80.2707, city: "Chennai", state: "Tamil Nadu", phone: "1066" },
  { name: "Fortis Chennai", lat: 13.0900, lng: 80.2750, city: "Chennai", state: "Tamil Nadu", phone: "105010" },
  { name: "Max Hospital Chennai", lat: 13.0800, lng: 80.2650, city: "Chennai", state: "Tamil Nadu", phone: "011-26515050" },
  { name: "MIOT International Chennai", lat: 13.0850, lng: 80.2700, city: "Chennai", state: "Tamil Nadu", phone: "044-42002288" },

  // Coimbatore Hospitals
  { name: "Coimbatore Medical Center", lat: 11.0081, lng: 76.9624, city: "Coimbatore", state: "Tamil Nadu", phone: "0422-4323800" },
  { name: "Apollo Coimbatore", lat: 11.0150, lng: 76.9700, city: "Coimbatore", state: "Tamil Nadu", phone: "1066" },

  // ===== TELANGANA =====
  // Hyderabad Hospitals
  { name: "Apollo Hyderabad", lat: 17.3850, lng: 78.4867, city: "Hyderabad", state: "Telangana", phone: "1066" },
  { name: "Max Hospital Hyderabad", lat: 17.3900, lng: 78.4900, city: "Hyderabad", state: "Telangana", phone: "011-26515050" },
  { name: "Fortis Hyderabad", lat: 17.3800, lng: 78.4850, city: "Hyderabad", state: "Telangana", phone: "105010" },
  { name: "Care Hospital Hyderabad", lat: 17.3880, lng: 78.4880, city: "Hyderabad", state: "Telangana", phone: "10555" },
  { name: "KIMS Hyderabad", lat: 17.3920, lng: 78.4920, city: "Hyderabad", state: "Telangana", phone: "040-44885000" },

  // ===== MAHARASHTRA =====
  // Mumbai Hospitals
  { name: "Apollo Mumbai", lat: 19.0760, lng: 72.8777, city: "Mumbai", state: "Maharashtra", phone: "1066" },
  { name: "Max Hospital Mumbai", lat: 19.0800, lng: 72.8800, city: "Mumbai", state: "Maharashtra", phone: "011-26515050" },
  { name: "Fortis Mumbai", lat: 19.0750, lng: 72.8750, city: "Mumbai", state: "Maharashtra", phone: "105010" },
  { name: "Kokilaben Hospital Mumbai", lat: 19.0850, lng: 72.8850, city: "Mumbai", state: "Maharashtra", phone: "022-30983098" },

  // Pune Hospitals
  { name: "Apollo Pune", lat: 18.5204, lng: 73.8567, city: "Pune", state: "Maharashtra", phone: "1066" },
  { name: "Max Hospital Pune", lat: 18.5250, lng: 73.8600, city: "Pune", state: "Maharashtra", phone: "011-26515050" },
  { name: "Deenanath Mangeshkar Hospital", lat: 18.5180, lng: 73.8550, city: "Pune", state: "Maharashtra", phone: "020-40151000" },

  // Nagpur Hospitals
  { name: "Nagpur Medical Center", lat: 21.1458, lng: 79.0882, city: "Nagpur", state: "Maharashtra", phone: "0712-2553000" },
  { name: "Apollo Nagpur", lat: 21.1500, lng: 79.0900, city: "Nagpur", state: "Maharashtra", phone: "1066" },

  // ===== DELHI & NCR =====
  // Delhi Hospitals
  { name: "Apollo Delhi", lat: 28.6139, lng: 77.2090, city: "Delhi", state: "Delhi", phone: "1066" },
  { name: "Max Hospital Delhi", lat: 28.6200, lng: 77.2150, city: "Delhi", state: "Delhi", phone: "011-26515050" },
  { name: "Fortis Delhi", lat: 28.6100, lng: 77.2050, city: "Delhi", state: "Delhi", phone: "105010" },
  { name: "AIIMS Delhi", lat: 28.5695, lng: 77.2080, city: "Delhi", state: "Delhi", phone: "011-26588500" },

  // Noida Hospitals
  { name: "Apollo Noida", lat: 28.5921, lng: 77.3629, city: "Noida", state: "Uttar Pradesh", phone: "1066" },
  { name: "Max Hospital Noida", lat: 28.5950, lng: 77.3650, city: "Noida", state: "Uttar Pradesh", phone: "011-26515050" },

  // ===== WEST BENGAL =====
  // Kolkata Hospitals
  { name: "Apollo Kolkata", lat: 22.4885, lng: 88.3731, city: "Kolkata", state: "West Bengal", phone: "1066" },
  { name: "Max Hospital Kolkata", lat: 22.4950, lng: 88.3800, city: "Kolkata", state: "West Bengal", phone: "011-26515050" },
  { name: "Fortis Kolkata", lat: 22.4850, lng: 88.3700, city: "Kolkata", state: "West Bengal", phone: "105010" },

  // ===== RAJASTHAN =====
  // Jaipur Hospitals
  { name: "Apollo Jaipur", lat: 26.9124, lng: 75.7873, city: "Jaipur", state: "Rajasthan", phone: "1066" },
  { name: "Max Hospital Jaipur", lat: 26.9180, lng: 75.7920, city: "Jaipur", state: "Rajasthan", phone: "011-26515050" },
  { name: "Fortis Jaipur", lat: 26.9100, lng: 75.7850, city: "Jaipur", state: "Rajasthan", phone: "105010" },

  // ===== GUJARAT =====
  // Ahmedabad Hospitals
  { name: "Apollo Ahmedabad", lat: 23.0225, lng: 72.5714, city: "Ahmedabad", state: "Gujarat", phone: "1066" },
  { name: "Max Hospital Ahmedabad", lat: 23.0280, lng: 72.5760, city: "Ahmedabad", state: "Gujarat", phone: "011-26515050" },
  { name: "Fortis Ahmedabad", lat: 23.0200, lng: 72.5700, city: "Ahmedabad", state: "Gujarat", phone: "105010" },

  // ===== UTTAR PRADESH =====
  // Lucknow Hospitals
  { name: "Apollo Lucknow", lat: 26.8467, lng: 80.9462, city: "Lucknow", state: "Uttar Pradesh", phone: "1066" },
  { name: "Max Hospital Lucknow", lat: 26.8500, lng: 80.9500, city: "Lucknow", state: "Uttar Pradesh", phone: "011-26515050" },

  // Kanpur Hospitals
  { name: "Kanpur Medical Center", lat: 26.4499, lng: 80.3319, city: "Kanpur", state: "Uttar Pradesh", phone: "0512-2304242" },
  { name: "Apollo Kanpur", lat: 26.4550, lng: 80.3350, city: "Kanpur", state: "Uttar Pradesh", phone: "1066" },

  // ===== KERALA =====
  // Cochin Hospitals
  { name: "Apollo Cochin", lat: 9.9312, lng: 76.2673, city: "Cochin", state: "Kerala", phone: "1066" },
  { name: "Max Hospital Cochin", lat: 9.9350, lng: 76.2700, city: "Cochin", state: "Kerala", phone: "011-26515050" },

  // ===== HARYANA =====
  // Gurgaon Hospitals
  { name: "Apollo Gurgaon", lat: 28.4595, lng: 77.0266, city: "Gurgaon", state: "Haryana", phone: "1066" },
  { name: "Max Hospital Gurgaon", lat: 28.4650, lng: 77.0300, city: "Gurgaon", state: "Haryana", phone: "011-26515050" }
];

// Determine if coordinates are in a specific city (using geofencing)
function getCityFromCoordinates(lat, lng) {
  // Guntur region
  if (lat > 16.2 && lat < 16.5 && lng > 80.2 && lng < 80.6) return "Guntur";

  // Vijayawada region
  if (lat > 16.4 && lat < 16.7 && lng > 80.5 && lng < 80.8) return "Vijayawada";

  // Visakhapatnam region
  if (lat > 17.5 && lat < 17.9 && lng > 83.0 && lng < 83.4) return "Visakhapatnam";

  // Bangalore region
  if (lat > 12.8 && lat < 13.1 && lng > 77.4 && lng < 77.8) return "Bangalore";

  // Mysore region
  if (lat > 12.1 && lat < 12.5 && lng > 76.5 && lng < 76.8) return "Mysore";

  // Chennai region
  if (lat > 12.9 && lat < 13.2 && lng > 80.1 && lng < 80.4) return "Chennai";

  // Coimbatore region
  if (lat > 10.9 && lat < 11.2 && lng > 76.8 && lng < 77.1) return "Coimbatore";

  // Hyderabad region
  if (lat > 17.2 && lat < 17.5 && lng > 78.3 && lng < 78.6) return "Hyderabad";

  // Mumbai region
  if (lat > 18.9 && lat < 19.3 && lng > 72.7 && lng < 73.0) return "Mumbai";

  // Pune region
  if (lat > 18.4 && lat < 18.7 && lng > 73.7 && lng < 73.9) return "Pune";

  // Nagpur region
  if (lat > 21.0 && lat < 21.3 && lng > 79.0 && lng < 79.2) return "Nagpur";

  // Delhi region
  if (lat > 28.4 && lat < 28.8 && lng > 77.0 && lng < 77.4) return "Delhi";

  // Noida region
  if (lat > 28.4 && lat < 28.7 && lng > 77.3 && lng < 77.6) return "Noida";

  // Kolkata region
  if (lat > 22.3 && lat < 22.7 && lng > 88.2 && lng < 88.5) return "Kolkata";

  // Jaipur region
  if (lat > 26.7 && lat < 27.1 && lng > 75.6 && lng < 75.9) return "Jaipur";

  // Ahmedabad region
  if (lat > 22.9 && lat < 23.2 && lng > 72.4 && lng < 72.7) return "Ahmedabad";

  // Lucknow region
  if (lat > 26.7 && lat < 27.0 && lng > 80.8 && lng < 81.1) return "Lucknow";

  // Kanpur region
  if (lat > 26.3 && lat < 26.6 && lng > 80.2 && lng < 80.5) return "Kanpur";

  // Cochin region
  if (lat > 9.8 && lat < 10.1 && lng > 76.1 && lng < 76.4) return "Cochin";

  // Gurgaon region
  if (lat > 28.3 && lat < 28.6 && lng > 76.9 && lng < 77.2) return "Gurgaon";

  return null;
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get("/", (req, res) => {
  res.json(hospitalsDatabase);
});

// Get hospitals by ambulance location
router.post("/nearby", (req, res) => {
  const { ambulance_lat, ambulance_lng } = req.body || {};

  if (!ambulance_lat || !ambulance_lng) {
    return res.status(400).json({ error: "Missing ambulance coordinates" });
  }

  // Detect the city from ambulance coordinates
  const detectedCity = getCityFromCoordinates(ambulance_lat, ambulance_lng);

  // Filter hospitals by detected city
  let nearbyHospitals = hospitalsDatabase;
  if (detectedCity) {
    nearbyHospitals = hospitalsDatabase.filter(h => h.city === detectedCity);
    console.log(`📍 Ambulance detected in ${detectedCity}. Found ${nearbyHospitals.length} hospitals`);
  } else {
    console.log(`📍 Ambulance location not in known city. Returning all hospitals.`);
  }

  // Add distance to each hospital and sort by distance
  const hospitalsWithDistance = nearbyHospitals.map(hospital => ({
    ...hospital,
    distance: calculateDistance(ambulance_lat, ambulance_lng, hospital.lat, hospital.lng)
  })).sort((a, b) => a.distance - b.distance);

  res.json({
    city: detectedCity,
    hospitals: hospitalsWithDistance
  });
});

export default router;
