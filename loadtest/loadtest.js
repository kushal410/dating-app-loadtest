import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

// ----------------- LOAD OPTIONS -----------------
export const options = {
  scenarios: {
    main_load_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 200 }, // warm up
        { duration: "1m", target: 500 },  // ramp to peak
        { duration: "1m30s", target: 500 }, // hold load
        { duration: "20s", target: 0 },   // ramp down
      ],
      gracefulRampDown: "20s",
    }
  },
  thresholds: {
    http_req_duration: ["p(95)<1500", "p(99)<2500"],
  },
};

// ----------------- CUSTOM METRICS -----------------
let loginDuration = new Trend("login_duration");
let profileDuration = new Trend("profile_duration");
let swipeDuration = new Trend("swipe_duration");
let failedRequests = new Counter("failed_requests");

// FIXED USER PHONE NUMBER
const FIXED_PHONE = "+9779807592152";

// ----------------- MAIN TEST FLOW -----------------
export default function () {
  // --------------- LOGIN -----------------
  let loginRes = http.post(
    "https://api.2klips.com/auth/admin/login",
    JSON.stringify({ phone: FIXED_PHONE }),
    { headers: { "Content-Type": "application/json" } }
  );

  let loginOK = check(loginRes, { "login 200": (r) => r.status === 200 });
  if (!loginOK) {
    failedRequests.add(1);
    return;
  }

  loginDuration.add(loginRes.timings.duration);
  let validation_token = loginRes.json().validation_token;

  // --------------- VERIFY OTP -----------------
  let verifyRes = http.post(
    "https://api.2klips.com/auth/admin/verifyPhone",
    JSON.stringify({
      validation_token: validation_token,
      otp: 1234,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  let verifyOK = check(verifyRes, { "OTP verify 200": (r) => r.status === 200 });
  if (!verifyOK) {
    failedRequests.add(1);
    return;
  }

  let auth_token = verifyRes.json().data.access_token;

  // --------------- GET PROFILE -----------------
  let profileRes = http.get("https://api.2klips.com/user/me", {
    headers: { Authorization: `Bearer ${auth_token}` },
  });

  check(profileRes, { "profile 200": (r) => r.status === 200 });
  profileDuration.add(profileRes.timings.duration);

  // --------------- DISCOVER -----------------
  let discoverRes = http.get("https://api.2klips.com/discover", {
    headers: { Authorization: `Bearer ${auth_token}` },
  });

  let discoverOK = check(discoverRes, { "discover 200": (r) => r.status === 200 });
  if (!discoverOK) {
    failedRequests.add(1);
    return;
  }

  let discoverList = discoverRes.json()?.data || [];
  if (discoverList.length === 0) {
    sleep(1);
    return;
  }

  // pick random user from discover list
  let swipeTarget = discoverList[Math.floor(Math.random() * discoverList.length)];
  let swipeeId = swipeTarget?.id || swipeTarget?.userId || "8";

  // --------------- SWIPE -----------------
  let swipeRes = http.post(
    "https://api.2klips.com/swipe",
    JSON.stringify({
      swipeeId: swipeeId,
      liked: Math.random() > 0.5, // random like/dislike
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );

  check(swipeRes, { "swipe 200": (r) => r.status === 200 });
  swipeDuration.add(swipeRes.timings.duration);

  // 1–3 second random think time
  sleep(Math.random() * 2 + 1);
}

// ----------------- SUMMARY OUTPUT -----------------
export function handleSummary(data) {
  return {
    "stdout": JSON.stringify(data, null, 2),
    "results/k6-final-summary.json": JSON.stringify(data, null, 2),
  };
}
