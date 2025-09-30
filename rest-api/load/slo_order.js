import http from "k6/http";
import { check, sleep } from "k6";

// ---------- SLO Thresholds ----------
export let options = {
  thresholds: {
    http_req_duration: [
      "p(95)<500",   // 95% of requests must finish < 500ms
      "p(99)<1000",  // 99% must finish < 1s
    ],
    http_req_failed: ["rate<0.01"],   // <1% errors allowed
  },

  scenarios: {
    // ---------- 1. Steady Load ----------
    steady_load: {
      executor: "constant-arrival-rate",
      rate: 100,               // 100 requests per 10 second
      timeUnit: "10s",
      duration: "1m",          // run for 5 minutes
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: "ordersRequest",
    },

    // // ---------- 2. Ramping Load ----------
    // ramping_load: {
    //   executor: "ramping-arrival-rate",
    //   startRate: 50,
    //   timeUnit: "1s",
    //   preAllocatedVUs: 50,
    //   maxVUs: 500,
    //   stages: [
    //     { target: 50, duration: "2m" },   // start low
    //     { target: 200, duration: "2m" },  // medium load
    //     { target: 400, duration: "2m" },  // heavy load
    //     { target: 100, duration: "2m" },  // cooldown
    //   ],
    //   exec: "ordersRequest",
    // },

    // // ---------- 3. Spike Load ----------
    // spike_load: {
    //   executor: "ramping-arrival-rate",
    //   startRate: 50,
    //   timeUnit: "1s",
    //   preAllocatedVUs: 100,
    //   maxVUs: 600,
    //   stages: [
    //     { target: 50, duration: "30s" },   // warm up
    //     { target: 500, duration: "10s" },  // sudden spike
    //     { target: 50, duration: "1m" },    // cooldown & recovery
    //   ],
    //   exec: "ordersRequest",
    // },
  },  
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// ---------- Test Function ----------
export function ordersRequest() {
  let res = http.get(`${BASE_URL}/orders`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time OK": (r) => r.timings.duration < 1000,
  });

  sleep(Math.random() * 0.5); // small jitter to simulate real users
}
