import React, { useMemo, useState } from "react";
import "./ChessBoard.css";

const PIECE_ORDER = ["r", "n", "b", "q", "k", "b", "n", "r"];

const PIECE_ICONS = {
  w: { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" },
  b: { p: "♟︎", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" },
};

const inBounds = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;

const createInitialBoard = () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  PIECE_ORDER.forEach((type, col) => {
    board[0][col] = { type, color: "b", hasMoved: false };
    board[7][col] = { type, color: "w", hasMoved: false };
  });

  for (let col = 0; col < 8; col += 1) {
    board[1][col] = { type: "p", color: "b", hasMoved: false };
    board[6][col] = { type: "p", color: "w", hasMoved: false };
  }

  return board;
};

const asSquare = (row, col) => `${String.fromCharCode(97 + col)}${8 - row}`;

const getLegalMoves = (board, row, col) => {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const { color, type } = piece;
  const opponent = color === "w" ? "b" : "w";

  const addMove = (r, c, capture = false) => {
    if (!inBounds(r, c)) return;
    const target = board[r][c];
    if (target) {
      if (target.color === opponent) {
        moves.push({ row: r, col: c, capture: true });
      }
      return;
    }
    if (!capture) {
      moves.push({ row: r, col: c, capture: false });
    }
  };

  const addSlidingMoves = (directions) => {
    directions.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ row: r, col: c, capture: false });
        } else {
          if (target.color === opponent) {
            moves.push({ row: r, col: c, capture: true });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    });
  };

  switch (type) {
    case "p": {
      const forward = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const oneStepRow = row + forward;
      const twoStepRow = row + 2 * forward;

      if (inBounds(oneStepRow, col) && !board[oneStepRow][col]) {
        moves.push({ row: oneStepRow, col, capture: false });
        if (row === startRow && !board[twoStepRow][col]) {
          moves.push({ row: twoStepRow, col, capture: false });
        }
      }

      const diagCols = [col - 1, col + 1];
      diagCols.forEach((c) => {
        const targetRow = row + forward;
        if (inBounds(targetRow, c) && board[targetRow][c]?.color === opponent) {
          moves.push({ row: targetRow, col: c, capture: true });
        }
      });
      break;
    }
    case "r":
      addSlidingMoves([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]);
      break;
    case "b":
      addSlidingMoves([
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]);
      break;
    case "q":
      addSlidingMoves([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]);
      break;
    case "n": {
      [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2],
      ].forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) return;
        const target = board[r][c];
        if (!target) {
          moves.push({ row: r, col: c, capture: false });
        } else if (target.color === opponent) {
          moves.push({ row: r, col: c, capture: true });
        }
      });
      break;
    }
    case "k":
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].forEach(([dr, dc]) => addMove(row + dr, col + dc, true));
      break;
    default:
      break;
  }

  return moves;
};

export default function ChessBoard() {
  const [board, setBoard] = useState(createInitialBoard);
  const [turn, setTurn] = useState("w");
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  const statusText = useMemo(
    () => (turn === "w" ? "Ход белых" : "Ход черных"),
    [turn],
  );

  const handleCellClick = (row, col) => {
    const targetMove = legalMoves.find((m) => m.row === row && m.col === col);

    if (selected && targetMove) {
      const nextBoard = board.map((r) => r.slice());
      const movingPiece = { ...board[selected.row][selected.col], hasMoved: true };

      nextBoard[selected.row][selected.col] = null;

      if (movingPiece.type === "p" && (row === 0 || row === 7)) {
        movingPiece.type = "q";
        movingPiece.promoted = true;
      }

      nextBoard[row][col] = movingPiece;

      setBoard(nextBoard);
      setTurn(turn === "w" ? "b" : "w");
      setSelected(null);
      setLegalMoves([]);
      setLastMove({ from: selected, to: { row, col } });
      return;
    }

    const piece = board[row][col];
    if (piece && piece.color === turn) {
      setSelected({ row, col });
      setLegalMoves(getLegalMoves(board, row, col));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const resetGame = () => {
    setBoard(createInitialBoard());
    setTurn("w");
    setSelected(null);
    setLegalMoves([]);
    setLastMove(null);
  };

  return (
    <div className="chess-shell">
      <div className="chess-top">
        <div className="chess-title">Мини-шахматы</div>
        <div className="chess-status">{statusText}</div>
        {lastMove && (
          <div className="chess-last-move">
            Последний ход: {asSquare(lastMove.from.row, lastMove.from.col)} →{" "}
            {asSquare(lastMove.to.row, lastMove.to.col)}
          </div>
        )}
      </div>

      <div className="chess-board">
        {board.map((rowArr, row) =>
          rowArr.map((piece, col) => {
            const isLight = (row + col) % 2 === 0;
            const isSelected = selected?.row === row && selected?.col === col;
            const move = legalMoves.find((m) => m.row === row && m.col === col);
            const isLast =
              lastMove &&
              ((lastMove.from.row === row && lastMove.from.col === col) ||
                (lastMove.to.row === row && lastMove.to.col === col));

            return (
              <button
                type="button"
                key={`${row}-${col}`}
                className={[
                  "chess-cell",
                  isLight ? "light" : "dark",
                  isSelected ? "selected" : "",
                  move ? "legal" : "",
                  move?.capture ? "capture" : "",
                  isLast ? "last-move" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleCellClick(row, col)}
              >
                {piece ? (
                  <span className={`piece ${piece.color === "w" ? "white" : "black"}`}>
                    {PIECE_ICONS[piece.color][piece.type]}
                  </span>
                ) : move ? (
                  <span className="move-dot" />
                ) : null}
              </button>
            );
          }),
        )}
      </div>

      <div className="chess-controls">
        <button type="button" onClick={resetGame}>
          Начать заново
        </button>
        <div className="chess-tip">Щелкни по фигуре своего цвета и укажи, куда ходить.</div>
      </div>
    </div>
  );
}
