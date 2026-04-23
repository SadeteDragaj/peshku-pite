/* Thin wrapper around the browser WebSocket API with auto-reconnect. */

type MessageHandler = (data: unknown) => void;

export function createOrderSocket(onMessage: MessageHandler) {
  let ws: WebSocket;

  function connect() {
    ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/orders`);
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = () => setTimeout(connect, 2000);
  }

  connect();

  return {
    send: (data: unknown) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(data)),
    close: () => ws.close(),
  };
}
