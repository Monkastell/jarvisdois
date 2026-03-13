import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { jarvisBus } from "./core/jarvis/eventBus";
import {
  setJarvisFirestore,
  startJarvisOperationalLogging,
} from "./core/jarvis/jarvisLogger";
import { db } from "./services/firebase/config";
import App from "./App.jsx";
import "./styles/global.css";

jarvisBus.bindWindowBridge();
setJarvisFirestore(db);
startJarvisOperationalLogging();

jarvisBus.emit(
  "system_bootstrap",
  {
    message: "JarvisDois iniciado com Event Bus central",
  },
  {
    source: "system",
    module: "main",
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);