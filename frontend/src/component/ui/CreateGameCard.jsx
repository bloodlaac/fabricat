import React from "react";
import "./Card.css";
import Button from "../atoms/Button";

export default function CreateGameCard({ onClose, onStartGame }) {
  const handleCreate = () => {
    if (typeof onStartGame === "function") {
      onStartGame(null);
    }
  };

  return (
    <div className="card-overlay">
      <div className="create-card">
        <button className="card-close" onClick={onClose}>✖</button>
        <h3 className="card-title">Создать игру</h3>
        <p className="card-hint">
          Создастся новая сессия. Код лобби придёт сразу после подключения к серверу.
        </p>
        <Button className="card-btn" onClick={handleCreate}>
          Создать
        </Button>
      </div>
    </div>
  );
}
