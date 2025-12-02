import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

// --- k6 options (NO THRESHOLDS → no exit code 99) ---
export const options = {
  stages: [
    { duration: '30s', target: 100 },     // Warm-up users
    { duration: '1m', target: 300 },      // Normal load
    { duration: '1m', target: 500 },      // High load

    // 🔥 Spike Test
    { duration: '30s', target: 1500 },    // Sudden spike
    { duration: '1m', target: 1500 },     // Hold spike

    // 🔁 Stress/Break Point Test
    { duration: '1m', target: 2000 },     // Push system harder
    { duration: '1m', target: 2500 },     // Identify breaking point

    // ⬇ Ramp-down
    { duration: '30s', target: 500 },
    { duration: '20s', target: 0 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.02'],       // Allow max 2% failures under stress
    http_req_duration: [
      'p(90)<800',                        // 90% requests < 800ms
      'p(95)<1200',                       // 95% requests < 1.2s
      'p(99)<2000',                       // 99% requests < 2s
    ],
  },
};


const BASE_URL = "https://api.2klips.com";
let reqDuration = new Trend('request_duration');

// --- Valid unique numbers only (70 numbers) ---
const users = [
    "+9779768893673", "+9779800000000", "+9779821973432", "+9779840034502", "+9779840635175",
    "+9779803775157", "+9779807592153", "+9779841180731", "+9779827115303", "+9779866267202",
    "+9779862004567", "+9779725331684", "+9779760759186", "+9779700000000", "+9779807592155",
    "+9779827112303", "+9779847137545", "+9779825331684", "+9779827115203", "+9779860759186",
    "+9779802153145", "+9779827115103", "+9779802153415", "+9779821534151", "+9779807592555",
    "+9779807592455", "+9779807592166", "+9779827115111", "+9779827115333", "+9779827441254",
    "+9779827112435", "+9779821973232", "+9779807592152", "+9779825311684", "+9779821973234",
    "+9779821643211", "+9779821933334", "+9779840034503", "+9779883775157", "+9779701425384",
    "+9779821973431", "+9779821973421", "+9779767483751", "+9779812345678", "+9779846646464",
    "+9779811592153", "+9779824569882", "+9779807592157", "+9779821973433", "+9779821563432",
    "+9779812020786", "+9779846217021", "+9779803775157", "+9779841180731", "+9779821973439",
    "+9779867452830", "+9779801234567", "+9779840034502", "+9779888888888", "+9779827554223",
    "+9779823973432", "+9779764339292", "+9779815341511", "+9779821345922", "+9779807592552",
    "+9779800534151", "+9779802151415", "+9779827115302", "+9779768290797",
];

// --- main test ---
export default function () {
    const phone = users[Math.floor(Math.random() * users.length)];

    // LOGIN
    let loginRes = http.post(
        `${BASE_URL}/auth/admin/login`,
        JSON.stringify({ phone }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(loginRes, { "login 200": (r) => r.status === 200 });
    const validation_token = loginRes.json("validation_token");
    if (!validation_token) return;

    sleep(0.1);

    // VERIFY OTP
    let verifyRes = http.post(
        `${BASE_URL}/auth/admin/verifyPhone`,
        JSON.stringify({ validation_token, otp: 1234 }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(verifyRes, { "verify 200": (r) => r.status === 200 });
    const auth_token = verifyRes.json("access_token");
    if (!auth_token) return;

    const headers = {
        "Authorization": `Bearer ${auth_token}`,
        "Content-Type": "application/json"
    };

    sleep(0.1);

    // PROFILE
    let profileRes = http.get(`${BASE_URL}/user/me`, { headers });
    check(profileRes, { "profile 200": (r) => r.status === 200 });

    // DISCOVER
    let discoverRes = http.get(`${BASE_URL}/discover`, { headers });
    check(discoverRes, { "discover 200": (r) => r.status === 200 });

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

    // PERSONALITY STATUS
    let personalityRes = http.get(
        `${BASE_URL}/status-posts/peronality/kpis`,
        { headers }
    );
    check(personalityRes, { "personality 200": (r) => r.status === 200 });

    // Track metrics
    reqDuration.add(profileRes.timings.duration);
    reqDuration.add(discoverRes.timings.duration);
    reqDuration.add(swipeRes.timings.duration);
    reqDuration.add(storyRes.timings.duration);
    reqDuration.add(personalityRes.timings.duration);

    sleep(1);
}

// --- Summary export ---
export function handleSummary(data) {
    return {
        "stdout": JSON.stringify(data, null, 2),
        "results/results.json": JSON.stringify(data, null, 2),
    };
}
