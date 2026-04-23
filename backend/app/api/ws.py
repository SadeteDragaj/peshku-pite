"""WebSocket endpoint and connection manager for real-time order events."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    """Simple in-memory WebSocket fan-out (swap for Redis pub/sub in prod)."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.remove(ws)

    async def broadcast(self, message: dict) -> None:
        """Send *message* to every connected client."""
        for ws in list(self._connections):
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001 – client may have dropped
                self._connections.remove(ws)


manager = ConnectionManager()


@router.websocket("/orders")
async def orders_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Clients can send messages (e.g. ping), we just keep the loop alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
