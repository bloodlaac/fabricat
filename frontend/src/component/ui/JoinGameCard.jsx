import React, { useState } from "react";
import "./Card.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";

export default function JoinGameCard({ onClose, onStartGame }) {
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");

  const handleJoin = () => {
    if (!sessionCode.trim()) {
      setError("Введите код сессии");
      return;
    }
    setError("");
    if (typeof onStartGame === "function") {
      onStartGame(sessionCode.trim());
    }
  };

  return (
    <div className="card-overlay">
      <div className="join-card">
        <button className="card-close" onClick={onClose}>✖</button>
        <h3 className="card-title">Вход в игру</h3>
        <div className="card-fields">
          <Input
            placeholder="Код лобби"
            className="pink-input"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
          />
        </div>
        {error && <div className="card-error">{error}</div>}
        <Button className="card-btn" onClick={handleJoin}>
          Присоединиться
        </Button>
      </div>
    </div>
  );
}
