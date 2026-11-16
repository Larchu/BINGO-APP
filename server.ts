if (!process.env.WS_NO_BUFFER_UTIL) process.env.WS_NO_BUFFER_UTIL = '1';
if (!process.env.WS_NO_UTF_8_VALIDATE) process.env.WS_NO_UTF_8_VALIDATE = '1';

import http from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import {
  broadcastModeratorEvent,
  cancelCaptureWindow,
  getFullState,
  getPublicDisplayState,
  pushLiveAudioChunk,
  registerClient,
  startCaptureWindow,
  startLiveSpeech,
  stopCaptureWindow,
  stopLiveSpeech,
  unregisterClient,
  verifyModeratorCode,
} from './lib/server-store';
import { DeviceRole } from './lib/types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Ensure initial state is loaded on boot
  const bootState = getFullState();
  console.log(
    `[World Family Bingo] Ready on http://localhost:${port} | Session: ${bootState.sessionId} | Pair Code: ${bootState.pairCode}`
  );

  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(request.url || '/', `http://localhost:${port}`);
    if (reqUrl.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const roleParam = reqUrl.searchParams.get('role') || 'display';
    const role: DeviceRole =
      roleParam === 'moderator' || roleParam === 'laptop-bridge'
        ? roleParam
        : 'display';
    const pairCode = reqUrl.searchParams.get('pairCode');
    const deviceId =
      reqUrl.searchParams.get('deviceId') ||
      `dev-${Math.random().toString(36).slice(2, 8)}`;
    const deviceName = reqUrl.searchParams.get('deviceName') || role;

    if (role !== 'display' && !verifyModeratorCode(pairCode)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      const clientId = `${role}-${deviceId}-${Math.random().toString(36).slice(2, 7)}`;

      registerClient({
        clientId,
        role,
        deviceId,
        deviceName,
        send: (payload: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        },
      });

      const currentState = getFullState();
      ws.send(
        JSON.stringify({
          type: 'state:sync',
          state:
            role === 'display'
              ? getPublicDisplayState(currentState)
              : currentState,
        })
      );

      ws.on('message', async (raw) => {
        // Audience Display is strictly read-only
        if (role === 'display') return;

        try {
          const msg = JSON.parse(raw.toString()) as {
            type?: string;
            level?: number;
            captureId?: string;
            audio?: string;
          };

          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
            return;
          }

          if (msg.type === 'live:audio' && typeof msg.audio === 'string') {
            pushLiveAudioChunk(msg.audio, msg.level);
            return;
          }

          if (msg.type === 'live:start') {
            const res = await startLiveSpeech({
              requestedByDeviceId: deviceId,
              clientId,
            });
            if (!res.ok) {
              ws.send(
                JSON.stringify({
                  type: 'live:error',
                  errorCode: res.errorCode,
                  errorMessage: res.errorMessage,
                })
              );
            }
            return;
          }

          if (msg.type === 'live:stop') {
            stopLiveSpeech(true);
            return;
          }

          if (msg.type === 'capture:level' && typeof msg.level === 'number') {
            broadcastModeratorEvent({
              type: 'capture:level',
              captureId: msg.captureId,
              level: Math.max(0, Math.min(100, Math.round(msg.level))),
            });
            return;
          }

          if (msg.type === 'capture:start') {
            const res = startCaptureWindow({ requestedByDeviceId: deviceId });
            if (!res.ok) {
              ws.send(
                JSON.stringify({
                  type: 'capture:error',
                  errorCode: res.error,
                })
              );
            }
            return;
          }

          if (msg.type === 'capture:stop' && msg.captureId) {
            stopCaptureWindow(msg.captureId);
            return;
          }

          if (msg.type === 'capture:cancel') {
            cancelCaptureWindow(msg.captureId);
          }
        } catch {
          // Ignore malformed JSON frames
        }
      });

      ws.on('close', () => {
        unregisterClient(clientId);
      });

      ws.on('error', () => {
        unregisterClient(clientId);
      });
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> World Family Bingo listening on http://${hostname}:${port}`);
  });
});
