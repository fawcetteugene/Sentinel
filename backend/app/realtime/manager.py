"""In-memory WebSocket broadcast manager."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

from app.schemas import OperationalEvent


@dataclass
class Broadcaster:
    connections: set[WebSocket] = field(default_factory=set)
    events: list[OperationalEvent] = field(default_factory=list)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, event: OperationalEvent) -> None:
        self.events.append(event)
        stale: list[WebSocket] = []
        for connection in list(self.connections):
            try:
                await connection.send_json(event.model_dump(mode="json"))
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)

    def publish(self, event_type: str, message: str, payload: dict[str, Any] | None = None) -> None:
        event = OperationalEvent(
            type=event_type,  # type: ignore[arg-type]
            message=message,
            payload=payload or {},
            created_at=datetime.now(timezone.utc),
        )
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(event))
        except RuntimeError:
            self.events.append(event)


broadcaster = Broadcaster()

