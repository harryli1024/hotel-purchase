/**
 * 常用物品管理路由
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

/**
 * 获取所有分类和物品
 * GET /api/items/categories
 */
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await db.query(
      'SELECT * FROM item_categories ORDER BY sort_order'
    );
    
    for (let cat of categories) {
      cat.items = await db.query(
        'SELECT * FROM common_items WHERE category_id = ? ORDER BY item_name',
        [cat.id]
      );
    }
    
    res.json({ success: true, data: categories });
    
  } catch (error) {
    console.error('获取分类错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 添加分类
 * POST /api/items/categories
 */
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '请输入分类名称' });
    }
    
    const id = await db.insert(
      'INSERT INTO item_categories (name) VALUES (?)',
      [name]
    );
    
    res.json({ success: true, message: '添加成功', data: { id } });
    
  } catch (error) {
    console.error('添加分类错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 删除分类
 * DELETE /api/items/categories/:id
 */
router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先删除分类下的物品
    await db.execute('DELETE FROM common_items WHERE category_id = ?', [id]);
    // 再删除分类
    await db.execute('DELETE FROM item_categories WHERE id = ?', [id]);
    
    res.json({ success: true, message: '删除成功' });
    
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 添加常用物品
 * POST /api/items
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { categoryId, itemName, unit, lastPrice } = req.body;
    
    if (!categoryId || !itemName || !unit) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    
    // 检查是否已存在
    const existing = await db.queryOne(
      'SELECT id FROM common_items WHERE item_name = ?',
      [itemName]
    );
    
    if (existing) {
      return res.status(400).json({ success: false, message: '该物品已存在' });
    }
    
    const id = await db.insert(
      'INSERT INTO common_items (category_id, item_name, unit, last_price) VALUES (?, ?, ?, ?)',
      [categoryId, itemName, unit, lastPrice || 0]
    );
    
    res.json({ success: true, message: '添加成功', data: { id } });
    
  } catch (error) {
    console.error('添加物品错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 更新常用物品
 * PUT /api/items/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, itemName, unit, lastPrice } = req.body;
    
    await db.execute(
      'UPDATE common_items SET category_id = ?, item_name = ?, unit = ?, last_price = ? WHERE id = ?',
      [categoryId, itemName, unit, lastPrice || 0, id]
    );
    
    res.json({ success: true, message: '更新成功' });
    
  } catch (error) {
    console.error('更新物品错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 删除常用物品
 * DELETE /api/items/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.execute('DELETE FROM common_items WHERE id = ?', [id]);
    
    res.json({ success: true, message: '删除成功' });
    
  } catch (error) {
    console.error('删除物品错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
