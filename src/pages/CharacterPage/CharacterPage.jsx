import React from "react";
import { useNavigate } from "react-router-dom";
import "./CharacterPage.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { useGame } from "../../context/GameContext";

import InstagramIcon from "../../assets/images/socials/instagram.png";
import TelegramIcon from "../../assets/images/socials/telegram.png";
import VkIcon from "../../assets/images/socials/vk.png";

const CharacterPage = () => {
  const { background, character, inviteFriend } = useGame();
  const navigate = useNavigate();

  const socialLinks = [
    { 
      name: "Instagram", 
      icon: InstagramIcon, 
      url: "https://www.instagram.com/omcip_ekb?igsh=aGJ5eWV3dXgxd3lq" 
    },
    { 
      name: "Telegram", 
      icon: TelegramIcon,
      url: "https://t.me/omcip_stomatologia" 
    },
    { 
      name: "VK", 
      icon: VkIcon,
      url: "https://vk.com/omcip" 
    },
  ];

  // APNG всегда отображается как img
  const isVideo = character.endsWith('.webm') || character.endsWith('.mp4');

  const handleInviteFriend = () => {
    // Вызываем функцию приглашения друга
    if (inviteFriend) {
      inviteFriend();
    }
  };

return (
    <div
      className="character-page"
      style={{ backgroundImage: `url(${background})` }}
    >
      <Header />

      <main className="character-page__content">
        <div className="character-page__image-container">
          {isVideo ? (
            <video 
              src={character}
              className="character-page__image"
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <img 
              src={character} 
              alt="Character" 
              className="character-page__image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="character-page__shadow"></div>
        </div>

        <div className="character-page__bottom">
          <div className="character-page__socials">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="character-page__social-link"
              >
                <img 
                  src={social.icon} 
                  alt={social.name}
                  className="character-page__social-icon"
                />
              </a>
            ))}
          </div>

          <button 
            className="character-page__invite-button"
            onClick={handleInviteFriend}
          >
            <span className="character-page__invite-text">Пригласить друга</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CharacterPage;