import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

// --- Load Test Configuration ---
export const options = {
    stages: [
        { duration: "10s", target: 100 },    // Ramp up to 100 VUs
        { duration: "10s", target: 500 },    // Ramp up to 500 VUs
        { duration: "15s", target: 1000 },   // Ramp up to 1000 VUs
        { duration: "20s", target: 1300 },   // Ramp up to 1300 VUs
        { duration: "2m", target: 1300 },    // Hold peak load
        { duration: "20s", target: 0 },      // Ramp down
    ],
    thresholds: {
        http_req_failed: ["rate<0.20"],      // 20% max failure allowed
        http_req_duration: ["p(95)<3000"],   // 95% requests < 3s
    }
};

const BASE_URL = "https://api.2klips.com";
let reqDuration = new Trend("request_duration");

// --- Test Users (all numbers with +977) ---
const users = [
    "+9779768893673",
    "+9779800000000",
    "+9779821973432",
    "+9779840034502",
    "+9779840635175",
    "+9779803775157",
    "+9779807592153",
    "+9779841180731",
    "+9779827115303",
    "+9779866267202",
    "+9779862004567",
    "+9779725331684",
    "+9779760759186",
    "+9779700000000"
];

export default function () {

    // --- SELECT RANDOM USER ---
    const phone = users[Math.floor(Math.random() * users.length)];

    // --- LOGIN ---
    let loginRes = http.post(
        `${BASE_URL}/auth/admin/login`,
        JSON.stringify({ phone }),
        { headers: { "Content-Type": "application/json" } }
    );

    check(loginRes, { "login 200": (r) => r.status === 200 });

    const validation_token = loginRes.json("validation_token");
    if (!validation_token) return;

    sleep(0.2);

    // --- VERIFY OTP ---
    let verifyRes = http.post(
        `${BASE_URL}/auth/admin/verifyPhone`,
        JSON.stringify({ validation_token, otp: 1234 }),
        { headers: { "Content-Type": "application/json" } }
    );

    check(verifyRes, { "verify 200": (r) => r.status === 200 });

    const auth_token = verifyRes.json("access_token");
    if (!auth_token) return;

    const headers = {
        Authorization: `Bearer ${auth_token}`,
        "Content-Type": "application/json",
    };

    sleep(0.2);

    // --- PROFILE ---
    let profileRes = http.get(`${BASE_URL}/user/me`, { headers });
    check(profileRes, { "profile 200": (r) => r.status === 200 });

    // --- DISCOVER ---
    let discoverRes = http.get(`${BASE_URL}/discover`, { headers });
    check(discoverRes, { "discover 200": (r) => r.status === 200 });

    // --- SWIPE ---
    const randomSwipeId = Math.floor(Math.random() * 50) + 1;
    let swipeRes = http.post(
        `${BASE_URL}/swipe`,
        JSON.stringify({ swipeeId: `${randomSwipeId}`, liked: true }),
        { headers }
    );
    check(swipeRes, { "swipe 200": (r) => r.status === 200 });

    // --- STORY CREATE ---
    const storyContent = `Story content for ${phone} at ${Date.now()}`;
    let storyRes = http.post(
        `${BASE_URL}/story/create`,
        JSON.stringify({ content: storyContent }),
        { headers }
    );
    check(storyRes, { "story 200": (r) => r.status === 200 });

    // --- PERSONALITY KPI ---
    let personalityRes = http.get(`${BASE_URL}/status-posts/peronality/kpis`, { headers });
    check(personalityRes, { "personality 200": (r) => r.status === 200 });

    // --- Metrics ---
    reqDuration.add(profileRes.timings.duration);
    reqDuration.add(discoverRes.timings.duration);
    reqDuration.add(swipeRes.timings.duration);
    reqDuration.add(storyRes.timings.duration);
    reqDuration.add(personalityRes.timings.duration);

    sleep(1);
}

// --- Summary Output ---
export function handleSummary(data) {
    return {
        "stdout": JSON.stringify(data, null, 2),
        "results/results.json": JSON.stringify(data, null, 2),
    };
}
