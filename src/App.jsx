import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import LoadingPage from "./pages/LoadingPage/LoadingPage.jsx";
import MainPage from "./pages/MainPage/MainPage.jsx";
import UpgradesPage from "./pages/UpgradesPage/UpgradesPage.jsx";
import ServicesPage from "./pages/ServicesPage/ServicesPage.jsx";
import TasksPage from "./pages/TasksPage/TasksPage.jsx"
import CharacterPage from "./pages/CharacterPage/CharacterPage.jsx"


function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  if (!isLoaded) {
    return <LoadingPage onLoaded={() => setIsLoaded(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/upgrades" element={<UpgradesPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/character" element={<CharacterPage />} />
    </Routes>
  );
}

export default App;