import axios from "axios";

let cachedToken = null;
let tokenExpiry = 0;

async function fetchAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const clientId = process.env.MAPMYINDIA_CLIENT_ID;
  const clientSecret = process.env.MAPMYINDIA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing MapMyIndia credentials: set MAPMYINDIA_API_KEY or MAPMYINDIA_CLIENT_ID and MAPMYINDIA_CLIENT_SECRET in environment.");
  }

  try {
    const tokenUrl = "https://outpost.mapmyindia.com/api/security/oauth/token";
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const res = await axios.post(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: { username: clientId, password: clientSecret },
    });

    const accessToken = res?.data?.access_token || res?.data?.token;
    const expiresIn = parseInt(res?.data?.expires_in || res?.data?.expires || 3600, 10);
    if (!accessToken) throw new Error("Failed to obtain MapMyIndia access token");

    cachedToken = accessToken;
    tokenExpiry = Date.now() + (expiresIn - 60) * 1000; // refresh 60s early
    return cachedToken;
  } catch (err) {
    console.error("Failed to fetch MapMyIndia access token:", err?.response?.data || err?.message || err);
    throw err;
  }
}

export async function getRoutes(start, end, key) {
  // If a direct API key is provided, use the original URL pattern.
  if (key) {
    // Validate that key is not empty
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new Error("Invalid MapMyIndia API key: key must be a non-empty string");
    }

    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${key}/route_adv/driving/${start};${end}?alternatives=true&steps=true`;
    console.log(`📍 Requesting route: ${start} → ${end}`);
    try {
      const res = await axios.get(url);
      try {
        console.log('DEBUG mapmyindia (key) response keys:', res && res.data ? Object.keys(res.data) : typeof res);
        if (!res?.data?.routes) throw new Error("Unexpected response from MapMyIndia API");
        if (Array.isArray(res.data.routes)) console.log('DEBUG routes length (key):', res.data.routes.length);
      } catch (e) {
        console.error('DEBUG mapmyindia (key) inspect failed:', e, res && res.data);
        throw e;
      }
      return res.data.routes;
    } catch (err) {
      if (err?.response?.status === 401) {
        console.error("❌ MapMyIndia API Error: Invalid or expired API key (401 Unauthorized)");
        console.error("   Check your MAPMYINDIA_API_KEY in .env file");
      } else if (err?.response?.status === 403) {
        console.error("❌ MapMyIndia API Error: Forbidden (403) - Check your API key permissions");
      } else {
        console.error("MapMyIndia request failed (key):", err?.response?.data || err?.message || err);
      }
      throw err;
    }
  }

  // Otherwise, use client credentials to obtain an access token and call the API.
  const token = await fetchAccessToken();
  const url = `https://apis.mapmyindia.com/advancedmaps/v1/${token}/route_adv/driving/${start};${end}?alternatives=true&steps=true`;

  try {
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    try {
      console.log('DEBUG mapmyindia (token) response keys:', res && res.data ? Object.keys(res.data) : typeof res);
      if (!res?.data?.routes) throw new Error("Unexpected response from MapMyIndia API");
      if (Array.isArray(res.data.routes)) console.log('DEBUG routes length (token):', res.data.routes.length);
    } catch (e) {
      console.error('DEBUG mapmyindia (token) inspect failed:', e, res && res.data);
      throw e;
    }
    return res.data.routes;
  } catch (err) {
    console.error("MapMyIndia request failed (token):", err?.response?.data || err?.message || err);
    throw err;
  }
}

// Backwards-compatible alias for other modules that import `getRoute`.
export const getRoute = getRoutes;

export default { getRoutes, getRoute };
