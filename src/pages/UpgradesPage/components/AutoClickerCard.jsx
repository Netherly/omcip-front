import React from "react";
import "./UpgradeCard.css";
import { formatNumber } from "../../../utils/formatters";
import ToothCoinImg from "../../../assets/images/upgrades/tooth.svg";
import assistantImg from "../../../assets/images/upgrades/assistant.svg";

const AutoClickerCard = ({ 
  config, 
  isPurchased, 
  canAfford, 
  onPurchase,
  isSpecial = false,
  isLocked = false,
  lockReason = null
}) => {
  // Определяем изображение - используем assistant для уровня 5, остальное не используется
  // (автокликеры используют текст, а не изображение)
  const imageToUse = isSpecial ? assistantImg : assistantImg;
  
  return (
    <div className={`upgrade-card ${isSpecial ? "upgrade-card--special" : ""} ${isLocked ? "upgrade-card--locked" : ""}`}>
      {/* Верхний ярус */}
      <div className="upgrade-card__top">
        <div className="upgrade-card__image-wrapper">
          <img 
            src={imageToUse} 
            className="upgrade-card__image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div class="upgrade-card__placeholder">🦷</div>';
            }}
          />
        </div>

        <div className="upgrade-card__info">
          <span className="upgrade-card__name">{config.name}</span>
          <div className="upgrade-card__value">
            <span className="upgrade-card__label">в час:</span>
            <span className="upgrade-card__coins">{formatNumber(config.coinsPerHour)} зубкоинов</span>
          </div>
        </div>
      </div>

      <button 
        className={`upgrade-card__button ${
          isPurchased 
            ? "upgrade-card__button--purchased" 
            : isLocked
              ? "upgrade-card__button--locked"
              : !canAfford 
                ? "upgrade-card__button--disabled" 
                : ""
        }`}
        onClick={onPurchase}
        disabled={isPurchased || !canAfford || isLocked}
      >
        {isPurchased ? (
          <span className="upgrade-card__button-text">Куплено</span>
        ) : isLocked ? (
          <span className="upgrade-card__button-text">
            {lockReason || "Купите предыдущий уровень"}
          </span>
        ) : (
          <>
            <img 
              src={ToothCoinImg} 
              alt="Coin" 
              className="upgrade-card__button-icon"
            />
            <span className="upgrade-card__button-text">
              {formatNumber(config.cost)}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default AutoClickerCard;