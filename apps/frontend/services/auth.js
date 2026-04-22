const { getMe } = require("./api");

function isAdminUser(user) {
  return !!user && user.role === "admin";
}

async function resolveUser(cookie) {
  try {
    const result = await getMe(cookie);
    return result.success && result.data ? result.data : null;
  } catch (e) {
    return null;
  }
}

async function optionalAuthSSR(context) {
  const cookie = context.req.headers.cookie || "";
  const user = await resolveUser(cookie);
  return { user, cookie: user ? cookie : "" };
}

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

module.exports = { resolveUser, optionalAuthSSR, requireAuthSSR, isAdminUser };
