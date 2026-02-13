/**
 * 认证中间件
 * 
 * 用于验证用户登录状态和权限
 */

const jwt = require('jsonwebtoken');

// JWT密钥（生产环境请使用环境变量）
const SECRET_KEY = process.env.JWT_SECRET || 'hotel-purchase-secret-key-2024';

/**
 * 验证Token中间件
 * 用法: app.get('/api/xxx', authMiddleware, (req, res) => {...})
 */
function authMiddleware(req, res, next) {
  // 从请求头获取Token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未登录或Token无效'
    });
  }
  
  const token = authHeader.substring(7); // 去掉 "Bearer " 前缀
  
  try {
    // 验证Token
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '登录已过期，请重新登录'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token无效'
    });
  }
}

/**
 * 角色检查中间件
 * 用法: app.get('/api/xxx', authMiddleware, roleCheck(['boss', 'admin']), (req, res) => {...})
 */
function roleCheck(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
}

/**
 * 生成Token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    },
    SECRET_KEY,
    { expiresIn: '7d' } // 7天有效期
  );
}

/**
 * 验证Token（不作为中间件）
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

module.exports = {
  authMiddleware,
  roleCheck,
  generateToken,
  verifyToken,
  SECRET_KEY
};
