import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/design-tokens.css";

import App from "./App";
import reportWebVitals from "./reportWebVitals";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration"; // ✅ Import service worker

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <App />
);

reportWebVitals();

// ✅ Daftarkan service worker supaya PWA bisa offline
serviceWorkerRegistration.register();
