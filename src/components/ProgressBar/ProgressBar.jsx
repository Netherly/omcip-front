import React from "react";
import "./ProgressBar.css";
import ToothCoinImg from "../../assets/images/tooth_coin.svg";
import { formatNumber } from "../../utils/formatters";

const ProgressBar = ({ current, max, nextLevel }) => {
  const percentage = Math.min((current / max) * 100, 100);
  const coinsNeeded = max - current;

  return (
    <div className="progress-bar">
      <div 
        className="progress-bar__fill" 
        style={{ width: `${percentage}%` }}
      >
        <div className="progress-bar__shine"></div>
      </div>
      
      <div className="progress-bar__content">
        <div className="progress-bar__left">
          <img 
            src={ToothCoinImg} 
            alt="Coin" 
            className="progress-bar__coin-icon"
          />
          <span className="progress-bar__text">
            {formatNumber(coinsNeeded)} до повышения уровня
          </span>
        </div>
        
        <div className="progress-bar__right">
          <span className="progress-bar__level">ур.{nextLevel}</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;