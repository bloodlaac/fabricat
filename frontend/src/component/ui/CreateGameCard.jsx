import React, { useState } from "react";
import "./Card.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";
import WaitingRoom from "../lobby/WaitingRoom"; // ← путь к комнате ожидания

export default function CreateGameCard({ onClose }) {
  const [waiting, setWaiting] = useState(false);

  // Когда пользователь нажимает "Создать"
  const handleCreate = () => {
    setWaiting(true); // переключаемся на комнату ожидания
  };

  // Если игра создана → показываем комнату ожидания
  if (waiting) {
    return <WaitingRoom onClose={onClose} />;
  }

  return (
    <div className="card-overlay">
      <div className="create-card">
        <button className="card-close" onClick={onClose}>✖</button>
        <h3 className="card-title">Создать игру</h3>

        <div className="card-fields">
          <Input placeholder="Ключ лобби" className="pink-input" />
          <Input placeholder="Время игры" className="pink-input" />
          <Input placeholder="Кол-во ходов" className="pink-input" />
        </div>

        <Button className="card-btn" onClick={handleCreate}>
          Создать
        </Button>
      </div>
    </div>
  );
}
