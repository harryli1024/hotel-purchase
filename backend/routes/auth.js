/**
 * 认证路由 - 登录、注册
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

/**
 * 用户登录
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 参数验证
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入用户名和密码'
      });
    }
    
    // 查找用户
    const user = await db.queryOne(
      'SELECT * FROM users WHERE username = ? AND status = 1',
      [username]
    );
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    console.log('找到用户:', user.username);
console.log('数据库密码:', user.password);
console.log('输入密码:', password);
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 生成Token
    const token = generateToken(user);
    
    // 记录登录日志
    await db.insert(
      'INSERT INTO operation_logs (user_id, user_name, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.name, 'login', '用户登录', req.ip]
    );
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 用户注册（仅管理员可用）
 * POST /api/auth/register
 * Body: { username, password, name, role, phone }
 */
router.post('/register', authMiddleware, async (req, res) => {
  try {
    // 只有管理员和老板可以创建用户
    if (!['admin', 'boss'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    const { username, password, name, role, phone } = req.body;
    
    // 参数验证
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      });
    }
    
    // 检查用户名是否已存在
    const existing = await db.queryOne(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const userId = await db.insert(
      'INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role, phone || null]
    );
    
    // 记录操作日志
    await db.insert(
      'INSERT INTO operation_logs (user_id, user_name, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, req.user.name, 'create_user', 'user', userId, `创建用户: ${name}`]
    );
    
    res.json({
      success: true,
      message: '用户创建成功',
      data: { userId }
    });
    
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 修改密码
 * POST /api/auth/change-password
 * Body: { oldPassword, newPassword }
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入原密码和新密码'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少6位'
      });
    }
    
    // 获取当前用户
    const user = await db.queryOne(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );
    
    // 验证原密码
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '原密码错误'
      });
    }
    
    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
    
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.queryOne(
      'SELECT id, username, name, role, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
