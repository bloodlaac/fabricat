import React, { useEffect, useState } from "react";
import "./StatsCard.css";
import { fetchRecentGames } from "../../api/client";

export default function StatsCard({ onClose, token }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Нужен вход в аккаунт");
      return;
    }
    setLoading(true);
    fetchRecentGames({ token })
      .then((data) => {
        setItems(data?.items || []);
        setError("");
      })
      .catch((err) => setError(err?.message || "Не удалось загрузить игры"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="card-overlay">
      <div className="stats-card">
        <button className="card-close" onClick={onClose}>✖</button>
        <h2 className="card-title">Статистика</h2>

        {loading && <div className="stats-table-container">Загружаем...</div>}
        {error && !loading && <div className="stats-table-container">{error}</div>}

        {!loading && !error && (
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Сессия</th>
                  <th>Капитал</th>
                  <th>Место</th>
                  <th>Банкрот</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4}>Пока нет сыгранных партий</td>
                  </tr>
                )}
                {items.map((row) => (
                  <tr key={row.session_code}>
                    <td>{row.session_code}</td>
                    <td>{row.capital}</td>
                    <td>{row.place}</td>
                    <td>{row.is_bankrupt ? "Да" : "Нет"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
