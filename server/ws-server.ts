import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";
import { storage } from "./storage";
import { log } from "./utils";

interface ExtendedWebSocket extends WebSocket {
    isAlive: boolean;
    userId?: string;
    groupId?: string;
}

export function setupWebSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws: ExtendedWebSocket, req) => {
        ws.isAlive = true;

        // Heartbeat
        ws.on("pong", () => {
            ws.isAlive = true;
        });

        log(`[WS] New connection from ${req.socket.remoteAddress}`);

        ws.on("message", async (data) => {
            try {
                const message = JSON.parse(data.toString());

                // Handle different message types
                switch (message.type) {
                    case "auth":
                        // Simple token auth
                        if (message.token) {
                            const user = await storage.getUserByToken(message.token);
                            if (user) {
                                ws.userId = user.id;
                                log(`[WS] Authenticated user: ${user.username}`);
                            }
                        }
                        break;

                    case "join":
                        if (message.groupId) {
                            ws.groupId = message.groupId;
                            log(`[WS] User ${ws.userId || 'anon'} joined group: ${message.groupId}`);
                        }
                        break;

                    case "chat":
                        if (ws.userId && ws.groupId && message.content) {
                            // Save to DB
                            const savedMsg = await storage.createClashMessage(
                                ws.userId,
                                message.content,
                                ws.groupId
                            );

                            // Broadcast to group
                            broadcastToGroup(wss, ws.groupId, {
                                type: "message",
                                data: {
                                    ...savedMsg,
                                    user: await storage.getUser(ws.userId).then(u => ({
                                        username: u?.username,
                                        displayName: u?.displayName
                                    }))
                                }
                            });
                        }
                        break;

                    case "ping":
                        ws.send(JSON.stringify({ type: "pong" }));
                        break;
                }
            } catch (e) {
                console.error("[WS] Message error:", e);
            }
        });

        ws.on("close", () => {
            log(`[WS] Connection closed: ${ws.userId || 'anon'}`);
        });
    });

    // Heartbeat interval (30s)
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const extWs = ws as ExtendedWebSocket;
            if (extWs.isAlive === false) return ws.terminate();

            extWs.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
    });

    return wss;
}

function broadcastToGroup(wss: WebSocketServer, groupId: string, payload: any) {
    const message = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        const ws = client as ExtendedWebSocket;
        if (ws.readyState === WebSocket.OPEN && ws.groupId === groupId) {
            ws.send(message);
        }
    });
}
