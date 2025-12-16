import React, { useEffect, useState } from 'react';
import './ServicePurchaseToast.css';

const ServicePurchaseToast = ({ serviceName, cost, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Анимация появления
    setTimeout(() => setIsVisible(true), 10);

    // Автоматическое скрытие
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Даем время на анимацию исчезновения
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`service-purchase-toast ${isVisible ? 'visible' : ''}`}>
      <div className="toast-icon">✅</div>
      <div className="toast-content">
        <div className="toast-title">Услуга успешно куплена!</div>
        <div className="toast-service">{serviceName}</div>
        <div className="toast-cost">-{cost.toLocaleString('ru-RU')} монет</div>
      </div>
      <button className="toast-close" onClick={handleClose} aria-label="Закрыть">
        ✕
      </button>
    </div>
  );
};

export default ServicePurchaseToast;
