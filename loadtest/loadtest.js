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
        { duration: "30s", target: 200 }, // warm up
        { duration: "1m", target: 500 },  // ramp to peak
        { duration: "2m", target: 500 },  // sustain
        { duration: "30s", target: 0 },   // ramp down
      ],
      gracefulRampDown: "20s",
    }
  },

  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"],  // performance SLAs
  },
};

// ----------------- CUSTOM METRICS -----------------
let loginDuration = new Trend("login_duration");
let profileDuration = new Trend("profile_duration");
let swipeDuration = new Trend("swipe_duration");
let failedRequests = new Counter("failed_requests");

// ----------------- HELPERS -----------------
function randomPhone() {
  const prefix = Math.random() < 0.5 ? "97" : "98"; // only 97 or 98
  const random8 = Math.floor(10000000 + Math.random() * 90000000); // 8 random digits
  return `+977${prefix}${random8}`;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ----------------- MAIN TEST FLOW -----------------
export default function () {
  let phone = randomPhone();

  // --------------- LOGIN REQUEST -----------------
  let loginRes = http.post(
    "https://api.2klips.com/auth/admin/login",
    JSON.stringify({ phone: phone }),
    { headers: { "Content-Type": "application/json" } }
  );

  let loginOK = check(loginRes, {
    "login 200": (r) => r.status === 200,
  });

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

  let verifyOK = check(verifyRes, {
    "OTP verify 200": (r) => r.status === 200,
  });

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


  // --------------- DISCOVER FEED -----------------
  let discoverRes = http.get("https://api.2klips.com/discover", {
    headers: { Authorization: `Bearer ${auth_token}` },
  });

  let discoverOK = check(discoverRes, {
    "discover 200": (r) => r.status === 200,
  });

  if (!discoverOK) {
    failedRequests.add(1);
    return;
  }

  let discoverList = discoverRes.json().data;
  if (!discoverList || discoverList.length === 0) {
    sleep(1);
    return;
  }

  let randomUser = randomElement(discoverList);
  let swipeeId = randomUser?.id || randomUser?.userId || "8"; // fallback


  // --------------- SWIPE RANDOM USER -----------------
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

  // Simulate human behavior
  sleep(Math.random() * 2 + 1); // 1–3 seconds think time
}

// ----------------- SUMMARY OUTPUT -----------------
export function handleSummary(data) {
  return {
    "stdout": JSON.stringify(data, null, 2),
    "results/k6-summary.json": JSON.stringify(data, null, 2),
  };
}
