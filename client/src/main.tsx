import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("App Version: 2025-11-30 17:40 - Force Update");

import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
