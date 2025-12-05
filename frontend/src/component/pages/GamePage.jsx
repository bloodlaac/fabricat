import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./GamePage.css";
import { buildWsUrl, refreshToken } from "../../api/client";
import { loadAuth, saveAuth } from "../../state/auth";

const ACTIONS_BY_PHASE = {
  buy: ["submit_buy_bid", "skip"],
  production: ["production_plan", "skip"],
  sell: ["submit_sell_bid", "skip"],
  loans: ["loan_decision", "skip"],
  construction: ["construction_request", "skip"],
};

const PHASE_LABELS = {
  expenses: "Расходы",
  market: "Рынок",
  buy: "Покупка",
  production: "Производство",
  sell: "Продажа",
  loans: "Кредиты",
  construction: "Стройка",
  end_month: "Завершение месяца",
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
  const [auth, setAuth] = useState(() => loadAuth());
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
  const [playerCount, setPlayerCount] = useState(1);
  const [settings, setSettings] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const socketRef = useRef(null);
  const isRefreshingRef = useRef(false);

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

    ws.onclose = async (event) => {
      if (event.code === 1008 || event.code === 403 || event.code === 4401) {
        await attemptRefresh();
        return;
      }
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

  const attemptRefresh = async () => {
    if (isRefreshingRef.current || !token) return;
    isRefreshingRef.current = true;
    try {
      const newToken = await refreshToken({ token });
      const updatedAuth = { ...auth, token: newToken };
      saveAuth(updatedAuth);
      setAuth(updatedAuth);
    } catch (err) {
      navigate("/");
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const allowedActions = useMemo(
    () => ACTIONS_BY_PHASE[phase] || [],
    [phase],
  );

  const derivedStatus =
    connectionStatus === "ready" && playerCount < 2
      ? "waiting"
      : connectionStatus;

  const statusLabel = {
    connecting: "Подключаемся",
    connected: "Готово к входу",
    ready: "Готов",
    running: "Идет игра",
    waiting: "Ждем игроков",
    closed: "Закрыто",
    error: "Ошибка",
  }[derivedStatus] || derivedStatus;

  const updateSettings = () => {
    if (!settingsDraft) return;
    const payload = { ...settingsDraft };

    const normalizeRange = (value) => {
      if (Array.isArray(value)) return value.map((v) => Number(v) || 0);
      return [0, 0];
    };

    payload.bank_raw_material_sell_volume_range = normalizeRange(
      payload.bank_raw_material_sell_volume_range,
    );
    payload.bank_finished_good_buy_volume_range = normalizeRange(
      payload.bank_finished_good_buy_volume_range,
    );
    payload.bank_raw_material_sell_min_price_range = normalizeRange(
      payload.bank_raw_material_sell_min_price_range,
    );
    payload.bank_finished_good_buy_max_price_range = normalizeRange(
      payload.bank_finished_good_buy_max_price_range,
    );

    const normalizeList = (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((v) => Number(v.trim()))
            .filter((v) => !Number.isNaN(v))
        : value || [];

    payload.available_loans = normalizeList(payload.available_loans);
    payload.loan_terms_in_months = normalizeList(payload.loan_terms_in_months);

    sendMessage({
      type: "session_control",
      command: "update_settings",
      settings: payload,
    });
    setShowSettings(false);
  };

  const handleMessage = (data) => {
    switch (data.type) {
      case "welcome":
        setSessionCode(data.session_code);
        setPhase(data.phase);
        setMonth(data.month);
        setAnalytics(data.analytics);
        setPlayerCount(data.analytics?.players?.length || 1);
        setSettings(data.settings);
        setSettingsDraft(data.settings);
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
        setPlayerCount(data.analytics?.players?.length || playerCount);
        if (data.settings) {
          setSettings(data.settings);
          setSettingsDraft((prev) => prev || data.settings);
        }
        setConnectionStatus(
          data.remaining_seconds === undefined || data.remaining_seconds === null
            ? "ready"
            : "running",
        );
        break;
      case "action_ack":
        setLastError("");
        break;
      case "session_control_ack":
        setConnectionStatus(data.started ? "running" : "ready");
        break;
      case "error":
        setLastError(data.message || "Ошибка");
        if (data.message === "Invalid token") {
          attemptRefresh();
        }
        break;
      default:
        break;
    }
  };

  const sendMessage = (payload) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError("Соединение с сервером не готово");
      attemptRefresh();
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
              Статус: {statusLabel}
            </div>
          </div>
        </div>

        <div className="phase-block">
          <div>Месяц: {month ?? "—"}</div>
          <div>Фаза: {PHASE_LABELS[phase] || phase || "—"}</div>
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

        <div className="action-forms">
          <div className="action-card">
            <div className="action-title">Покупка</div>
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
            <div className="action-title">Производство</div>
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
            <div className="action-title">Продажа</div>
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
            <div className="action-title">Кредиты</div>
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
            <div className="action-title">Стройка</div>
            <div className="construction-row">
              {[
                { value: "build_basic", label: "Строить базовые" },
                { value: "build_auto", label: "Строить автоматические" },
                { value: "upgrade", label: "Улучшить" },
              ].map((opt) => (
                <label key={opt.value} className="radio-option">
                  <input
                    type="radio"
                    name="construction"
                    value={opt.value}
                    checked={actionState.construction === opt.value}
                    onChange={(e) =>
                      setActionState({ ...actionState, construction: e.target.value })
                    }
                    disabled={!allowedActions.includes("construction_request")}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
              <button
                className="loan-btn"
                onClick={sendConstructionRequest}
                disabled={!allowedActions.includes("construction_request")}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>

        {lastError && <div className="error-banner">{lastError}</div>}

        <div className="footer-controls">
          <button
            className="control-btn"
            onClick={() => setShowSettings(true)}
            disabled={connectionStatus !== "ready" || playerCount < 2}
            style={{
              visibility:
                connectionStatus === "ready" && playerCount >= 2 ? "visible" : "hidden",
            }}
          >
            Настройки
          </button>
          <button
            className="control-btn"
            onClick={startSession}
            disabled={connectionStatus !== "ready" || playerCount < 2}
            style={{
              visibility:
                connectionStatus === "ready" && playerCount >= 2 ? "visible" : "hidden",
            }}
          >
            Старт
          </button>
          <button className="leave-btn" onClick={handleLeave}>Покинуть игру</button>
        </div>

        {showSettings && settingsDraft && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Настройки лобби</div>
                <button className="card-close" onClick={() => setShowSettings(false)}>✖</button>
              </div>
              <div className="settings-grid">
                <label className="setting-field">
                  <span>Фабрик на старте</span>
                  <input
                    type="number"
                    value={settingsDraft.start_factory_count ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, start_factory_count: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. месяцев</span>
                  <input
                    type="number"
                    value={settingsDraft.max_months ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, max_months: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. фабрик</span>
                  <input
                    type="number"
                    value={settingsDraft.max_factories ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, max_factories: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Деньги банка на старте</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_start_money ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, bank_start_money: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Ссуды (через запятую)</span>
                  <input
                    type="text"
                    value={
                      Array.isArray(settingsDraft.available_loans)
                        ? settingsDraft.available_loans.join(", ")
                        : settingsDraft.available_loans ?? ""
                    }
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, available_loans: e.target.value })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Сроки ссуд (мес, через запятую)</span>
                  <input
                    type="text"
                    value={
                      Array.isArray(settingsDraft.loan_terms_in_months)
                        ? settingsDraft.loan_terms_in_months.join(", ")
                        : settingsDraft.loan_terms_in_months ?? ""
                    }
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, loan_terms_in_months: e.target.value })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем продажи сырья (min)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_volume_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_volume_range: [
                          Number(e.target.value),
                          settingsDraft.bank_raw_material_sell_volume_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем продажи сырья (max)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_volume_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_volume_range: [
                          settingsDraft.bank_raw_material_sell_volume_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем покупки товаров (min)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_volume_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_volume_range: [
                          Number(e.target.value),
                          settingsDraft.bank_finished_good_buy_volume_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Объем покупки товаров (max)</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_volume_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_volume_range: [
                          settingsDraft.bank_finished_good_buy_volume_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Мин. цена сырья</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_min_price_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_min_price_range: [
                          Number(e.target.value),
                          settingsDraft.bank_raw_material_sell_min_price_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. цена сырья</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_raw_material_sell_min_price_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_raw_material_sell_min_price_range: [
                          settingsDraft.bank_raw_material_sell_min_price_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Мин. цена покупки товара</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_max_price_range?.[0] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_max_price_range: [
                          Number(e.target.value),
                          settingsDraft.bank_finished_good_buy_max_price_range?.[1] ?? 0,
                        ],
                      })
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Макс. цена покупки товара</span>
                  <input
                    type="number"
                    value={settingsDraft.bank_finished_good_buy_max_price_range?.[1] ?? ""}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        bank_finished_good_buy_max_price_range: [
                          settingsDraft.bank_finished_good_buy_max_price_range?.[0] ?? 0,
                          Number(e.target.value),
                        ],
                      })
                    }
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button className="leave-btn" onClick={() => setShowSettings(false)}>Отмена</button>
                <button className="control-btn" onClick={updateSettings}>Сохранить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
