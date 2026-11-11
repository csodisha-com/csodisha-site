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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: options.method || "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers,
        signal: controller.signal,
        ...(options.body ? {
          body: JSON.stringify(options.body)
        } : {})
      });
      clearTimeout(timeoutId);

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
        ok: data.ok !== false && data.success !== false,
        status: response.status
      };

    } catch (err) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        status: 0,
        error: err.name === 'AbortError'
          ? "Request timed out. Please try again."
          : "Unable to connect to the account service."
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
    const passwordPolicyError = (function (pw) {
      if (typeof pw !== "string" || pw.length < 8 || pw.length > 128) {
        return "Invalid registration information. Password must be between 8 and 128 characters.";
      }
      if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
        return "Password must include an uppercase letter, a lowercase letter, a digit and a special character.";
      }
      return null;
    })(data ? data.password : "");

    if (
      !validCredentials(data) ||
      typeof data.fullName !== "string" ||
      passwordPolicyError
    ) {
      return {
        ok: false,
        error: passwordPolicyError ||
          "Invalid registration information. Password must be between 8 and 128 characters."
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
