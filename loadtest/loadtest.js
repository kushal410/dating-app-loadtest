import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

// --- k6 options ---
export const options = {
  stages: [
    { duration: '30s', target: 200 },
    { duration: '1m', target: 500 },
    { duration: '1m', target: 900 },
    { duration: '30s', target: 1500 },
    { duration: '1m', target: 1500 },
    { duration: '30s', target: 300 },
    { duration: '20s', target: 0 },
  ],

  thresholds: {
    http_req_failed: [
      { threshold: 'rate<0.20', abortOnFail: false }
    ],
    http_req_duration: [
      { threshold: 'p(90)<3000', abortOnFail: false }
    ],
  },
};

const BASE_URL = "https://api.2klips.com";
let reqDuration = new Trend('request_duration');

// --- Safe JSON helper ---
function safeJson(res) {
  try {
    return res.json();
  } catch (_) {
    return {}; // never let k6 crash
  }
}

// --- Valid numbers (your list) ---
const users = [ /* your full list here */ ];

export default function () {
  const phone = users[Math.floor(Math.random() * users.length)];

  // LOGIN
  let loginRes = http.post(
    `${BASE_URL}/auth/admin/login`,
    JSON.stringify({ phone }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, { "login 200": (r) => r.status === 200 });

  const loginData = safeJson(loginRes);
  const validation_token = loginData?.validation_token;

  if (!validation_token) return;  // Stop for this user safely

  sleep(0.1);

  // VERIFY OTP
  let verifyRes = http.post(
    `${BASE_URL}/auth/admin/verifyPhone`,
    JSON.stringify({ validation_token, otp: 1234 }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(verifyRes, { "verify 200": (r) => r.status === 200 });

  const verifyData = safeJson(verifyRes);
  const auth_token = verifyData?.access_token;

  if (!auth_token) return;

  const headers = {
    "Authorization": `Bearer ${auth_token}`,
    "Content-Type": "application/json"
  };

  sleep(0.1);

  // PROFILE
  let profileRes = http.get(`${BASE_URL}/user/me`, { headers });
  check(profileRes, { "profile 200": (r) => r.status === 200 });

  // SWIPE
  const randomSwipeId = Math.floor(Math.random() * 50) + 1;
  let swipeRes = http.post(
    `${BASE_URL}/swipe`,
    JSON.stringify({ swipeeId: `${randomSwipeId}`, liked: true }),
    { headers }
  );
  check(swipeRes, { "swipe 200": (r) => r.status === 200 });

  // STORY
  const storyContent = `Story content for ${phone} at ${Date.now()}`;
  let storyRes = http.post(
    `${BASE_URL}/story/create`,
    JSON.stringify({ content: storyContent }),
    { headers }
  );
  check(storyRes, { "story 200": (r) => r.status === 200 });

  // PERSONALITY
  let personalityRes = http.get(
    `${BASE_URL}/status-posts/peronality/kpis`,
    { headers }
  );
  check(personalityRes, { "personality 200": (r) => r.status === 200 });

  // Track durations
  reqDuration.add(profileRes.timings.duration);
  reqDuration.add(swipeRes.timings.duration);
  reqDuration.add(storyRes.timings.duration);
  reqDuration.add(personalityRes.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  return {
    "stdout": JSON.stringify(data, null, 2),
    "results/results.json": JSON.stringify(data, null, 2),
  };
}
