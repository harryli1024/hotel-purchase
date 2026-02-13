/**
 * 每日人数记录路由
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleCheck } = require('../middleware/auth');

/**
 * 获取人数记录列表
 * GET /api/daily-counts
 * Query: dateFrom, dateTo, limit
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { dateFrom, dateTo, limit = 100 } = req.query;
    
    let sql = 'SELECT * FROM daily_counts WHERE 1=1';
    const params = [];
    
    if (dateFrom) {
      sql += ' AND record_date >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      sql += ' AND record_date <= ?';
      params.push(dateTo);
    }
    
    sql += ' ORDER BY record_date DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const records = await db.query(sql, params);
    
    // 统计数据
    const stats = await db.queryOne(`
      SELECT 
        COUNT(*) as totalDays,
        AVG(guest_count) as avgCount,
        MAX(guest_count) as maxCount,
        MIN(guest_count) as minCount
      FROM daily_counts
    `);
    
    res.json({
      success: true,
      data: {
        list: records,
        stats: {
          totalDays: stats.totalDays || 0,
          avgCount: Math.round(stats.avgCount || 0),
          maxCount: stats.maxCount || 0,
          minCount: stats.minCount || 0
        }
      }
    });
    
  } catch (error) {
    console.error('获取人数记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 获取指定日期的人数
 * GET /api/daily-counts/:date
 */
router.get('/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    
    const record = await db.queryOne(
      'SELECT * FROM daily_counts WHERE record_date = ?',
      [date]
    );
    
    res.json({
      success: true,
      data: record
    });
    
  } catch (error) {
    console.error('获取人数记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 添加/更新人数记录
 * POST /api/daily-counts
 * Body: { date, count, notes }
 */
router.post('/', authMiddleware, roleCheck(['finance', 'boss', 'admin']), async (req, res) => {
  try {
    const { date, count, notes } = req.body;
    
    if (!date || count === undefined) {
      return res.status(400).json({ success: false, message: '请填写日期和人数' });
    }
    
    // 检查是否已存在
    const existing = await db.queryOne(
      'SELECT id FROM daily_counts WHERE record_date = ?',
      [date]
    );
    
    if (existing) {
      // 更新
      await db.execute(
        'UPDATE daily_counts SET guest_count = ?, notes = ?, recorder_id = ? WHERE record_date = ?',
        [count, notes || null, req.user.id, date]
      );
    } else {
      // 插入
      await db.insert(
        'INSERT INTO daily_counts (record_date, guest_count, notes, recorder_id) VALUES (?, ?, ?, ?)',
        [date, count, notes || null, req.user.id]
      );
    }
    
    res.json({ success: true, message: '保存成功' });
    
  } catch (error) {
    console.error('保存人数记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 批量添加人数记录
 * POST /api/daily-counts/batch
 * Body: { records: [{ date, count, notes }] }
 */
router.post('/batch', authMiddleware, roleCheck(['finance', 'boss', 'admin']), async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: '无效的数据' });
    }
    
    let savedCount = 0;
    
    for (let record of records) {
      if (record.date && record.count !== undefined && record.count >= 0) {
        const existing = await db.queryOne(
          'SELECT id FROM daily_counts WHERE record_date = ?',
          [record.date]
        );
        
        if (existing) {
          await db.execute(
            'UPDATE daily_counts SET guest_count = ?, notes = ?, recorder_id = ? WHERE record_date = ?',
            [record.count, record.notes || null, req.user.id, record.date]
          );
        } else {
          await db.insert(
            'INSERT INTO daily_counts (record_date, guest_count, notes, recorder_id) VALUES (?, ?, ?, ?)',
            [record.date, record.count, record.notes || null, req.user.id]
          );
        }
        savedCount++;
      }
    }
    
    res.json({ success: true, message: `已保存 ${savedCount} 条记录` });
    
  } catch (error) {
    console.error('批量保存错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 删除人数记录
 * DELETE /api/daily-counts/:date
 */
router.delete('/:date', authMiddleware, roleCheck(['finance', 'boss', 'admin']), async (req, res) => {
  try {
    const { date } = req.params;
    
    await db.execute('DELETE FROM daily_counts WHERE record_date = ?', [date]);
    
    res.json({ success: true, message: '已删除' });
    
  } catch (error) {
    console.error('删除人数记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
