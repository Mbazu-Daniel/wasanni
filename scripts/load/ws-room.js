import { check } from "k6";
import { Trend, Rate } from "k6/metrics";
import ws from "k6/ws";

const messageLatency = new Trend("ws_message_latency_ms");
const connectFailures = new Rate("ws_connect_failures");

export const options = {
  scenarios: {
    rooms: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "60s", target: 500 },
        { duration: "60s", target: 1000 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    ws_message_latency_ms: ["p(99)<50"],
    ws_connect_failures: ["rate<0.01"],
  },
};

const BASE = __ENV.REALTIME_URL;
const TOKENS = JSON.parse(open("./tokens.txt"));

export default function () {
  const session = TOKENS[__VU % TOKENS.length];
  const url = `${BASE}/rt/${session.sessionId}?token=${session.sessionToken}`;

  const res = ws.connect(url, {}, (socket) => {
    socket.on("open", () => {
      for (let i = 1; i <= 20; i += 1) {
        const sentAt = Date.now();
        socket.send(
          JSON.stringify({ type: "event", seq: i, eventType: "tick", at: sentAt, data: { i } }),
        );
        socket.setTimeout(() => {
          messageLatency.add(Date.now() - sentAt);
        }, 10);
      }
      socket.setTimeout(() => socket.close(), 5000);
    });

    socket.on("error", () => connectFailures.add(1));
  });

  check(res, { upgraded: (response) => response !== null && response.status === 101 });
}
