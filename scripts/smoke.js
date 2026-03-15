const backend = process.env.BACKEND_URL || 'http://localhost:5000';

async function run() {
  try {
    console.log('Checking', `${backend}/hospitals`);
    const h = await fetch(`${backend}/hospitals`);
    if (!h.ok) throw new Error(`/hospitals failed ${h.status}`);
    console.log('/hospitals OK');

    console.log('Posting sample /route');
    const body = {
      ambulance_lat: 12.96,
      ambulance_lng: 77.58,
      hospital_lat: 12.97,
      hospital_lng: 77.59
    };

    const r = await fetch(`${backend}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`/route failed ${r.status} ${text}`);
    }

    const json = await r.json();
    console.log('Route response keys:', Object.keys(json));
    console.log('Smoke test passed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
}

run();
