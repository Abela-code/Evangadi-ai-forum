import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "token";

export const authCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};

export function setAuthCookie(res, token) {
  const { exp } = jwt.decode(token);

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...authCookieOptions,
    maxAge: exp * 1000 - Date.now(),
  });
}
