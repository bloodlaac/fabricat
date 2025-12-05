import React, { useState } from "react";
import "./Card.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";
import WaitingRoom from "../lobby/WaitingRoom"; // путь к комнате ожидания

export default function JoinGameCard({ onClose }) {
  const [waiting, setWaiting] = useState(false);

  const handleJoin = () => {
    setWaiting(true); // переключаемся на комнату ожидания
  };

  // Если пользователь присоединился → показываем комнату ожидания
  if (waiting) {
    return <WaitingRoom onClose={onClose} />;
  }

  return (
    <div className="card-overlay">
      <div className="join-card">
        <button className="card-close" onClick={onClose}>✖</button>
        <h3 className="card-title">Вход в игру</h3>
        <div className="card-fields">
          <Input placeholder="Ключ лобби" className="pink-input" />
        </div>
        <Button className="card-btn" onClick={handleJoin}>
          Присоединиться
        </Button>
      </div>
    </div>
  );
}
