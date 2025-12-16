import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGame } from "../../context/GameContext";
import "./Footer.css";

import serviceImg from "../../assets/images/service.png";
import upgradeImg from "../../assets/images/upgrade.png";
import mainImg from "../../assets/images/main.svg";
import taskImg from "../../assets/images/task.png";
import characterImg from "../../assets/images/character.png";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    hasAvailableTasks,
    hasAvailableUpgrades,
    hasAvailableServices
  } = useGame();

  const menuItems = [
    { 
      id: "services", 
      label: "Услуги", 
      icon: serviceImg, 
      path: "/services",
      hasNotification: hasAvailableServices()
    },
    { 
      id: "upgrades", 
      label: "Апгрейды", 
      icon: upgradeImg, 
      path: "/upgrades",
      hasNotification: hasAvailableUpgrades()
    },
    { 
      id: "home", 
      label: "", 
      icon: mainImg, 
      path: "/",
      hasNotification: false
    },
    { 
      id: "tasks", 
      label: "Задания", 
      icon: taskImg, 
      path: "/tasks",
      hasNotification: hasAvailableTasks()
    },
    { 
      id: "character", 
      label: "Персонаж", 
      icon: characterImg, 
      path: "/character",
      hasNotification: false
    },
  ];

  return (
    <footer className="footer">
      <nav className="footer-nav">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              className={`footer-item ${isActive ? "footer-item-active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.hasNotification && !isActive && (
                <div className="footer-notification-dot"></div>
              )}
              <img
                src={item.icon}
                alt={item.label}
                className={`footer-icon ${isActive ? "footer-icon-active" : ""}`}
              />
              <span className="footer-label">{item?.label || ""}</span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
};

export default Footer;