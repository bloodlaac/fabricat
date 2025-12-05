import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AccountPage.css"; 
import CreateGameCard from "../ui/CreateGameCard";
import JoinGameCard from "../ui/JoinGameCard";
import StatsCard from "../ui/StatsCard"; // импортируем карточку статистики
import Rules from "../auth/Rules";
export default function AccountPage() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState(null); // null | "create" | "join" | "stats"
  const [showRules, setShowRules] = useState(false);
  const handleShowRules = () => {
    setShowRules(true);
  };
  const handleCloseRules = () => {
    setShowRules(false);
  };

  const handleLogout = () => {
    navigate("/"); // возврат на страницу авторизации
  };

  const handleRules = () => {
    alert("Справка — тут пока заглушка");
  };

  return (
    <div className="account-page">
      {/* Верхний бар */}
      <div className="account-header">
        <button className="logout-btn" onClick={handleLogout}>Выйти</button>

        <div 
          className="user-info" 
          onClick={() => setActiveCard("stats")} // открытие StatsCard
          style={{ cursor: "pointer" }}
        >
          <span className="user-nick">Никнейм</span>
          <div className="user-avatar">А</div>
        </div>
      </div>

      {/* Центральная часть с кнопками */}
      <div className="account-center">
        <button className="account-btn" onClick={() => setActiveCard("create")}>
          Создать
        </button>
        <button className="account-btn" onClick={() => setActiveCard("join")}>
          Присоеденится
        </button>
      </div>

      {/* Кнопка правил */}
      <div className="rules-link" onClick={handleShowRules}>
        Справка
      </div>
      {showRules && <Rules onClose={handleCloseRules} />}
      {/* Отображение карточек поверх страницы */}
      {activeCard === "create" && (
        <CreateGameCard onClose={() => setActiveCard(null)} />
      )}
      {activeCard === "join" && (
        <JoinGameCard onClose={() => setActiveCard(null)} />
      )}
      {activeCard === "stats" && (
        <StatsCard onClose={() => setActiveCard(null)} />
      )}
    </div>
  );
}
