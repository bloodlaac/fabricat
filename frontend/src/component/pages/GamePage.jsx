import React, { useState } from "react";
import "./GamePage.css";
import ActionInfo from "../game/ActionInfo"; // путь к форме информации

export default function GamePage() {
  const COLS = 10;
  const ROWS = 9;
  const cells = Array.from({ length: COLS * ROWS });

  // состояние для отображения ActionInfo
  const [showActionInfo, setShowActionInfo] = useState(false);

  // текст для формы (можно динамически менять)
  const [actionText, setActionText] = useState("");

  const handleActionClick = (text) => {
    setActionText(text);       // задаём текст для подсказки
    setShowActionInfo(true);   // показываем форму
  };

  const handleCancel = () => setShowActionInfo(false);
  const handleAgree = () => setShowActionInfo(false);

  return (
    <div className="game-page">
      <div className="div1">
        <div
          className="grid-container"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {cells.map((_, index) => (
            <div key={index} className="grid-cell"></div>
          ))}
        </div>
      </div>

      <div className="div2">
        {/* Верх: аватар + никнейм */}
        <div className="user-info">
          <div className="nickname">Player123</div>
          <div className="avatar"></div>
        </div>

        {/* Счётчики */}
        <div className="stats">
          <div className="stat">СЧЕТ: 100</div>
          <div className="stat">ЕСМ: 50</div>
          <div className="stat">ЕГП: 30</div>
        </div>

        {/* Кнопки с круглыми изображениями */}
        <div className="action-buttons">
          <button
            className="circle-btn"
            onClick={() => handleActionClick("Действие 1")}
          ></button>
          <button
            className="circle-btn"
            onClick={() => handleActionClick("Действие 2")}
          ></button>
          <button
            className="circle-btn"
            onClick={() => handleActionClick("Действие 3")}
          ></button>
        </div>

        {/* Кнопка пропустить ход */}
        <button className="skip-btn">Пропустить ход</button>

        {/* Кнопка покинуть игру внизу */}
        <button className="leave-btn">Покинуть игру</button>
      </div>

      {/* Форма ActionInfo */}
      {showActionInfo && (
        <ActionInfo
          text={actionText}
          onCancel={handleCancel}
          onAgree={handleAgree}
        />
      )}
    </div>
  );
}
