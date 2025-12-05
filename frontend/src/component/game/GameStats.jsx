import React from "react";
import "./GameStats.css";
import Card from "../ui/Card";

export default function GameStats(){
  return (
    <Card className="stats-card">
      <h4>Статистика</h4>
      <ul className="stats-list">
        <li>Игры: 12</li>
        <li>Победы: 7</li>
        <li>Лучший результат: 124</li>
      </ul>
    </Card>
  );
}
