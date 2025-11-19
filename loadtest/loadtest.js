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
  let loginRes = http.post(`https://api.2klips.com/auth/admin/login`, JSON.stringify({
    phone: "+9779800000000"
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { "login status 200": (r) => r.status === 200 });

  let validation_token = loginRes.json().validation_token;

  // --- Verify phone ---
  let verifyRes = http.post(`https://api.2klips.com/auth/admin/verifyPhone`, JSON.stringify({
    validation_token: validation_token,
    otp: 1234
  }), { headers: { 'Content-Type': 'application/json' } });

  check(verifyRes, { "verify status 200": (r) => r.status === 200 });
  let auth_token = verifyRes.json().data.access_token;

  // --- Fetch profile ---
  let profileRes = http.get(`https://api.2klips.com/user/me`, {
    headers: { 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OCIsInBob25lIjoiKzk3Nzk4MDc1OTIxNTIiLCJyb2xlIjoiQWRtaW4iLCJ0b2tlbklkZW50aWZpZXIiOiJkZWMyYmIzMC03Y2Q1LTQxZWQtOGQ0Mi0wYmU2YTc3YzRlOGMiLCJpYXQiOjE3NjM1NjkyNzEsImV4cCI6MTc2MzU2OTU3MX0.GFVdQJjWHqYYqFsV8tZalXFsWieK8s8mqlwKF9s6rjw` }
  });
  check(profileRes, { "profile status 200": (r) => r.status === 200 });

  // --- Discover feed ---
  let discoverRes = http.get(`https://api.2klips.com/discover`, {
    headers: { 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OCIsInBob25lIjoiKzk3Nzk4MDc1OTIxNTIiLCJyb2xlIjoiQWRtaW4iLCJ0b2tlbklkZW50aWZpZXIiOiJkZWMyYmIzMC03Y2Q1LTQxZWQtOGQ0Mi0wYmU2YTc3YzRlOGMiLCJpYXQiOjE3NjM1NjkyNzEsImV4cCI6MTc2MzU2OTU3MX0.GFVdQJjWHqYYqFsV8tZalXFsWieK8s8mqlwKF9s6rjw` }
  });
  check(discoverRes, { "discover status 200": (r) => r.status === 200 });

  // --- Swipe ---
  let swipeRes = http.post(`https://api.2klips.com/swipe`, JSON.stringify({
    swipeeId: "5",
    liked: true
  }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OCIsInBob25lIjoiKzk3Nzk4MDc1OTIxNTIiLCJyb2xlIjoiQWRtaW4iLCJ0b2tlbklkZW50aWZpZXIiOiJkZWMyYmIzMC03Y2Q1LTQxZWQtOGQ0Mi0wYmU2YTc3YzRlOGMiLCJpYXQiOjE3NjM1NjkyNzEsImV4cCI6MTc2MzU2OTU3MX0.GFVdQJjWHqYYqFsV8tZalXFsWieK8s8mqlwKF9s6rjw` }
  });
  check(swipeRes, { "swipe status 200": (r) => r.status === 200 });

  // --- Optional Chat ---
  // http.post(`https://api.2klips.com/chat/send`, JSON.stringify({ toUserId: "5", message: "Hello!" }),
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
