import React from "react";
import "./Header.css";
import { useGame } from "../../context/GameContext";
import { useTelegram } from "../../context/TelegramContext";
import { formatNumber } from "../../utils/formatters";
import ProfilePlaceholder from "../../assets/images/profile-placeholder.png";
import ToothCoinImg from "../../assets/images/tooth_coin.svg";

const Header = () => {
  const { 
    coins, 
    level, 
    coinsPerClick,
    baseCoinsPerClick,
    totalCoinsPerHourValue,
    activeBonus,
    userProfile 
  } = useGame();
  
  const { user } = useTelegram();
  
  // Вычисляем финальный коин за клик с учётом мультиплаера бонуса
  // Если есть активный бонус с множителем (например x2), применяем его
  const multiplier = activeBonus?.multiplier || 1;
  const displayCoinsPerClick = Math.floor(baseCoinsPerClick * multiplier);
  
  // Используем данные из Telegram, если доступны
  const userName = user?.first_name || userProfile?.name || "Игрок";
  const userPhoto = user?.photo_url || userProfile?.photo || ProfilePlaceholder;

  return (
    <header className="header-container">
      <div className="header-top">
        <div className="header-profile">
          <div className="header-avatar">
            <img 
              src={userPhoto} 
              alt="Profile" 
              onError={(e) => {
                e.target.src = ProfilePlaceholder;
              }}
            />
          </div>
          <div className="header-user-info">
            <span className="header-username">{userName}</span>
            <span className="header-level">{level} уровень</span>
          </div>
        </div>

        <div className="header-stats">
          <div className="header-stat">
            <span className="header-stat-label">За клик:</span>
            <span className="header-stat-value">
              +{formatNumber(displayCoinsPerClick)}
              {multiplier > 1 && <span className="header-stat-multiplier">x{multiplier}</span>}
              <img src={ToothCoinImg} alt="tooth coin" className="tooth-coin-icon" />
              </span>
          </div>
          <div className="header-stat">
            <span className="header-stat-label">В час:</span>
            <span className="header-stat-value">
              +{formatNumber(totalCoinsPerHourValue)}
              <img src={ToothCoinImg} alt="tooth coin" className="tooth-coin-icon" />
              </span>
          </div>
        </div>
      </div>

      {/* Количество зубкоинов */}
      <div className="header-coins">
        <div className="header-coins-icon">
          <img src={ToothCoinImg} alt="tooth coin" className="tooth-coin-icon" />
        </div>
        <span className="header-coins-amount">{formatNumber(coins)}</span>
      </div>
    </header>
  );
};

export default Header;