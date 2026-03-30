function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }
  next();
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
