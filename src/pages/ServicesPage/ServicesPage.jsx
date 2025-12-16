import React, { useState, useEffect } from "react";
import "./ServicesPage.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import ServiceCard from "./components/ServiceCard";
import { useGame } from "../../context/GameContext";
import * as API from "../../utils/api";

import Discount10 from "../../assets/images/services/discount-10.png";
import Discount20 from "../../assets/images/services/discount-20.png";
import Discount30 from "../../assets/images/services/discount-30.png";
import Cleaning from "../../assets/images/services/cleaning.png";
import Consultation from "../../assets/images/services/consultation.png";
import Implant from "../../assets/images/services/implant.png";
import Crown from "../../assets/images/services/crown.png";
import Scanner from "../../assets/images/services/scanner.png";
import Tomography from "../../assets/images/services/tomography.png";
import Certificate3000 from "../../assets/images/services/certificate-3000.png";
import Certificate5000 from "../../assets/images/services/certificate-5000.png";

const ServicesPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [cooldownStatus, setCooldownStatus] = useState({});
    
    // Маппинг названий картинок на импортированные SVG
    const imageMap = {
        'discount_10': Discount10,
        'discount-10': Discount10,
        'discount_20': Discount20,
        'discount-20': Discount20,
        'discount_30': Discount30,
        'discount-30': Discount30,
        'cleaning': Cleaning,
        'free_cleaning': Cleaning,
        'consultation': Consultation,
        'free_consultation': Consultation,
        'implant': Implant,
        'free_implant': Implant,
        'crown': Crown,
        'free_crown': Crown,
        'scanner': Scanner,
        'tomography': Tomography,
        'certificate_3000': Certificate3000,
        'certificate-3000': Certificate3000,
        'certificate_5000': Certificate5000,
        'certificate-5000': Certificate5000,
    };
    
    const { 
        coins, 
        addCoins, 
        background, 
        invitedFriendsCount,
        unlockedBackgrounds,
        canAccessService4,
        getService4LockReason,
        canAccessService3,
        getService3LockReason,
        purchaseService,
        // Новые свойства из GameContext
        services,
        userServices,
        loadingServices,
        loadUserServices,
        getServiceCooldown,
    } = useGame();

    // Заглушка услуг 3 и 4 если они не приходят с сервера
    const defaultServices = [
        {
            id: 1,
            title: "Скидка 10% на любую услугу клиники",
            image: Discount10,
            cost: 50000,
            cost_coins: "50000",
        },
        {
            id: 2,
            title: "Скидка 20% на любую услугу клиники",
            image: Discount20,
            cost: 250000,
            cost_coins: "250000",
        },
        {
            id: 3,
            title: "Скидка 30% на любую услугу клиники",
            image: Discount30,
            cost: 750000,
            cost_coins: "750000",
        },
        {
            id: 4,
            title: "Бесплатная чистка зубов",
            image: Cleaning,
            cost: 500000,
            cost_coins: "500000",
            requiresBackground: 2,
        },
        {
            id: 5,
            title: "Бесплатная консультация с врачом + снимки + план лечения",
            image: Consultation,
            cost: 50000,
            cost_coins: "50000",
        },
        {
            id: 6,
            title: "Имплант в подарок",
            image: Implant,
            cost: 5000000,
            cost_coins: "5000000",
        },
        {
            id: 7,
            title: "Коронка из диоксида циркония в подарок",
            image: Crown,
            cost: 5000000,
            cost_coins: "5000000",
        },
        {
            id: 8,
            title: "Обследование на внутриротовом сканере Sirona + стоматология",
            image: Scanner,
            cost: 50000,
            cost_coins: "50000",
        },
        {
            id: 9,
            title: "Компьютерная томография",
            image: Tomography,
            cost: 900000,
            cost_coins: "900000",
        },
        {
            id: 10,
            title: "Сертификат на 3000 рублей",
            image: Certificate3000,
            cost: 900000,
            cost_coins: "900000",
        },
        {
            id: 11,
            title: "Сертификат на 5000 рублей",
            image: Certificate5000,
            cost: 1600000,
            cost_coins: "1600000",
        },
    ];

    // Загружаем услуги с сервера при открытии страницы
    useEffect(() => {
        // Данные уже загружаются в GameContext при инициализации
        // Здесь ничего дополнительного не нужно
    }, []);

    // Загрузка данных происходит в GameContext, здесь используем только то что там загружено

    // Адаптируем данные сервисов из API к формату компонента
    const adaptServiceData = (service) => {
        // Парсим стоимость из cost_coins (приходит строкой)
        let cost = parseFloat(service.cost_coins);
        if (isNaN(cost)) {
            cost = parseFloat(service.cost);
        }
        if (isNaN(cost)) {
            cost = 0;
        }
        
        // Проверяем куплена ли услуга
        const isPurchased = Array.isArray(userServices) && 
            userServices.some(u => u.service_id === service.id);
        
        // Получаем картинку из маппинга или используем значение по умолчанию
        let image = service.image || service.icon || '';
        if (typeof image === 'string') {
            image = imageMap[image] || image; // Если это строка, пытаемся найти в маппинге
        }
        
        const adapted = {
            id: service.id,
            title: service.title || service.name || 'Unknown',
            image: image,
            cost: cost,
            description: service.description || '',
            discount_percent: service.discount_percent || 0,
            cooldown_days: service.cooldown_days || 0,
            isPurchased: isPurchased,
            requiresBackground: service.requiresBackground || service.requires_background || null,
            ...service // Сохраняем все остальные свойства на случай если они нужны
        };
        return adapted;
    };

    // Адаптируем список сервисов (используем заглушку если сервер не отправил)
    const listToUse = services && services.length > 0 ? services : defaultServices;
    const adaptedServices = listToUse.map(adaptServiceData);

    const handlePurchase = async (service) => {
        try {
            // Убеждаемся что cost это число
            const cost = Number(service.cost);
            if (isNaN(cost)) {
                console.error('Invalid service cost:', service.cost);
                setError('Ошибка: неправильная стоимость услуги');
                return;
            }
            
            // Используем функцию purchaseService из GameContext
            const success = await purchaseService(service.id, cost);
            
            if (success) {
                // Перезагружаем список покупленных услуг
                await loadUserServices();
            } else {
                setError('Не удалось купить услугу');
            }
        } catch (err) {
            console.error("Failed to purchase service:", err);
            setError(err.message);
        }
    };

    return (
        <div 
            className="services-page"
            style={{ backgroundImage: `url(${background})` }}
        >
            <Header />
            
            <main className="services-page__content">
                <div className="services-page__list">
                    {adaptedServices.map((service, index) => {
                        // Определяем заблокирована ли услуга
                        let isLocked = false;
                        let lockReason = null;
                        let requiresBackground = service.requiresBackground;
                        
                        // Скидка 30% - требует 30 друзей
                        if (service.id === '19a82336-1564-4080-abdd-069771d8417a') {
                            isLocked = !canAccessService3();
                        }
                        
                        // Бесплатная чистка зубов - требует Background 2
                        if (service.id === 'c51c9b1d-f4e3-4f6d-a5e1-7666706311f6') {
                            isLocked = !canAccessService4();
                            requiresBackground = 2;  // Явно указываем
                        }
                        
                        // Получаем информацию о cooldown для услуги
                        const cooldownInfo = getServiceCooldown ? getServiceCooldown(service.id) : null;
                        
                        return (
                            <ServiceCard
                                key={service.id}
                                service={service}
                                canAfford={coins >= (service.cost || 0) && !service.isPurchased && !isLocked && !loadingServices}
                                onPurchase={() => handlePurchase(service)}
                                invitedFriendsCount={invitedFriendsCount}
                                isLocked={isLocked}
                                lockReason={lockReason}
                                requiresBackground={requiresBackground}
                                unlockedBackgrounds={unlockedBackgrounds}
                                cooldownInfo={cooldownInfo}
                                isLoading={loadingServices}
                            />
                        );
                    })}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ServicesPage;