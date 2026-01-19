console.log("main.tsx: Execution starting...");
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("main.tsx: about to render...");
const rootElement = document.getElementById("root");
console.log("main.tsx: rootElement", rootElement);
if (rootElement) {
    createRoot(rootElement).render(<App />);
    console.log("main.tsx: render() called");
} else {
    console.error("main.tsx: root element not found!");
}
