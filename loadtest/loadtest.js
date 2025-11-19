import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

export const options = {
  vus: 100,
  duration: "2m",
};

const BASE_URL = "https://api.2klips.com";

// Optional: custom metric for request duration
let reqDuration = new Trend('request_duration');

export default function () {
  // --- Login ---
  let loginRes = http.post(`${BASE_URL}/auth/admin/login`, JSON.stringify({
    phone: "+9779807592152"
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { "login status 200": (r) => r.status === 200 });

  let validation_token = loginRes.json().validation_token;

  // --- Verify phone ---
  let verifyRes = http.post(`${BASE_URL}/auth/admin/verifyPhone`, JSON.stringify({
    validation_token: validation_token,
    otp: 1234
  }), { headers: { 'Content-Type': 'application/json' } });

  check(verifyRes, { "verify status 200": (r) => r.status === 200 });
  let auth_token = verifyRes.json().data.access_token;

  // --- Fetch profile ---
  let profileRes = http.get(`${BASE_URL}/user/me`, {
    headers: { 'Authorization': `Bearer ${auth_token}` }
  });
  check(profileRes, { "profile status 200": (r) => r.status === 200 });

  // --- Discover feed ---
  let discoverRes = http.get(`${BASE_URL}/discover`, {
    headers: { 'Authorization': `Bearer ${auth_token}` }
  });
  check(discoverRes, { "discover status 200": (r) => r.status === 200 });

  // --- Swipe ---
  let swipeRes = http.post(`${BASE_URL}/swipe`, JSON.stringify({
    swipeeId: "5",
    liked: true
  }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` }
  });
  check(swipeRes, { "swipe status 200": (r) => r.status === 200 });

  // --- Optional Chat ---
  // http.post(`${BASE_URL}/chat/send`, JSON.stringify({ toUserId: "5", message: "Hello!" }),
  // { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` } });

  // --- Track duration metric ---
  reqDuration.add(profileRes.timings.duration);
  reqDuration.add(discoverRes.timings.duration);
  reqDuration.add(swipeRes.timings.duration);

  sleep(1);
}

// Optional: print a summary at the end (shown in logs)
export function handleSummary(data) {
  return {
    "stdout": JSON.stringify(data, null, 2),   // prints full summary in logs
    "results/results.json": JSON.stringify(data, null, 2) // saves JSON file
  };
}
