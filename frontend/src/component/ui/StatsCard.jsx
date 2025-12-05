import React from "react";
import "./StatsCard.css";

export default function StatsCard({ onClose }) {
  const gamesData = [
    { game: "Игра 1", score: 120, esm: 50, egp: 30 },
    { game: "Игра 2", score: 200, esm: 70, egp: 40 },
    { game: "Игра 3", score: 150, esm: 60, egp: 35 },
    { game: "Игра 4", score: 180, esm: 65, egp: 45 },
    { game: "Игра 5", score: 210, esm: 80, egp: 50 },
    { game: "Игра 6", score: 190, esm: 72, egp: 42 },
    { game: "Игра 7", score: 160, esm: 55, egp: 38 },
    { game: "Игра 8", score: 175, esm: 68, egp: 44 },
  ];

  return (
    <div className="card-overlay">
      <div className="stats-card">
        <button className="card-close" onClick={onClose}>✖</button>
        <h2 className="card-title">Статистика</h2>

        <div className="stats-table-container">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Игры</th>
                <th>Счет</th>
                <th>ЕСМ</th>
                <th>ЕГП</th>
              </tr>
            </thead>
            <tbody>
              {gamesData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.game}</td>
                  <td>{row.score}</td>
                  <td>{row.esm}</td>
                  <td>{row.egp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
