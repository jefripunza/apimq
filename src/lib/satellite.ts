import axios from "axios";

const satelliteApi = axios.create({
  baseURL: "https://api.satellite.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export default satelliteApi;