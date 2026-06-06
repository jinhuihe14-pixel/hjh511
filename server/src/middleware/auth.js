const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: '认证失败', error: error.message });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: '权限不足' });
  };
};

module.exports = { auth, requireRole };
