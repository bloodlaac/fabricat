import React from "react";
import "./GameSettings.css";
import Input from "../atoms/Input";
import Button from "../atoms/Button";

export default function GameSettings(){
  return (
    <div className="settings-card">
      <h4>Параметры игры</h4>
      <Input placeholder="Время (с)" />
      <Input placeholder="Макс. очков" />
      <Button>Сохранить</Button>
    </div>
  );
}
