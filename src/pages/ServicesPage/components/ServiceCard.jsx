import React, { useState, useEffect } from "react";
import "./ServiceCard.css";
import { formatNumber } from "../../../utils/formatters";
import ToothCoinImg from "../../../assets/images/upgrades/tooth.svg";

const ServiceCard = ({ 
  service, 
  canAfford, 
  onPurchase, 
  invitedFriendsCount = 0, 
  isLocked = false, 
  requiresBackground, 
  unlockedBackgrounds, 
  lockReason = null,
  cooldownInfo = null,
  isLoading = false
}) => {
  const [remainingTime, setRemainingTime] = useState(null);
  const isBackgroundLocked = requiresBackground && !unlockedBackgrounds?.has(requiresBackground);
  const showLock = isLocked || isBackgroundLocked;
  const isOnCooldown = cooldownInfo?.isOnCooldown || false;
  
  // Обновляем таймер каждую секунду
  useEffect(() => {
    if (!isOnCooldown || !cooldownInfo?.remainingTime) {
      setRemainingTime(null);
      return;
    }
    
    setRemainingTime(cooldownInfo.remainingTime);
    
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (!prev || prev <= 1000) {
          clearInterval(interval);
          return null;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOnCooldown, cooldownInfo]);
  
  const formatCooldownTime = (ms) => {
    if (!ms) return '';
    
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}д ${hours}ч ${minutes}м`;
    } else if (hours > 0) {
      return `${hours}ч ${minutes}м ${seconds}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    } else {
      return `${seconds}с`;
    }
  };
  
  return (
    <div className="service-card">
      <div className="service-card__image-wrapper">
        <img 
          src={service.image} 
          alt={service.title}
          className="service-card__image"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<div class="service-card__placeholder">🎁</div>';
          }}
        />
      </div>

      <div className="service-card__content-wrapper">
        <div className={`service-card__content ${showLock ? 'service-card__content--blurred' : ''}`}>
          <p className="service-card__description">
            {service.title}
          </p>

          <button 
            className={`service-card__button ${(!canAfford || showLock || isOnCooldown || isLoading) ? "service-card__button--disabled" : ""}`}
            onClick={onPurchase}
            disabled={!canAfford || showLock || isOnCooldown || isLoading}
          >
            {isLoading ? (
              <span className="service-card__button-text">Загрузка...</span>
            ) : isOnCooldown && remainingTime ? (
              <span className="service-card__button-text service-card__button-cooldown">
                ⏱ {formatCooldownTime(remainingTime)}
              </span>
            ) : (
              <>
                <img 
                  src={ToothCoinImg} 
                  alt="Coin" 
                  className="service-card__button-icon"
                />
                <span className="service-card__button-text">
                  {formatNumber(service.cost)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {showLock && (
        <div className="service-card__lock-overlay">
          <span className="service-card__lock-text">
            {isBackgroundLocked ? (
              `Требуется Фон ${requiresBackground}`
            ) : isLocked ? (
              <>
                Пригласи друзей: <span className="service-card__lock-count">{invitedFriendsCount}</span> из 30
              </>
            ) : null}
          </span>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;