import { useState } from "react";
import MapView from "./MapView";
import NavigationPanel from "./NavigationPanel";

export default function Dashboard() {
  const [pos, setPos] = useState(null);
  const [routes, setRoutes] = useState(null);

  return (
    <>
      <button onClick={() =>
        navigator.geolocation.getCurrentPosition(p =>
          setPos([p.coords.latitude, p.coords.longitude])
        )
      }>
        Detect Ambulance Location
      </button>

      <MapView ambulancePos={pos} routes={routes} setRoutes={setRoutes} />

      {routes && <NavigationPanel steps={routes.best_route.steps} />}
    </>
  );
}
