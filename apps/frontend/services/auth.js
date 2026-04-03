// Server-side authentication helpers for getServerSideProps.

const { getMe } = require("./api");

function isAdminUser(user) {
  return !!user && user.role === "admin";
}

// Attempts to resolve user from session cookie.
// Returns { user, cookie } if authenticated, { user: null, cookie: "" } otherwise.
// Never redirects -- pages are publicly accessible.
async function optionalAuthSSR(context) {
  const cookie = context.req.headers.cookie || "";

  try {
    const result = await getMe(cookie);

    if (result.success && result.data) {
      return { user: result.data, cookie };
    }
  } catch (e) {
    // Session invalid or backend unreachable
  }

  return { user: null, cookie: "" };
}

// Strict guard for admin-only pages (e.g., /login inverse check).
// Redirects to /login if not authenticated.
async function requireAuthSSR(context) {
  const cookie = context.req.headers.cookie || "";

  try {
    const result = await getMe(cookie);

    if (!result.success || !result.data || !isAdminUser(result.data)) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    return { user: result.data, cookie };
  } catch (err) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
}

module.exports = { optionalAuthSSR, requireAuthSSR, isAdminUser };
