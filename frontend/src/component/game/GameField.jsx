import React from "react";
import "./GameField.css";
import Card from "../ui/Card";

export default function GameField(){
  return (
    <Card className="game-field">
      <h4>Поле игры</h4>
      <div className="board-placeholder">Здесь будет игровое поле (заглушка)</div>
    </Card>
  );
}
