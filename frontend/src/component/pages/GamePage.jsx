import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./GamePage.css";
import { buildWsUrl } from "../../api/client";
import { loadAuth } from "../../state/auth";

const ACTIONS_BY_PHASE = {
  buy: ["submit_buy_bid", "skip"],
  production: ["production_plan", "skip"],
  sell: ["submit_sell_bid", "skip"],
  loans: ["loan_decision", "skip"],
  construction: ["construction_request", "skip"],
};

const initialActionState = {
  buyQty: 0,
  buyPrice: 0,
  sellQty: 0,
  sellPrice: 0,
  prodBasic: 0,
  prodAuto: 0,
  loanSlot: 0,
  loanDecision: "skip",
  construction: "idle",
};

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedSessionCode = location.state?.sessionCode ?? null;
  const [auth] = useState(() => loadAuth());
  const token = auth?.token?.access_token;
  const user = auth?.user;

  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [sessionCode, setSessionCode] = useState(requestedSessionCode || "");
  const [phase, setPhase] = useState(null);
  const [month, setMonth] = useState(null);
  const [tick, setTick] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [lastError, setLastError] = useState("");
  const [actionState, setActionState] = useState(initialActionState);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const ws = new WebSocket(buildWsUrl(token));
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      const joinPayload = {
        type: "join",
        session_code: requestedSessionCode || null,
      };
      ws.send(JSON.stringify(joinPayload));
    };

    ws.onclose = () => {
      setConnectionStatus("closed");
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch {
        setLastError("Не удалось прочитать сообщение от сервера");
      }
    };

    return () => {
      ws.close();
    };
  }, [navigate, requestedSessionCode, token]);

  const allowedActions = useMemo(
    () => ACTIONS_BY_PHASE[phase] || [],
    [phase],
  );

  const handleMessage = (data) => {
    switch (data.type) {
      case "welcome":
        setSessionCode(data.session_code);
        setPhase(data.phase);
        setMonth(data.month);
        setAnalytics(data.analytics);
        setConnectionStatus("ready");
        setLastError("");
        break;
      case "phase_tick":
        setTick(data.tick);
        setPhase(data.tick.phase);
        break;
      case "phase_report":
        setLastReport(data.report);
        setMonth(data.report.month);
        setPhase(data.report.phase);
        setAnalytics(data.report.analytics);
        setConnectionStatus("running");
        break;
      case "phase_status":
        setPhase(data.phase);
        setMonth(data.month);
        setAnalytics(data.analytics);
        setTick((prev) => ({ ...prev, remaining_seconds: data.remaining_seconds }));
        setConnectionStatus("running");
        break;
      case "action_ack":
        setLastError("");
        break;
      case "session_control_ack":
        setConnectionStatus(data.started ? "running" : "ready");
        break;
      case "error":
        setLastError(data.message || "Ошибка");
        break;
      default:
        break;
    }
  };

  const sendMessage = (payload) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError("Соединение с сервером не готово");
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const startSession = () => sendMessage({ type: "session_control", command: "start" });

  const sendBuy = () => {
    if (!phase || !allowedActions.includes("submit_buy_bid")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "submit_buy_bid",
        quantity: Number(actionState.buyQty) || 0,
        price: Number(actionState.buyPrice) || 0,
      },
    });
  };

  const sendSell = () => {
    if (!phase || !allowedActions.includes("submit_sell_bid")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "submit_sell_bid",
        quantity: Number(actionState.sellQty) || 0,
        price: Number(actionState.sellPrice) || 0,
      },
    });
  };

  const sendProductionPlan = () => {
    if (!phase || !allowedActions.includes("production_plan")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "production_plan",
        basic: Number(actionState.prodBasic) || 0,
        auto: Number(actionState.prodAuto) || 0,
      },
    });
  };

  const sendLoanDecision = () => {
    if (!phase || !allowedActions.includes("loan_decision")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "loan_decision",
        slot: Number(actionState.loanSlot) || 0,
        decision: actionState.loanDecision,
      },
    });
  };

  const sendConstructionRequest = () => {
    if (!phase || !allowedActions.includes("construction_request")) return;
    sendMessage({
      type: "phase_action",
      phase,
      payload: {
        kind: "construction_request",
        project: actionState.construction,
      },
    });
  };

  const handleLeave = () => {
    navigate("/account");
  };

  return (
    <div className="game-page">
      <div className="div1">
        <div className="grid-container">
          {Array.from({ length: 90 }).map((_, index) => (
            <div key={index} className="grid-cell"></div>
          ))}
        </div>
      </div>

      <div className="div2">
        <div className="top-row">
          <div className="user-info">
            <div className="nickname">{user?.nickname || "Игрок"}</div>
            <div className="avatar" title={user?.icon || ""}>{user?.icon?.[0]?.toUpperCase() || "?"}</div>
          </div>
          <div className="session-info">
            <div className="session-code">Код: {sessionCode || "—"}</div>
            <div className="session-status">
              Статус: {connectionStatus}
            </div>
          </div>
        </div>

        <div className="phase-block">
          <div>Месяц: {month ?? "—"}</div>
          <div>Фаза: {phase || "—"}</div>
          <div>Осталось: {tick?.remaining_seconds ?? "—"} сек</div>
        </div>

        {analytics && (
          <div className="analytics-block">
            <div className="analytics-title">Банк</div>
            <div className="bank-row">
              <div>Продажа сырья: {analytics.bank_raw_material_volume} ед. от {analytics.bank_raw_material_min_price?.toFixed?.(0) ?? analytics.bank_raw_material_min_price}</div>
              <div>Покупка товаров: {analytics.bank_finished_good_volume} ед. до {analytics.bank_finished_good_max_price?.toFixed?.(0) ?? analytics.bank_finished_good_max_price}</div>
            </div>

            <div className="analytics-title">Игроки</div>
            <div className="analytics-list">
              {analytics.players?.map((p) => (
                <div key={p.player_id} className="analytics-row">
                  <div>ID {p.player_id}</div>
                  <div>Деньги: {p.money}</div>
                  <div>Сырье: {p.raw_materials}</div>
                  <div>Товары: {p.finished_goods}</div>
                  <div>Фабрики: {p.factories}</div>
                  <div>Кредиты: {p.active_loans}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastReport && (
          <div className="report-block">
            <div className="analytics-title">Отчет</div>
            <div className="report-content">
              {lastReport.journal?.slice(-4).map((entry) => (
                <div key={entry.message + entry.phase + entry.month} className="report-row">
                  <span className="report-phase">{entry.phase}</span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="controls">
          <button
            className="control-btn"
            onClick={startSession}
            disabled={connectionStatus !== "ready"}
            style={{ visibility: connectionStatus === "ready" ? "visible" : "hidden" }}
          >
            Старт
          </button>
        </div>

        <div className="action-forms">
          <div className="action-card">
            <div className="action-title">Покупка (BUY)</div>
            <div className="action-row">
              <label>Кол-во</label>
              <input
                type="number"
                value={actionState.buyQty}
                onChange={(e) => setActionState({ ...actionState, buyQty: e.target.value })}
              />
              <label>Цена</label>
              <input
                type="number"
                value={actionState.buyPrice}
                onChange={(e) => setActionState({ ...actionState, buyPrice: e.target.value })}
              />
              <button onClick={sendBuy} disabled={!allowedActions.includes("submit_buy_bid")}>
                Отправить
              </button>
            </div>
          </div>

          <div className="action-card">
            <div className="action-title">Производство (PRODUCTION)</div>
            <div className="action-row">
              <label>Базовые</label>
              <input
                type="number"
                value={actionState.prodBasic}
                onChange={(e) => setActionState({ ...actionState, prodBasic: e.target.value })}
              />
              <label>Авто</label>
              <input
                type="number"
                value={actionState.prodAuto}
                onChange={(e) => setActionState({ ...actionState, prodAuto: e.target.value })}
              />
              <button onClick={sendProductionPlan} disabled={!allowedActions.includes("production_plan")}>
                Отправить
              </button>
            </div>
          </div>

          <div className="action-card">
            <div className="action-title">Продажа (SELL)</div>
            <div className="action-row">
              <label>Кол-во</label>
              <input
                type="number"
                value={actionState.sellQty}
                onChange={(e) => setActionState({ ...actionState, sellQty: e.target.value })}
              />
              <label>Цена</label>
              <input
                type="number"
                value={actionState.sellPrice}
                onChange={(e) => setActionState({ ...actionState, sellPrice: e.target.value })}
              />
              <button onClick={sendSell} disabled={!allowedActions.includes("submit_sell_bid")}>
                Отправить
              </button>
            </div>
          </div>

          <div className="action-card">
            <div className="action-title">Кредиты (LOANS)</div>
            <div className="loan-buttons">
              {analytics?.bank_loan_nominals?.map((amount, idx) => (
                <button
                  key={`loan-${idx}`}
                  className="loan-btn"
                  onClick={() =>
                    sendMessage({
                      type: "phase_action",
                      phase,
                      payload: { kind: "loan_decision", slot: idx, decision: "call" },
                    })
                  }
                  disabled={
                    !allowedActions.includes("loan_decision") ||
                    (analytics?.bank_available_loans?.[idx] ?? 0) <= 0
                  }
                  title={`Срок: ${analytics?.bank_loan_terms?.[idx] ?? "?"} мес.`}
                >
                  Взять ссуду {amount} ({analytics?.bank_available_loans?.[idx] ?? 0} доступно)
                </button>
              ))}
              <button
                className="loan-btn secondary"
                onClick={() =>
                  sendMessage({
                    type: "phase_action",
                    phase,
                    payload: { kind: "loan_decision", slot: 0, decision: "skip" },
                  })
                }
                disabled={!allowedActions.includes("loan_decision")}
              >
                Пропустить
              </button>
            </div>
          </div>

          <div className="action-card">
            <div className="action-title">Стройка (CONSTRUCTION)</div>
            <div className="action-row">
              <select
                value={actionState.construction}
                onChange={(e) => setActionState({ ...actionState, construction: e.target.value })}
              >
                <option value="idle">Ничего</option>
                <option value="build_basic">Строить базовые</option>
                <option value="build_auto">Строить автоматические</option>
                <option value="upgrade">Улучшить</option>
              </select>
              <button
                onClick={sendConstructionRequest}
                disabled={!allowedActions.includes("construction_request")}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>

        {lastError && <div className="error-banner">{lastError}</div>}

        <button className="leave-btn" onClick={handleLeave}>Покинуть игру</button>
      </div>
    </div>
  );
}
