import React, { useState, useEffect } from "react";
import "./ActiveBonusIndicator.css";

const ActiveBonusIndicator = ({ activeBonus }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!activeBonus || !activeBonus.expiresAt) return;

    const updateTimeLeft = () => {
      const now = Date.now();
      const diff = activeBonus.expiresAt - now;

      if (diff <= 0) {
        setTimeLeft("Истекло");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [activeBonus]);

  if (!activeBonus || activeBonus.type !== 'tap_multiplier') {
    return null;
  }

  return (
    <div className="active-bonus-indicator">
      <div className="active-bonus-indicator__icon">⚡</div>
      <div className="active-bonus-indicator__content">
        <span className="active-bonus-indicator__text">
          Бонус ×{activeBonus.multiplier} к тапам
        </span>
        <span className="active-bonus-indicator__timer">{timeLeft}</span>
      </div>
    </div>
  );
};

export default ActiveBonusIndicator;