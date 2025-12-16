import React from "react";
import "./UpgradeCard.css";
import { formatNumber } from "../../../utils/formatters";
import ToothCoinImg from "../../../assets/images/upgrades/tooth.svg";

const UpgradeCard = ({ upgrade, isPurchased, canAfford, onPurchase, isSpecial = false, isLocked = false, lockReason = null, hidePerTap = false }) => {
  return (
    <div className={`upgrade-card ${isSpecial ? "upgrade-card--special" : ""} ${isLocked ? "upgrade-card--locked" : ""}`}>
      <div className="upgrade-card__top">
        <div className="upgrade-card__image-wrapper">
          <img 
            src={upgrade.image} 
            alt={upgrade.name}
            className="upgrade-card__image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div class="upgrade-card__placeholder">🦷</div>';
            }}
          />
        </div>

        <div className="upgrade-card__info">
          <span className="upgrade-card__name">{upgrade.name}</span>
          {!hidePerTap && (
            <div className="upgrade-card__value">
              <span className="upgrade-card__label">1 тап:</span>
              <span className="upgrade-card__coins">{upgrade.perTap} зубкоина</span>
            </div>
          )}
        </div>

        {isSpecial && upgrade.bonus && (
            <div className="upgrade-card__bonus">
                <div className="upgrade-card__bonus-icon">
                    <img 
                        src={upgrade.bonusIcon} 
                        alt="Bonus"
                        onError={(e) => {
                            e.target.outerHTML = '<span style="font-size: 20px;">✓</span>';
                        }}
                    />
                </div>
                <span className="upgrade-card__bonus-text">{upgrade.bonus}</span>
            </div>
        )}
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
            {lockReason || "Купите предыдущий апгрейд"}
          </span>
        ) : (
          <>
            <img 
              src={ToothCoinImg} 
              alt="Coin" 
              className="upgrade-card__button-icon"
            />
            <span className="upgrade-card__button-text">
              {formatNumber(upgrade.cost)}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default UpgradeCard;