const auditDal = require("../dal/audit.dal");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function auditMiddleware(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const userId = req.session && req.session.userId ? req.session.userId : null;
    const ipAddress = req.ip || req.connection.remoteAddress || "0.0.0.0";

    auditDal
      .logAction({
        userId,
        action: req.method + " " + req.originalUrl,
        entity: extractEntity(req.originalUrl),
        entityId: extractEntityId(req.params),
        details: {
          statusCode: res.statusCode,
          success: body && body.success,
        },
        ipAddress,
        userAgent: req.headers["user-agent"],
      })
      .catch((err) => {
        console.error("Audit log write failed:", err.message);
      });

    return originalJson(body);
  };

  next();
}

function extractEntity(url) {
  const parts = url.split("/").filter(Boolean);
  const v1Index = parts.indexOf("v1");
  if (v1Index >= 0 && parts[v1Index + 1]) {
    return parts[v1Index + 1];
  }
  return "unknown";
}

function extractEntityId(params) {
  if (params && params.id) {
    return params.id;
  }
  return null;
}

module.exports = auditMiddleware;
