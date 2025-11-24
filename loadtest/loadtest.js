import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

export const options = {
  vus: 200,
  duration: "2m",
};

// -------- HARD CODED TOKENS --------
const VALIDATION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OCIsInBob25lIjoiKzk3Nzk4MDc1OTIxNTIiLCJyb2xlIjoiQWRtaW4iLCJ0b2tlbklkZW50aWZpZXIiOiJkZWMyYmIzMC03Y2Q1LTQxZWQtOGQ0Mi0wYmU2YTc3YzRlOGMiLCJpYXQiOjE3NjM5NTgxOTMsImV4cCI6MTc2Mzk1ODQ5M30.kok30dorTVF-XvHYBf2OUfps-qxEel_PjBhPhsQcCsA";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OCIsInBob25lIjoiKzk3Nzk4MDc1OTIxNTIiLCJyb2xlIjoiQWRtaW4iLCJ0b2tlbklkZW50aWZpZXIiOiJkZWMyYmIzMC03Y2Q1LTQxZWQtOGQ0Mi0wYmU2YTc3YzRlOGMiLCJpYXQiOjE3NjM5NTg0NzYsImV4cCI6MTc2Mzk1OTM3Nn0.s8LLiMSdjCrB5g6GLccZz1CP6KB0LWuav_ZTfF_6Zq4";

const REFRESH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OCIsInBob25lIjoiKzk3Nzk4MDc1OTIxNTIiLCJyb2xlIjoiQWRtaW4iLCJ0b2tlbklkZW50aWZpZXIiOiJkZWMyYmIzMC03Y2Q1LTQxZWQtOGQ0Mi0wYmU2YTc3YzRlOGMiLCJpYXQiOjE3NjM5NTg0NzYsImV4cCI6MTc2NDU2MzI3Nn0.sLl8MXETBLKJ7lI3pT3xCg2PMsLSA-UX-NNwRUQWqe8";

// -------- METRICS --------
let profileDuration = new Trend("profile_duration");
let discoverDuration = new Trend("discover_duration");
let swipeDuration = new Trend("swipe_duration");
let failedRequests = new Counter("failed_requests");

// -------- MAIN --------
export default function () {
  // ---------------- PROFILE ----------------
  let profileRes = http.get("https://api.2klips.com/user/me", {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  check(profileRes, { "profile 200": (r) => r.status === 200 });
  profileDuration.add(profileRes.timings.duration);

  // ---------------- DISCOVER ----------------
  let discoverRes = http.get("https://api.2klips.com/discover", {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  let discoverOK = check(discoverRes, { "discover 200": (r) => r.status === 200 });
  discoverDuration.add(discoverRes.timings.duration);

  if (!discoverOK) {
    failedRequests.add(1);
    return;
  }

  let discoverList = discoverRes.json()?.data || [];
  if (discoverList.length === 0) {
    sleep(1);
    return;
  }

  let randomUser = discoverList[Math.floor(Math.random() * discoverList.length)];
  let swipeeId = randomUser?.id || randomUser?.userId || "8";

  // ---------------- SWIPE ----------------
  let swipeRes = http.post(
    "https://api.2klips.com/swipe",
    JSON.stringify({
      swipeeId: swipeeId,
      liked: Math.random() > 0.5,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    }
  );

  check(swipeRes, { "swipe 200": (r) => r.status === 200 });
  swipeDuration.add(swipeRes.timings.duration);

  sleep(1);
}

// -------- SUMMARY --------
export function handleSummary(data) {
  return {
    "stdout": JSON.stringify(data, null, 2),
    "results/results.json": JSON.stringify(data, null, 2),
  };
}
