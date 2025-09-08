import { check, sleep } from "k6";
import http from "k6/http";

export let options = {
  scenarios: {
    // ---------- CPU-bound: Predict with spike ----------
    predict_load: {
      executor: "ramping-arrival-rate",
      startRate: 10, // start higher
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 50, duration: "30s" }, // ramp up fast
        { target: 800, duration: "15s" }, // sudden spike
        { target: 250, duration: "45s" }, // drop down
        { target: 100, duration: "30s" }, // cool off
      ],
      exec: "predictLoad",
    },

    // ---------- I/O + Memory-bound: Analyze + Orders ----------
    analyze_and_orders: {
      executor: "ramping-vus",
      startVUs: 20,
      stages: [
        { duration: "30s", target: 100 }, // ramp up concurrency
        { duration: "1m", target: 300 }, // sustain heavy load
        { duration: "30s", target: 150 }, // ramp down
      ],
      exec: "hitTwoEndpoints",
    },
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// ---------- PREDICT (file upload) ----------
const imageBin = open("./shoes.jpg", "b");

export function predictLoad() {
  let imagePayload = http.file(imageBin, "file", "image/jpeg");

  let res = http.post(`${BASE_URL}/predict?topk=5`, imagePayload.body, {
    headers: {
      "Content-Type": `multipart/form-data; boundary=${imagePayload.boundary}`,
    },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has predictions": (r) => r.json("result") !== undefined,
  });
  sleep(1);
}

// ---------- ANALYZE (JSON body from file) ----------
const transactionsData = JSON.parse(open("./seed_analyze.json"));

function analyzeRequest() {
  let payload = JSON.stringify(transactionsData);

  let res = http.post(`${BASE_URL}/analyze`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has totals_by_category": (r) => r.json("totals_by_category") !== undefined,
  });
}

// ---------- ORDERS (DB-bound) ----------
function ordersRequest() {
  let res = http.get(`${BASE_URL}/orders?limit=20&offset=0`);
  check(res, { "status is 200": (r) => r.status === 200 });
}

// ---------- HIT TWO ENDPOINTS AT SAME TIME ----------
export function hitTwoEndpoints() {
  let payload = JSON.stringify(transactionsData);

  let responses = http.batch([
    [
      "POST",
      `${BASE_URL}/analyze`,
      payload,
      { headers: { "Content-Type": "application/json" } },
    ],
    ["GET", `${BASE_URL}/orders?limit=10&offset=0`],
  ]);

  check(responses[0], { "analyze ok": (r) => r.status === 200 });
  check(responses[1], { "orders ok": (r) => r.status === 200 });
  sleep(1);
}
