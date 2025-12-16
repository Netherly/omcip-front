import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./styles/typography.css"
import "./styles/svg-optimization.css";
import { BrowserRouter } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";
import { TelegramProvider } from "./context/TelegramContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <TelegramProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </TelegramProvider>
  </BrowserRouter>
);