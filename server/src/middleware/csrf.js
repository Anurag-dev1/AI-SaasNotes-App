const csrfProtection = (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (mutatingMethods.includes(req.method)) {
    const header = req.headers['x-requested-with'];
    if (!header || header !== 'XMLHttpRequest') {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }
  
  next();
};

module.exports = { csrfProtection };
