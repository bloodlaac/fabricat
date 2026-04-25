import React, { useState } from "react";
import { checkSessionExists } from "../../api/client";
import "./Card.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";

export default function JoinGameCard({ onClose, onStartGame, token }) {
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleJoin = async () => {
    if (!sessionCode.trim()) {
      setError("Введите код сессии");
      return;
    }
    setError("");
    setIsChecking(true);
    try {
      await checkSessionExists({ sessionCode: sessionCode.trim(), token });
      if (typeof onStartGame === "function") {
        onStartGame(sessionCode.trim());
      }
    } catch (err) {
      setError(err?.message || "Лобби с таким кодом не существует");
    } finally {
      setIsChecking(false);
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
        <Button className="card-btn" onClick={handleJoin} disabled={isChecking}>
          Присоединиться
        </Button>
      </div>
    </div>
  );
}
