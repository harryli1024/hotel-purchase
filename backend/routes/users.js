/**
 * 用户管理路由
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleCheck } = require('../middleware/auth');

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const users = await db.query(
      'SELECT id, username, name, role, phone, status, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({ success: true, data: users });
    
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 获取采购员列表（用于筛选）
 * GET /api/users/purchasers
 */
router.get('/purchasers', authMiddleware, async (req, res) => {
  try {
    const users = await db.query(
      'SELECT id, name FROM users WHERE role = "purchaser" AND status = 1'
    );
    
    res.json({ success: true, data: users });
    
  } catch (error) {
    console.error('获取采购员列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { username, password, name, role, phone } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    
    const existing = await db.queryOne(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existing) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userId = await db.insert(
      'INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role, phone || null]
    );
    
    res.json({ success: true, message: '创建成功', data: { userId } });
    
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, phone, status, password } = req.body;
    
    let sql = 'UPDATE users SET name = ?, role = ?, phone = ?, status = ?';
    const params = [name, role, phone || null, status !== undefined ? status : 1];
    
    if (password) {
      sql += ', password = ?';
      params.push(await bcrypt.hash(password, 10));
    }
    
    sql += ' WHERE id = ?';
    params.push(id);
    
    await db.execute(sql, params);
    
    res.json({ success: true, message: '更新成功' });
    
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 不能删除自己
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: '不能删除自己' });
    }
    
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ success: true, message: '已删除' });
    
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
