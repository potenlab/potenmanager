
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Clear chunk reload flag on successful app load
  sessionStorage.removeItem("chunk_reload");

  createRoot(document.getElementById("root")!).render(<App />);
  