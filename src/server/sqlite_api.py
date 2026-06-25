from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "shop.db"
HOST = "127.0.0.1"
PORT = 8787


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return f"{salt}:{digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
      salt, expected = stored.split(":", 1)
    except ValueError:
      return False
    return password_hash(password, salt).split(":", 1)[1] == expected


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    columns = [row["name"] for row in connection.execute("PRAGMA table_info(game_save)").fetchall()]
    if columns and "user_id" not in columns:
        connection.execute("ALTER TABLE game_save RENAME TO game_save_legacy")
        connection.commit()
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS game_save (
          user_id INTEGER PRIMARY KEY,
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS supplier_stock (
          user_id INTEGER NOT NULL,
          supplier_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          stock INTEGER NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, supplier_id, product_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS trade_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          product_id TEXT NOT NULL,
          supplier_id TEXT,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total REAL NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    connection.commit()
    return connection


def user_payload(row: sqlite3.Row) -> dict[str, object]:
    return {"id": row["id"], "username": row["username"]}


def create_user(username: str, password: str) -> dict[str, object]:
    username = username.strip()
    if len(username) < 2:
        raise ValueError("用户名至少需要 2 个字符")
    if len(password) < 4:
        raise ValueError("密码至少需要 4 个字符")
    with connect() as connection:
        try:
            cursor = connection.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, password_hash(password)),
            )
            connection.commit()
        except sqlite3.IntegrityError as exc:
            raise ValueError("用户名已存在") from exc
        row = connection.execute("SELECT id, username FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return user_payload(row)


def login_user(username: str, password: str) -> dict[str, object]:
    with connect() as connection:
        row = connection.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username.strip(),)).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        raise ValueError("用户名或密码错误")
    return user_payload(row)


def load_state(user_id: int) -> object | None:
    with connect() as connection:
        row = connection.execute("SELECT state_json FROM game_save WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        return None
    return json.loads(row["state_json"])


def save_state(user_id: int, state: object) -> None:
    state_json = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO game_save (user_id, state_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
              state_json = excluded.state_json,
              updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, state_json),
        )
        connection.commit()


def load_supplier_stock(user_id: int) -> list[dict[str, object]]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT supplier_id, product_id, stock FROM supplier_stock WHERE user_id = ? ORDER BY supplier_id, product_id",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def save_supplier_stock(user_id: int, items: list[dict[str, object]]) -> None:
    with connect() as connection:
        for item in items:
            connection.execute(
                """
                INSERT INTO supplier_stock (user_id, supplier_id, product_id, stock, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, supplier_id, product_id) DO UPDATE SET
                  stock = excluded.stock,
                  updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, item["supplierId"], item["productId"], int(item["stock"])),
            )
        connection.commit()


def append_trade(user_id: int, trade: dict[str, object]) -> None:
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO trade_log (user_id, type, product_id, supplier_id, quantity, unit_price, total)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                trade["type"],
                trade["productId"],
                trade.get("supplierId"),
                int(trade["quantity"]),
                float(trade["unitPrice"]),
                float(trade["total"]),
            ),
        )
        connection.commit()


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict[str, object]:
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body or "{}")

    def query_user_id(self) -> int:
        query = parse_qs(urlparse(self.path).query)
        value = query.get("userId", ["1"])[0]
        return int(value)

    def do_OPTIONS(self) -> None:
        self.send_json(204, {})

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/save":
            self.send_json(200, {"state": load_state(self.query_user_id())})
            return
        if path == "/api/supplier-stock":
            self.send_json(200, {"items": load_supplier_stock(self.query_user_id())})
            return
        self.send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            payload = self.read_json()
            if path == "/api/register":
                self.send_json(200, {"user": create_user(str(payload.get("username", "")), str(payload.get("password", "")))})
                return
            if path == "/api/login":
                self.send_json(200, {"user": login_user(str(payload.get("username", "")), str(payload.get("password", "")))})
                return
            if path == "/api/trades":
                append_trade(self.query_user_id(), payload)
                self.send_json(200, {"ok": True})
                return
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return
        self.send_json(404, {"error": "not found"})

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        payload = self.read_json()
        user_id = self.query_user_id()
        if path == "/api/save":
            state = payload.get("state")
            if not isinstance(state, dict):
                self.send_json(400, {"error": "state must be an object"})
                return
            save_state(user_id, state)
            self.send_json(200, {"ok": True})
            return
        if path == "/api/supplier-stock":
            items = payload.get("items")
            if not isinstance(items, list):
                self.send_json(400, {"error": "items must be a list"})
                return
            save_supplier_stock(user_id, items)
            self.send_json(200, {"ok": True})
            return
        self.send_json(404, {"error": "not found"})


def main() -> None:
    connect().close()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"SQLite API listening on http://{HOST}:{PORT}; database={DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
