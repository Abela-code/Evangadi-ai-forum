import { MapPinned } from "lucide-react";
import styles from "./MapPage.module.css";
import ui from "../../styles/pageStates.module.css";

export default function MapPage() {
  return (
    <div className={ui.pageStack}>
      <section className={ui.pageHeading}>
        <div>
          <span className={ui.eyebrow}>Community Map</span>
          <h1>Map</h1>
          <p>Geographic question discovery can be added here.</p>
        </div>
      </section>

      <section className={`${ui.panel} ${styles.mapPlaceholder}`}>
        <MapPinned size={46} />
        <h2>Map data is not available from the backend yet</h2>
        <p>
          The current backend does not expose latitude/longitude or location
          endpoints. This page is included so the frontend architecture is
          complete without inventing unsupported API calls.
        </p>
      </section>
    </div>
  );
}
