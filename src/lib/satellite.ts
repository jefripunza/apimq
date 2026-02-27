import axios from "axios";

import { HOST_API } from "@/environment";

const satellite = axios.create({
  baseURL: HOST_API,
  headers: {
    "Content-Type": "application/json",
  },
});

// request interceptor
satellite.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// response interceptor
satellite.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default satellite;
