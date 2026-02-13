/**
 * AI数据管理路由
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleCheck } = require('../middleware/auth');

/**
 * 获取价格学习数据
 * GET /api/ai/prices
 */
router.get('/prices', authMiddleware, async (req, res) => {
  try {
    const prices = await db.query(
      'SELECT * FROM price_history ORDER BY item_name'
    );
    
    // 计算平均价
    const data = prices.map(p => ({
      ...p,
      avg_price: p.count > 0 ? (p.total_price / p.count).toFixed(2) : 0
    }));
    
    res.json({ success: true, data });
    
  } catch (error) {
    console.error('获取价格数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 更新价格数据
 * PUT /api/ai/prices/:itemName
 * Body: { avgPrice, alertThreshold }
 */
router.put('/prices/:itemName', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { itemName } = req.params;
    const { avgPrice, alertThreshold } = req.body;
    
    const existing = await db.queryOne(
      'SELECT * FROM price_history WHERE item_name = ?',
      [itemName]
    );
    
    if (!existing) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }
    
    // 构建更新语句
    let updates = [];
    let params = [];
    
    if (avgPrice !== undefined) {
      updates.push('total_price = ? * count');
      updates.push('min_price = ? * 0.8');
      updates.push('max_price = ? * 1.2');
      params.push(avgPrice, avgPrice, avgPrice);
    }
    
    if (alertThreshold !== undefined) {
      updates.push('alert_threshold = ?');
      params.push(alertThreshold);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的内容' });
    }
    
    params.push(itemName);
    await db.execute(
      `UPDATE price_history SET ${updates.join(', ')} WHERE item_name = ?`,
      params
    );
    
    res.json({ success: true, message: '已更新' });
    
  } catch (error) {
    console.error('更新价格数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 添加价格数据
 * POST /api/ai/prices
 * Body: { itemName, price }
 */
router.post('/prices', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { itemName, price } = req.body;
    
    if (!itemName || !price) {
      return res.status(400).json({ success: false, message: '请填写物品名称和价格' });
    }
    
    const existing = await db.queryOne(
      'SELECT id FROM price_history WHERE item_name = ?',
      [itemName]
    );
    
    if (existing) {
      return res.status(400).json({ success: false, message: '物品已存在' });
    }
    
    await db.insert(
      `INSERT INTO price_history (item_name, total_price, count, min_price, max_price, alert_threshold)
       VALUES (?, ?, 1, ?, ?, 20)`,
      [itemName, price, price * 0.9, price * 1.1]
    );
    
    res.json({ success: true, message: '已添加' });
    
  } catch (error) {
    console.error('添加价格数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 删除价格数据
 * DELETE /api/ai/prices/:itemName
 */
router.delete('/prices/:itemName', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { itemName } = req.params;
    
    await db.execute('DELETE FROM price_history WHERE item_name = ?', [itemName]);
    
    res.json({ success: true, message: '已删除' });
    
  } catch (error) {
    console.error('删除价格数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 获取用量学习数据
 * GET /api/ai/consumption
 */
router.get('/consumption', authMiddleware, async (req, res) => {
  try {
    const rates = await db.query(
      'SELECT * FROM consumption_rates ORDER BY item_name'
    );
    
    res.json({ success: true, data: rates });
    
  } catch (error) {
    console.error('获取用量数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 更新用量数据
 * PUT /api/ai/consumption/:itemName
 * Body: { avgRate }
 */
router.put('/consumption/:itemName', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { itemName } = req.params;
    const { avgRate } = req.body;
    
    const existing = await db.queryOne(
      'SELECT * FROM consumption_rates WHERE item_name = ?',
      [itemName]
    );
    
    if (!existing) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }
    
    await db.execute(
      `UPDATE consumption_rates SET 
       total_rate = ? * count,
       avg_rate = ?
       WHERE item_name = ?`,
      [avgRate, avgRate, itemName]
    );
    
    res.json({ success: true, message: '已更新' });
    
  } catch (error) {
    console.error('更新用量数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 添加用量数据
 * POST /api/ai/consumption
 * Body: { itemName, rate }
 */
router.post('/consumption', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { itemName, rate } = req.body;
    
    if (!itemName || !rate) {
      return res.status(400).json({ success: false, message: '请填写物品名称和用量' });
    }
    
    const existing = await db.queryOne(
      'SELECT id FROM consumption_rates WHERE item_name = ?',
      [itemName]
    );
    
    if (existing) {
      return res.status(400).json({ success: false, message: '物品已存在' });
    }
    
    await db.insert(
      `INSERT INTO consumption_rates (item_name, total_rate, count, avg_rate)
       VALUES (?, ?, 1, ?)`,
      [itemName, rate, rate]
    );
    
    res.json({ success: true, message: '已添加' });
    
  } catch (error) {
    console.error('添加用量数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 删除用量数据
 * DELETE /api/ai/consumption/:itemName
 */
router.delete('/consumption/:itemName', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { itemName } = req.params;
    
    await db.execute('DELETE FROM consumption_rates WHERE item_name = ?', [itemName]);
    
    res.json({ success: true, message: '已删除' });
    
  } catch (error) {
    console.error('删除用量数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 导出AI数据
 * GET /api/ai/export
 */
router.get('/export', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const prices = await db.query('SELECT * FROM price_history');
    const consumption = await db.query('SELECT * FROM consumption_rates');
    
    res.json({
      success: true,
      data: {
        version: '4.0',
        exportDate: new Date().toISOString(),
        prices,
        consumption
      }
    });
    
  } catch (error) {
    console.error('导出AI数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 导入AI数据
 * POST /api/ai/import
 * Body: { prices, consumption, mode: 'merge'|'replace' }
 */
router.post('/import', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { prices, consumption, mode = 'merge' } = req.body;
    
    if (mode === 'replace') {
      await db.execute('TRUNCATE TABLE price_history');
      await db.execute('TRUNCATE TABLE consumption_rates');
    }
    
    if (prices && Array.isArray(prices)) {
      for (let p of prices) {
        if (mode === 'merge') {
          const existing = await db.queryOne(
            'SELECT * FROM price_history WHERE item_name = ?',
            [p.item_name]
          );
          
          if (existing) {
            await db.execute(
              `UPDATE price_history SET 
               total_price = total_price + ?, count = count + ?,
               min_price = LEAST(min_price, ?), max_price = GREATEST(max_price, ?)
               WHERE item_name = ?`,
              [p.total_price, p.count, p.min_price, p.max_price, p.item_name]
            );
            continue;
          }
        }
        
        await db.insert(
          `INSERT INTO price_history (item_name, total_price, count, min_price, max_price)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           total_price = VALUES(total_price), count = VALUES(count),
           min_price = VALUES(min_price), max_price = VALUES(max_price)`,
          [p.item_name, p.total_price, p.count, p.min_price, p.max_price]
        );
      }
    }
    
    if (consumption && Array.isArray(consumption)) {
      for (let c of consumption) {
        if (mode === 'merge') {
          const existing = await db.queryOne(
            'SELECT * FROM consumption_rates WHERE item_name = ?',
            [c.item_name]
          );
          
          if (existing) {
            const newTotal = existing.total_rate + c.total_rate;
            const newCount = existing.count + c.count;
            await db.execute(
              `UPDATE consumption_rates SET 
               total_rate = ?, count = ?, avg_rate = ?
               WHERE item_name = ?`,
              [newTotal, newCount, newTotal / newCount, c.item_name]
            );
            continue;
          }
        }
        
        await db.insert(
          `INSERT INTO consumption_rates (item_name, total_rate, count, avg_rate)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           total_rate = VALUES(total_rate), count = VALUES(count), avg_rate = VALUES(avg_rate)`,
          [c.item_name, c.total_rate, c.count, c.avg_rate]
        );
      }
    }
    
    res.json({ success: true, message: '导入成功' });
    
  } catch (error) {
    console.error('导入AI数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;