import http from "k6/http";
import { sleep } from "k6";

export const options = {
  vus: 100,          // number of virtual users
  duration: "2m",    // duration of test
};

export default function () {
  // Replace these endpoints with your app APIs

  // Example: Login
  http.post("https://yourapi.com/auth/login", {
    email: "testuser@example.com",
    password: "password123"
  });

  // Example: Fetch user profile
  http.get("https://yourapi.com/user/profile");

  // Example: Discover feed
  http.get("https://yourapi.com/discover");

  // Example: Swipe action
  http.post("https://yourapi.com/match/like", { userId: "12345" });

  sleep(1); // pause 1 second between actions
}
