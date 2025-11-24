import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,                     // number of virtual users
  duration: '1m',              // test duration
  thresholds: {
    http_req_duration: ['p(95)<1500'],  // 95% requests < 1.5s
  },
};

const BASE_URL = "https://api.2klips.com";
const TEST_PHONE = "9862004567";
const OTP = "1234";

export default function () {
  // -------------------------------
  // 1. LOGIN (SEND OTP)
  // -------------------------------
  let loginRes = http.post(`${BASE_URL}/login`, JSON.stringify({
    phone: TEST_PHONE
  }), {
    headers: { "Content-Type": "application/json" }
  });

  check(loginRes, {
    "login status 200": (r) => r.status === 200,
  });

  const validation_token = loginRes.json()?.data?.validation_token;

  if (!validation_token) {
    console.error("❌ login failed — no validation_token");
    return;
  }

  sleep(1);

  // -------------------------------
  // 2. VERIFY OTP → get access_token
  // -------------------------------
  let verifyRes = http.post(`${BASE_URL}/verify`, JSON.stringify({
    validation_token: validation_token,
    otp: OTP,
  }), {
    headers: { "Content-Type": "application/json" }
  });

  check(verifyRes, {
    "verify status 200": (r) => r.status === 200,
  });

  const access_token = verifyRes.json()?.data?.access_token;

  if (!access_token) {
    console.error("❌ verify failed — no access_token");
    return;
  }

  const headers = {
    "Authorization": `Bearer ${access_token}`,
    "Content-Type": "application/json"
  };

  sleep(1);

  // -------------------------------
  // 3. DISCOVER FEED
  // -------------------------------
  let discoverRes = http.get(`${BASE_URL}/discover`, { headers });

  check(discoverRes, {
    "discover 200": (r) => r.status === 200,
  });

  let users = discoverRes.json()?.data ?? [];
  let randomUser = users.length > 0
    ? users[Math.floor(Math.random() * users.length)].id
    : null;

  sleep(1);

  // -------------------------------
  // 4. SWIPE RANDOM USER
  // -------------------------------
  if (randomUser) {
    let swipeRes = http.post(`${BASE_URL}/swipe`, JSON.stringify({
      swipeeId: randomUser,
      liked: true
    }), {
      headers
    });

    check(swipeRes, {
      "swipe 200": (r) => r.status === 200,
    });
  }

  sleep(1);

  // -------------------------------
  // 5. CREATE STORY
  // -------------------------------
  let storyRes = http.post(`${BASE_URL}/story/create`, JSON.stringify({
    title: "Load Test Story",
    content: "Story created during load test.",
    mediaUrls: []
  }), {
    headers
  });

  check(storyRes, {
    "story create 200": (r) => r.status === 200,
  });

  sleep(1);

  // -------------------------------
  // 6. PERSONALITY STATUS (scroll section)
  // -------------------------------
  let perRes = http.get(`${BASE_URL}/status-posts/peronality/kpis`, {
    headers
  });

  check(perRes, {
    "personality 200": (r) => r.status === 200,
  });

  sleep(1);
}
