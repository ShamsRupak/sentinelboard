"""Tests for ConnectionManager in app.websocket."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.websocket import ConnectionManager


def make_ws(fail_on_send: bool = False) -> MagicMock:
    """Return a mock WebSocket."""
    ws = MagicMock()
    ws.accept = AsyncMock()
    if fail_on_send:
        ws.send_text = AsyncMock(side_effect=RuntimeError("disconnected"))
    else:
        ws.send_text = AsyncMock()
    return ws


class TestConnectionManager:
    @pytest.fixture
    def manager(self) -> ConnectionManager:
        return ConnectionManager()

    async def test_connect_adds_to_active_connections(self, manager: ConnectionManager) -> None:
        ws = make_ws()
        await manager.connect(ws)
        assert ws in manager.active_connections

    async def test_connect_calls_accept(self, manager: ConnectionManager) -> None:
        ws = make_ws()
        await manager.connect(ws)
        ws.accept.assert_awaited_once()

    async def test_disconnect_removes_from_active_connections(self, manager: ConnectionManager) -> None:
        ws = make_ws()
        await manager.connect(ws)
        await manager.disconnect(ws)
        assert ws not in manager.active_connections

    async def test_disconnect_unknown_ws_is_safe(self, manager: ConnectionManager) -> None:
        ws = make_ws()
        # Never connected — should not raise
        await manager.disconnect(ws)
        assert len(manager.active_connections) == 0

    async def test_broadcast_sends_to_all_clients(self, manager: ConnectionManager) -> None:
        ws1, ws2 = make_ws(), make_ws()
        await manager.connect(ws1)
        await manager.connect(ws2)
        payload = {"type": "prediction", "data": {"value": 1}}
        await manager.broadcast(payload)
        expected = json.dumps(payload)
        ws1.send_text.assert_awaited_once_with(expected)
        ws2.send_text.assert_awaited_once_with(expected)

    async def test_broadcast_removes_disconnected_client(self, manager: ConnectionManager) -> None:
        good = make_ws()
        bad = make_ws(fail_on_send=True)
        await manager.connect(good)
        await manager.connect(bad)
        await manager.broadcast({"type": "ping"})
        assert bad not in manager.active_connections
        assert good in manager.active_connections

    async def test_concurrent_connections_tracked_correctly(self, manager: ConnectionManager) -> None:
        clients = [make_ws() for _ in range(5)]
        for ws in clients:
            await manager.connect(ws)
        assert len(manager.active_connections) == 5

        await manager.disconnect(clients[2])
        assert len(manager.active_connections) == 4
        assert clients[2] not in manager.active_connections
