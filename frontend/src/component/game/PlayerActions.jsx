import React from "react";
import "./PlayerActions.css";
import Button from "../atoms/Button";

export default function PlayerActions(){
  return (
    <div className="actions-card">
      <h4>Действия игрока</h4>
      <div className="action-buttons">
        <Button variant="secondary">Действие 1</Button>
        <Button variant="secondary">Действие 2</Button>
      </div>
      <div className="score">Счёт: 0</div>
    </div>
  );
}
