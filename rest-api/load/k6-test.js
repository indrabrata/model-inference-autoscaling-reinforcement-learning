import { check, sleep } from "k6";
import http from "k6/http";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

// ---------------- CONFIG ----------------
export let options = {
  discardResponseBodies: true,
  scenarios: {
    // ---------- PREDICT: ramp + spikes over 6h ----------
    predict_load: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 600,
      stages: [
        { target: 100, duration: "30m" },
        { target: 500, duration: "30m" }, // spike
        { target: 300, duration: "60m" },
        { target: 50, duration: "60m" },
        { target: 800, duration: "30m" }, // another spike
        { target: 200, duration: "150m" }, // long tail to finish 6h
      ],
      exec: "predictLoad",
    },

    // ---------- ANALYZE + ORDERS: heavy ramps over 6h ----------
    analyze_and_orders: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "40m", target: 100 },
        { duration: "60m", target: 300 },
        { duration: "40m", target: 150 },
        { duration: "40m", target: 400 },
        { duration: "40m", target: 50 },
        { duration: "100m", target: 200 }, // total ~6h
      ],
      exec: "hitTwoEndpoints",
    },

    // ---------- BACKGROUND NOISE: constant for 6h ----------
    background_noise: {
      executor: "constant-arrival-rate",
      rate: 20,
      timeUnit: "1s",
      duration: "6h",
      preAllocatedVUs: 20,
      maxVUs: 200,
      exec: "ordersRequest",
    },

    // ---------- CPU+MEMORY MIX: pushes different mixes for 6h ----------
    cpu_and_memory_mix: {
      executor: "ramping-arrival-rate",
      startRate: 30,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { target: 150, duration: "30m" },
        { target: 400, duration: "45m" },
        { target: 200, duration: "60m" },
        { target: 600, duration: "30m" }, // spike
        { target: 120, duration: "155m" }, // finish to 6h
      ],
      exec: "cpuMemoryMix",
    },
  },

  // Optional global thresholds you may want to tune
  thresholds: {
    "http_req_duration": ["p(95)<1500"], // example
  },
};

// ---------- BASE URL ----------
const BASE_URL = __ENV.BASE_URL || "http://100.127.139.26:30080";

// ---------- IMAGE POOL (place several images inside ./images/) ----------
const imageFiles = [
  "./images/shoes.jpg",
];

// preload images (k6 supports open())
const imageBinaries = imageFiles
  .filter((f) => !!f)
  .map((f) => ({ name: f, bin: open(f, "b") }));

// ---------- ANALYZE JSONS: seed_analyze.json should be an array of payloads ----------
const analyzePayloadsRaw = JSON.parse(open("./seed_analyze.json")); // expect array
const analyzeSamples =
  Array.isArray(analyzePayloadsRaw) && analyzePayloadsRaw.length
    ? analyzePayloadsRaw
    : [analyzePayloadsRaw];

// ---------- HELPERS ----------
function chooseRandomImage() {
  if (imageBinaries.length === 0) {
    return null;
  }
  return randomItem(imageBinaries);
}

function chooseAnalyzePayload() {
  return randomItem(analyzeSamples);
}

function randSleep(min = 0.2, max = 2.0) {
  sleep(min + Math.random() * (max - min));
}

// ---------- PREDICT (file upload) ----------
export function predictLoad() {
  const chosen = chooseRandomImage();
  if (!chosen) {
    // fallback to simple GET if no image available
    let r = http.get(`${BASE_URL}/predict?topk=${Math.floor(Math.random() * 10) + 1}`);
    check(r, { "status 200": (res) => res.status === 200 });
    randSleep(0.1, 1.5);
    return;
  }

  // randomize topk to vary payload/results
  const topk = Math.floor(Math.random() * 10) + 1;
  let imagePayload = http.file(chosen.bin, "file", "image/jpeg");
  let res = http.post(`${BASE_URL}/predict?topk=${topk}`, imagePayload.body, {
    headers: {
      "Content-Type": `multipart/form-data; boundary=${imagePayload.boundary}`,
    },
  });

  check(res, {
    "predict status is 200": (r) => r.status === 200,
    "predict has result": (r) => {
      try {
        return !!r.json("result");
      } catch (e) {
        return false;
      }
    },
  });

  randSleep(0.1, 2.5);
}

// ---------- ANALYZE (JSON body from seed array) ----------
function analyzeRequest() {
  const payloadObject = chooseAnalyzePayload();
  let payload = JSON.stringify(payloadObject);

  let res = http.post(`${BASE_URL}/analyze`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "analyze status 200": (r) => r.status === 200,
    "analyze has totals_by_category": (r) => {
      try {
        return r.json("totals_by_category") !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  randSleep(0.1, 2.0);
}

// ---------- ORDERS (DB-bound) ----------
export function ordersRequest() {
  let res = http.get(`${BASE_URL}/orders`);
  check(res, { "orders status 200": (r) => r.status === 200 });
  randSleep(0.05, 1.0);
}

// ---------- HIT TWO ENDPOINTS ----------
export function hitTwoEndpoints() {
  // mix analyze and orders
  analyzeRequest();
  let res2 = http.get(`${BASE_URL}/orders`);
  check(res2, { "orders 2 status 200": (r) => r.status === 200 });
  randSleep(0.1, 2.0);
}

// ---------- CPU + Memory Mix ----------
export function cpuMemoryMix() {
  // probabilistically favor predictLoad (CPU-bound) or analyzeRequest (IO/mem)
  if (Math.random() < 0.6) {
    predictLoad();
  } else {
    analyzeRequest();
  }
}
