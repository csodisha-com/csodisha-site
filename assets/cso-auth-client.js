(function (window) {
  "use strict";

  const API = Object.freeze({
    register: "/api/auth/register",
    login: "/api/auth/login",
    me: "/api/auth/me",
    logout: "/api/auth/logout",
    verify: "/api/auth/verify-email",
    verifyOtp: "/api/auth/verify-otp",
    resendOtp: "/api/auth/resend-otp",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password"
  });

  async function request(endpoint, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.body ? {
        "Content-Type": "application/json"
      } : {}),
      ...options.headers
    };

    try {
      const response = await fetch(endpoint, {
        method: options.method || "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers,
        ...(options.body ? {
          body: JSON.stringify(options.body)
        } : {})
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        return {
          ...(data && typeof data === "object" ? data : {}),
          ok: false,
          status: response.status,
          error: typeof data?.error === "string"
            ? data.error
            : "Account service request failed."
        };
      }

      if (!data || typeof data !== "object") {
        return {
          ok: false,
          status: response.status,
          error: "Invalid server response."
        };
      }

      return {
        ...data,
        ok: data.ok !== false,
        status: response.status
      };

    } catch {
      return {
        ok: false,
        status: 0,
        error: "Unable to connect to the account service."
      };
    }
  }

  function validCredentials(data) {
    return data &&
      typeof data === "object" &&
      typeof data.email === "string" &&
      typeof data.password === "string" &&
      data.email.length <= 254 &&
      data.password.length > 0 &&
      data.password.length <= 128;
  }

  async function register(data) {
    if (
      !validCredentials(data) ||
      typeof data.fullName !== "string" ||
      data.password.length < 8 ||
      data.password.length > 64
    ) {
      return {
        ok: false,
        error: "Invalid registration information. Password must be between 8 and 64 characters."
      };
    }

    return request(API.register, {
      method: "POST",
      body: {
        email: data.email,
        fullName: data.fullName,
        password: data.password,
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || "",
        state: data.state || "",
        district: data.district || ""
      }
    });
  }

  async function login(data) {
    if (!validCredentials(data)) {
      return {
        ok: false,
        error: "Invalid login information."
      };
    }

    return request(API.login, {
      method: "POST",
      body: {
        email: data.email,
        password: data.password
      }
    });
  }

  async function getCurrentUser() {
    const result = await request(API.me);

    if (result.status === 401) {
      return {
        ok: false,
        authenticated: false,
        user: null,
        status: 401
      };
    }

    if (!result.ok) {
      return {
        ...result,
        authenticated: false,
        user: null
      };
    }

    if (
      result.authenticated !== true ||
      !result.user ||
      typeof result.user !== "object"
    ) {
      return {
        ok: false,
        authenticated: false,
        user: null,
        error: "Invalid authentication response."
      };
    }

    return {
      ok: true,
      authenticated: true,
      user: result.user,
      status: result.status
    };
  }

  async function logout() {
    return request(API.logout, {
      method: "POST",
      body: {}
    });
  }

  async function verifyEmail(data) {
    if (
      !data ||
      typeof data.token !== "string" ||
      !/^[0-9a-f]{64}$/.test(data.token)
    ) {
      return {
        ok: false,
        error: "Invalid verification token."
      };
    }

    return request(API.verify, {
      method: "POST",
      body: {
        token: data.token
      }
    });
  }


  async function verifyOtp(data) {
    if (
      !data ||
      typeof data.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
      typeof data.otp !== "string" ||
      !/^[0-9]{6}$/.test(data.otp)
    ) {
      return { ok: false, error: "Enter your email and six-digit code." };
    }
    return request(API.verifyOtp, {
      method: "POST",
      body: { email: data.email, otp: data.otp }
    });
  }

  async function resendOtp(data) {
    if (
      !data ||
      typeof data.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      return { ok: false, error: "Enter a valid email address." };
    }
    return request(API.resendOtp, {
      method: "POST",
      body: { email: data.email }
    });
  }


  async function requestPasswordReset(data) {
    if (
      !data ||
      typeof data.email !== "string" ||
      data.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    ) {
      return { ok: false, error: "Enter a valid email address." };
    }

    return request(API.forgotPassword, {
      method: "POST",
      body: { email: data.email.trim() }
    });
  }

  async function resetPassword(data) {
    if (
      !data ||
      typeof data.token !== "string" ||
      !/^[0-9a-f]{64}$/.test(data.token) ||
      typeof data.password !== "string" ||
      data.password.length < 8 ||
      data.password.length > 128 ||
      !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]*[@#][A-Za-z0-9]*$/.test(data.password)
    ) {
      return {
        ok: false,
        error: "Invalid reset information. Check your password."
      };
    }

    return request(API.resetPassword, {
      method: "POST",
      body: {
        token: data.token,
        password: data.password
      }
    });
  }

  const client = Object.freeze({
    enabled: true,
    register,
    login,
    getCurrentUser,
    logout,
    verifyEmail,
    verifyOtp,
    resendOtp,
    requestPasswordReset,
    resetPassword
  });

  Object.defineProperty(window, "CSOAuth", {
    value: client,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
