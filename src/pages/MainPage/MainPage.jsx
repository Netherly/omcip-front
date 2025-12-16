import React from "react";
import { useNavigate } from "react-router-dom";
import "./MainPage.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import ProgressBar from "../../components/ProgressBar/ProgressBar";
import ToothClicker from "./components/ToothClicker";
import EnergyBar from "../../components/EnergyBar/EnergyBar";
import { useGame } from "../../context/GameContext";

const MainPage = () => {
  const navigate = useNavigate();
  const { energy, maxEnergy, background, expCurrent, expRequired, level } = useGame();

  return (
    <div 
      className="main-page" 
      style={{ backgroundImage: `url(${background})` }}
    >
      <Header />
      
      <div style={{ padding: "0 16px", marginBottom: "15px" }}>
        <ProgressBar 
          current={expCurrent} 
          max={expRequired} 
          nextLevel={level + 1}
        />
      </div>
      
      <main className="main-page-content">
        <div className="main-page-game-area">
          <div className="main-page-clicker-section">
            <ToothClicker />
            
            <div className="main-page-energy">
              <EnergyBar current={energy} max={maxEnergy} />
            </div>
          </div>

          <button 
            className="main-page-upgrade-button"
            onClick={() => navigate("/upgrades")}
          >
            <span className="main-page-upgrade-text">Апгрейды</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MainPage;