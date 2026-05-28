import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

/**
 * Верхняя навигационная панель (Хедер).
 * 
 * @param {string} title — заголовок страницы
 * @param {boolean} showBack — показывать кнопку "Назад"
 */
const AppHeader = ({ 
  title = 'Quiz Patente', 
  showBack = false,
  onBackOverride = null 
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackOverride) {
      onBackOverride();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="app-header">
      <div className="container app-header__container">
        <div className="app-header__left">
          {showBack && (
            <button
              className="header-back-btn"
              onClick={handleBack}
              title="Назад"
            >
              <Icon name="arrow-left" size={22} />
            </button>
          )}
          <h1 className="app-header__title">
            {title}
          </h1>
        </div>

        <div className="header-actions">
          {/* Место для дополнительных кнопок, если понадобятся */}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
