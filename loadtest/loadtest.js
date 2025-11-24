import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

export const options = {
  vus: 500,
  duration: "2m",
};

const BASE_URL = "https://api.2klips.com";

// Custom metric
let reqDuration = new Trend('request_duration');

export default function () {
  // --- LOGIN ---
  let loginRes = http.post(`${BASE_URL}/auth/admin/login`,
    JSON.stringify({
      phone: "+9779807592152"
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  check(loginRes, {
    "login status 200": (r) => r.status === 200
  });

  let validation_token = loginRes.json().validation_token;


  // --- VERIFY PHONE ---
  let verifyRes = http.post(`${BASE_URL}/auth/admin/verifyPhone`,
    JSON.stringify({
      validation_token: validation_token,
      otp: 1234
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  check(verifyRes, {
    "verify status 200": (r) => r.status === 200
  });

  // Get dynamic verified access token
  let auth_token = verifyRes.json().data.access_token;


  // --- FETCH PROFILE ---
  let profileRes = http.get(`${BASE_URL}/user/me`, {
    headers: {
      'Authorization': `Bearer ${auth_token}`
    }
  });

  check(profileRes, {
    "profile status 200": (r) => r.status === 200
  });


  // --- DISCOVER FEED ---
  let discoverRes = http.get(`${BASE_URL}/discover`, {
    headers: {
      'Authorization': `Bearer ${auth_token}`
    }
  });

  check(discoverRes, {
    "discover status 200": (r) => r.status === 200
  });


  // --- SWIPE ---
  let swipeRes = http.post(`${BASE_URL}/swipe`,
    JSON.stringify({
      swipeeId: "8",
      liked: true
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth_token}`
      }
    }
  );

  check(swipeRes, {
    "swipe status 200": (r) => r.status === 200
  });


  // --- Track custom metrics ---
  reqDuration.add(profileRes.timings.duration);
  reqDuration.add(discoverRes.timings.duration);
  reqDuration.add(swipeRes.timings.duration);

  sleep(1);
}


// --- SUMMARY OUTPUT ---
export function handleSummary(data) {
  return {
    "stdout": JSON.stringify(data, null, 2),
    "results/results.json": JSON.stringify(data, null, 2),
  };
}
