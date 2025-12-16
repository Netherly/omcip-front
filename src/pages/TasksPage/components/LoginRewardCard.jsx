import React from "react";
import "./LoginRewardCard.css";
import ToothCoinImg from "../../../assets/images/upgrades/tooth.svg";

const LoginRewardCard = ({ reward, canClaim, isClaimed, onClaim, isLoading = false }) => {
  return (
    <div className={`login-reward-card ${isClaimed ? "login-reward-card--claimed" : ""} ${!canClaim && !isClaimed ? "login-reward-card--locked" : ""}`}>
      <div className="login-reward-card__left">
        <div className={`login-reward-card__day-box ${canClaim && !isClaimed ? "login-reward-card__day-box--active" : ""} ${isClaimed ? "login-reward-card__day-box--claimed" : ""}`}>
          <span className="login-reward-card__day-text">
            {isClaimed ? "✓" : `День ${reward.day}`}
          </span>
        </div>
      </div>

      <div className="login-reward-card__right">
        <span className="login-reward-card__title">{reward.title}</span>
        <span className="login-reward-card__description">{reward.description}</span>

        {canClaim && !isClaimed ? (
          <button 
            className="login-reward-card__button login-reward-card__button--can-claim"
            onClick={onClaim}
            disabled={isLoading}
          >
            <img 
              src={ToothCoinImg} 
              alt="Coin" 
              className="login-reward-card__button-icon"
            />
            <span className="login-reward-card__button-text">{isLoading ? "Загрузка..." : "Забрать"}</span>
          </button>
        ) : isClaimed ? (
          <button 
            className="login-reward-card__button login-reward-card__button--claimed"
            disabled
          >
            <span className="login-reward-card__button-text">Получено</span>
          </button>
        ) : (
          <button 
            className="login-reward-card__button login-reward-card__button--locked"
            disabled
          >
            <span className="login-reward-card__button-text">Недоступно</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginRewardCard;