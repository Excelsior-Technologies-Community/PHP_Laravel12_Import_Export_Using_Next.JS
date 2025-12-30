// Axios HTTP client
import axios from "axios";

// Create Axios instance with Laravel API base URL
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api", // Laravel backend API
  headers: {
    Accept: "application/json", // Accept JSON responses
  },
});

// Export API instance
export default api;
