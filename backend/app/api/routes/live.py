"""Live operations websocket route."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.realtime.manager import broadcaster

router = APIRouter(prefix="/ws", tags=["live"])


@router.websocket("/operations")
async def operations_socket(websocket: WebSocket) -> None:
    await broadcaster.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)

