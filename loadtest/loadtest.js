import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

export const options = {
  vus: 500,
  duration: "2m",
};

const BASE_URL = "https://api.2klips.com";
let reqDuration = new Trend('request_duration');

export default function () {

  // --- LOGIN ---
  let loginRes = http.post(`${BASE_URL}/auth/admin/login`,
    JSON.stringify({ phone: "+9779807592152" }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, { "login 200": (r) => r.status === 200 });
  let validation_token = loginRes.json().validation_token;
  if (!validation_token) return;

  sleep(0.5);

  // --- VERIFY PHONE ---
  let verifyRes = http.post(`${BASE_URL}/auth/admin/verifyPhone`,
    JSON.stringify({ validation_token, otp: 1234 }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(verifyRes, { "verify 200": (r) => r.status === 200 });
  let auth_token = verifyRes.json().access_token;
  if (!auth_token) return;

  const headers = {
    "Authorization": `Bearer ${auth_token}`,
    "Content-Type": "application/json"
  };

  sleep(0.5);

  // --- PROFILE ---
  let profileRes = http.get(`${BASE_URL}/user/me`, { headers });
  check(profileRes, { "profile 200": (r) => r.status === 200 });

  // --- DISCOVER ---
  let discoverRes = http.get(`${BASE_URL}/discover`, { headers });
  check(discoverRes, { "discover 200": (r) => r.status === 200 });

  // --- SWIPE ---
  let swipeRes = http.post(`${BASE_URL}/swipe`,
    JSON.stringify({ swipeeId: "8", liked: true }),
    { headers }
  );
  check(swipeRes, { "swipe 200": (r) => r.status === 200 });

  // --- TRACK METRICS ---
  reqDuration.add(profileRes.timings.duration);
  reqDuration.add(discoverRes.timings.duration);
  reqDuration.add(swipeRes.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  return {
    "stdout": JSON.stringify(data, null, 2),
    "results/results.json": JSON.stringify(data, null, 2),
  };
}
