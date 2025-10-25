import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  discardResponseBodies: true,

  scenarios: {
    stress_predict: {
      executor: "ramping-arrival-rate",
      startRate: 50,           // starting requests per second
      timeUnit: "1s",
      preAllocatedVUs: 500,    // initial VUs to handle load
      maxVUs: 5000,             // cap at 5000 VUs
      stages: [
        { target: 500, duration: "30s" },    // ramp gently
        { target: 1500, duration: "30s" },
        { target: 3000, duration: "30s" },
        { target: 4000, duration: "30s" },
        { target: 5000, duration: "30s" },   // final stage to reach 5000 RPS
      ],
      exec: "predictLoad",
    },
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080/api";
const imageBin = open("./shoes.jpg", "b");

export function predictLoad() {
  const formData = {
    file: http.file(imageBin, "shoes.jpg", "image/jpeg"),
  };

  const res = http.post(`${BASE_URL}/predict?topk=1`, formData);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  sleep(0.1);
}
