const TOKEN_KEY = "token";
const USER_KEY = "user";
const VALID_ROLES = new Set(["ADMIN", "EMPLOYEE"]);

export const saveAuth = ({ token, user }) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

export const updateStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const user = JSON.parse(raw);
    if (!user || !VALID_ROLES.has(user.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
};

export const isAuthed = () => Boolean(localStorage.getItem(TOKEN_KEY));

export const hasValidSession = () => isAuthed() && Boolean(getUser());
