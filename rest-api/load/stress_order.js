import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  discardResponseBodies: true,

  scenarios: {
    stress_orders: {
      executor: "ramping-arrival-rate",
      startRate: 50,
      timeUnit: "1s",
      preAllocatedVUs: 500, // more VUs to support higher load
      maxVUs: 7000,          // cap VUs at 7000
      stages: [
        { target: 500, duration: "30s" },    // ramp gently
        { target: 1500, duration: "30s" },
        { target: 3000, duration: "30s" },
        { target: 5000, duration: "30s" },
        { target: 7000, duration: "30s" },   // max load
      ],
      exec: "ordersLoad",
    },
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080/api";

export function ordersLoad() {
  const res = http.get(`${BASE_URL}/orders`);
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(0.1);
}
