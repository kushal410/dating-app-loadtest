import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 100,          // virtual users
  duration: "2m",    // test duration
};

const BASE_URL = "https://api.2klips.com";

export default function () {
  // -----------------------------
  // 1. Login (admin/login)
  // -----------------------------
  let loginRes = http.post(`${BASE_URL}/auth/admin/login`, JSON.stringify({
    phone: "+9779807592152"   // replace with test mobile
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(loginRes, {
    "login status 200": (r) => r.status === 200
  });

  let loginData = loginRes.json();
  let validation_token = loginData.validation_token;

  // -----------------------------
  // 2. Verify phone with OTP
  // -----------------------------
  let verifyRes = http.post(`${BASE_URL}/auth/admin/verifyPhone`, JSON.stringify({
    validation_token: validation_token,
    otp: 1234
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(verifyRes, {
    "verify status 200": (r) => r.status === 200
  });

  let auth_token = verifyRes.json().data.access_token;

  // -----------------------------
  // 3. Fetch user profile (GET /user/me)
  // -----------------------------
  http.get(`${BASE_URL}/user/me`, {
    headers: { 'Authorization': `Bearer ${auth_token}` }
  });

  // -----------------------------
  // 4. Discover feed (/discover)
  // -----------------------------
  http.get(`${BASE_URL}/discover`, {
    headers: { 'Authorization': `Bearer ${auth_token}` }
  });

  // -----------------------------
  // 5. Swipe like (/swipe)
  // -----------------------------
  http.post(`${BASE_URL}/swipe`, JSON.stringify({
    swipeeId: "5",   // replace with dynamic userId if needed
    liked: true
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth_token}`
    }
  });

  // -----------------------------
  // 6. Optional: Send chat (/chat/send)
  // -----------------------------
  // http.post(`${BASE_URL}/chat/send`, JSON.stringify({
  //   toUserId: "5",
  //   message: "Hello!"
  // }), {
  //   headers: { 
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${auth_token}`
  //   }
  // });

  sleep(1); // pause 1 second between actions
}
