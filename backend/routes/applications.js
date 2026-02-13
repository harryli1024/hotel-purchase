/**
 * 采购申请路由
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// 文件上传配置
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + '-' + Math.random().toString(36).substr(2, 9) + ext;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|pdf|doc|docx|xls|xlsx/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});
const db = require('../config/database');
const { authMiddleware, roleCheck } = require('../middleware/auth');

/**
 * 生成申请编号
 */
function generateAppNo(date) {
  const dateStr = date.replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CG${dateStr}${random}`;
}

/**
 * 获取申请列表
 * GET /api/applications
 * Query: status, purchaserId, dateFrom, dateTo, page, limit
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, purchaserId, dateFrom, dateTo, page = 1, limit = 20, itemName } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM applications WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM applications WHERE 1=1';
    const params = [];
    
    // 采购员只能看自己的
    if (req.user.role === 'purchaser') {
      sql += ' AND purchaser_id = ?';
      countSql += ' AND purchaser_id = ?';
      params.push(req.user.id);
    } else if (purchaserId) {
      sql += ' AND purchaser_id = ?';
      countSql += ' AND purchaser_id = ?';
      params.push(purchaserId);
    }
    
    // 财务只能看已批准的
    if (req.user.role === 'finance') {
      sql += ' AND status = "approved"';
      countSql += ' AND status = "approved"';
    } else if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }
    
    if (dateFrom) {
      sql += ' AND purchase_date >= ?';
      countSql += ' AND purchase_date >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      sql += ' AND purchase_date <= ?';
      countSql += ' AND purchase_date <= ?';
      params.push(dateTo);
    }
    // 按物品名称搜索
    if (itemName) {
      sql += ' AND id IN (SELECT application_id FROM application_items WHERE item_name LIKE ?)';
      countSql += ' AND id IN (SELECT application_id FROM application_items WHERE item_name LIKE ?)';
      params.push(`%${itemName}%`);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    const countResult = await db.queryOne(countSql, params);
    const applications = await db.query(sql, [...params, parseInt(limit), offset]);
    
    // 获取每个申请的物品明细
    // 获取每个申请的物品明细
for (let app of applications) {
  app.items = await db.query(
    'SELECT * FROM application_items WHERE application_id = ?',
    [app.id]
  );
  app.attachments = await db.query(
    'SELECT id, file_name, file_path, file_type FROM attachments WHERE application_id = ?',
    [app.id]
  );
  
  // AI价格分析
  let aiSuggestions = [];
  for (let item of app.items) {
    const priceHistory = await db.queryOne(
      'SELECT * FROM price_history WHERE item_name = ?',
      [item.item_name]
    );
    
    if (priceHistory && priceHistory.count > 0) {
      const avgPrice = priceHistory.total_price / priceHistory.count;
      const currentPrice = parseFloat(item.price);
      
// 价格偏差超过阈值则提示
const threshold = priceHistory.alert_threshold || 20;
if (currentPrice > avgPrice * (1 + threshold / 100)) {
        const percent = ((currentPrice - avgPrice) / avgPrice * 100).toFixed(1);
        aiSuggestions.push(`⚠️ 【${item.item_name}】单价 ¥${currentPrice.toFixed(2)} 高于历史均价 ¥${avgPrice.toFixed(2)}（高出${percent}%）`);
      } else if (currentPrice < avgPrice * (1 - threshold / 100)) {
        const percent = ((avgPrice - currentPrice) / avgPrice * 100).toFixed(1);
        aiSuggestions.push(`💡 【${item.item_name}】单价 ¥${currentPrice.toFixed(2)} 低于历史均价 ¥${avgPrice.toFixed(2)}（低${percent}%）`);
      }
    }
  }
  
  // AI消耗量分析
  const countRecord = await db.queryOne(
    `SELECT * FROM daily_counts 
     WHERE ABS(DATEDIFF(record_date, ?)) <= 3
     ORDER BY ABS(DATEDIFF(record_date, ?)) LIMIT 1`,
    [app.purchase_date, app.purchase_date]
  );
  
  if (countRecord && countRecord.guest_count > 0) {
    for (let item of app.items) {
      const rateHistory = await db.queryOne(
        'SELECT * FROM consumption_rates WHERE item_name = ?',
        [item.item_name]
      );
      
      if (rateHistory && rateHistory.count >= 3) {
        const days = estimateDays(item.item_name);
        const expectedQty = rateHistory.avg_rate * countRecord.guest_count * days;
        const actualQty = parseFloat(item.quantity);
        
        if (actualQty > expectedQty * 1.5) {
          const percent = ((actualQty - expectedQty) / expectedQty * 100).toFixed(1);
          aiSuggestions.push(`📊 【${item.item_name}】数量 ${actualQty} 高于预期 ${expectedQty.toFixed(1)}（高出${percent}%，基于${countRecord.guest_count}人）`);
        }
      }
    }
  }
  // 新物品检测
  for (let item of app.items) {
    const existingItem = await db.queryOne(
      'SELECT * FROM price_history WHERE item_name = ?',
      [item.item_name]
    );
    
    if (!existingItem) {
      aiSuggestions.push(`🆕 【${item.item_name}】是首次采购的新物品，请注意核实`);
    }
  }
  app.ai_suggestion = aiSuggestions.length > 0 ? aiSuggestions.join('\n') : null;
}
    
    res.json({
      success: true,
      data: {
        list: applications,
        total: countResult.total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('获取申请列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 获取单个申请详情
 * GET /api/applications/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const app = await db.queryOne('SELECT * FROM applications WHERE id = ?', [id]);
    
    if (!app) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }
    
    // 权限检查
    if (req.user.role === 'purchaser' && app.purchaser_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权查看' });
    }
    
    app.items = await db.query(
      'SELECT * FROM application_items WHERE application_id = ?',
      [id]
    );
    app.attachments = await db.query(
      'SELECT id, file_name, file_path, file_type FROM attachments WHERE application_id = ?',
      [id]
    );
    
    res.json({ success: true, data: app });
    
  } catch (error) {
    console.error('获取申请详情错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 提交采购申请
 * POST /api/applications
 * Body: { purchaseDate, notes, items: [{name, quantity, unit, price}] }
 */
router.post('/', authMiddleware, upload.array('files', 5), async (req, res) => {
  try {
   const { purchaseDate, notes } = req.body;
let items = req.body.items;
if (typeof items === 'string') {
  items = JSON.parse(items);
}
    
    if (!purchaseDate || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      });
    }
    
    // 计算总金额
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    // 生成编号
    const appNo = generateAppNo(purchaseDate);
    
    // 插入申请
    const appId = await db.insert(
      `INSERT INTO applications 
       (app_no, purchaser_id, purchaser_name, purchase_date, notes, total_amount, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [appNo, req.user.id, req.user.name, purchaseDate, notes || null, totalAmount]
    );
    
    // 插入物品明细
    for (let item of items) {
      await db.insert(
        `INSERT INTO application_items 
         (application_id, item_name, quantity, unit, price, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [appId, item.name, item.quantity, item.unit, item.price, item.quantity * item.price]
      );
    }
    // 保存附件信息
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await db.insert(
          'INSERT INTO attachments (application_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
          [appId, file.originalname, file.filename, file.mimetype, file.size]
        );
      }
    }
    res.json({
      success: true,
      message: '提交成功',
      data: { id: appId, appNo }
    });
    
  } catch (error) {
    console.error('提交申请错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 审批申请
 * PUT /api/applications/:id/review
 * Body: { status: 'approved'|'rejected', reviewNotes }
 */
router.put('/:id/review', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的审批状态' });
    }
    
    const app = await db.queryOne('SELECT * FROM applications WHERE id = ?', [id]);
    if (!app) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }
    
    // 更新申请状态
    await db.execute(
      `UPDATE applications SET 
       status = ?, review_time = NOW(), reviewer_id = ?, review_notes = ?,
       accounting_status = ?
       WHERE id = ?`,
      [status, req.user.id, reviewNotes || null, status === 'approved' ? 'waiting' : null, id]
    );
    
    // 如果批准，AI学习价格
    if (status === 'approved') {
      const items = await db.query(
        'SELECT * FROM application_items WHERE application_id = ?',
        [id]
      );
      
      for (let item of items) {
        // 更新价格历史
        const existing = await db.queryOne(
          'SELECT * FROM price_history WHERE item_name = ?',
          [item.item_name]
        );
        
        if (existing) {
          await db.execute(
            `UPDATE price_history SET 
             total_price = total_price + ?, count = count + 1,
             min_price = LEAST(min_price, ?), max_price = GREATEST(max_price, ?)
             WHERE item_name = ?`,
            [item.price, item.price, item.price, item.item_name]
          );
        } else {
          await db.insert(
            `INSERT INTO price_history (item_name, total_price, count, min_price, max_price)
             VALUES (?, ?, 1, ?, ?)`,
            [item.item_name, item.price, item.price, item.price]
          );
        }
        
        // 学习用量（需要人数数据）
        const countRecord = await db.queryOne(
          `SELECT * FROM daily_counts 
           WHERE ABS(DATEDIFF(record_date, ?)) <= 3
           ORDER BY ABS(DATEDIFF(record_date, ?)) LIMIT 1`,
          [app.purchase_date, app.purchase_date]
        );
        
        if (countRecord && countRecord.guest_count > 0) {
          const days = estimateDays(item.item_name);
          const rate = item.quantity / (countRecord.guest_count * days);
          
          const existingRate = await db.queryOne(
            'SELECT * FROM consumption_rates WHERE item_name = ?',
            [item.item_name]
          );
          
          if (existingRate) {
            await db.execute(
              `UPDATE consumption_rates SET 
               total_rate = total_rate + ?, count = count + 1,
               avg_rate = (total_rate + ?) / (count + 1)
               WHERE item_name = ?`,
              [rate, rate, item.item_name]
            );
          } else {
            await db.insert(
              `INSERT INTO consumption_rates (item_name, total_rate, count, avg_rate)
               VALUES (?, ?, 1, ?)`,
              [item.item_name, rate, rate]
            );
          }
        }
      }
    }
    
    res.json({ success: true, message: status === 'approved' ? '已批准' : '已驳回' });
    
  } catch (error) {
    console.error('审批错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 标记报账
 * PUT /api/applications/:id/account
 * Body: { accountingNotes }
 */
router.put('/:id/account', authMiddleware, roleCheck(['finance', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { accountingNotes } = req.body;
    
    await db.execute(
      `UPDATE applications SET 
       accounting_status = 'accounted', accounting_time = NOW(),
       accounting_person = ?, accounting_notes = ?
       WHERE id = ? AND status = 'approved'`,
      [req.user.name, accountingNotes || null, id]
    );
    
    res.json({ success: true, message: '已标记报账' });
    
  } catch (error) {
    console.error('报账错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 删除申请
 * DELETE /api/applications/:id
 */
router.delete('/:id', authMiddleware, roleCheck(['boss', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.execute('DELETE FROM applications WHERE id = ?', [id]);
    
    res.json({ success: true, message: '已删除' });
    
  } catch (error) {
    console.error('删除错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 获取统计数据
 * GET /api/applications/stats
 */
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    let whereClause = '';
    const params = [];
    
    if (req.user.role === 'purchaser') {
      whereClause = 'WHERE purchaser_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'finance') {
      whereClause = 'WHERE status = "approved"';
    }
    
    const stats = await db.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN accounting_status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN accounting_status = 'accounted' THEN 1 ELSE 0 END) as accounted
      FROM applications ${whereClause}
    `, params);
    
    const aiStats = await db.queryOne(`
      SELECT COUNT(*) as learnedItems FROM price_history
    `);
    
    res.json({
      success: true,
      data: {
        ...stats,
        learnedItems: aiStats.learnedItems
      }
    });
    
  } catch (error) {
    console.error('获取统计错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 估算使用天数
function estimateDays(itemName) {
  const name = itemName.toLowerCase();
  if (name.includes('米') || name.includes('面') || name.includes('粉')) return 7;
  if (name.includes('菜') || name.includes('叶') || name.includes('瓜')) return 2;
  if (name.includes('肉') || name.includes('鱼') || name.includes('虾') || name.includes('蛋')) return 3;
  if (name.includes('调料') || name.includes('酱') || name.includes('油') || name.includes('盐')) return 30;
  return 3;
}
/**
 * 导出采购数据为Excel
 * GET /api/applications/export/excel
 */
router.get('/export/excel', authMiddleware, roleCheck(['boss', 'finance', 'admin']), async (req, res) => {
  try {
    const { status, itemName, dateFrom, dateTo } = req.query;
    
    let sql = 'SELECT * FROM applications WHERE 1=1';
    const params = [];
    
    // 财务只能导出已批准的
    if (req.user.role === 'finance') {
      sql += ' AND status = "approved"';
    } else if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (dateFrom) {
      sql += ' AND purchase_date >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      sql += ' AND purchase_date <= ?';
      params.push(dateTo);
    }
    
    if (itemName) {
      sql += ' AND id IN (SELECT application_id FROM application_items WHERE item_name LIKE ?)';
      params.push(`%${itemName}%`);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const applications = await db.query(sql, params);
    
    // 获取每个申请的详细信息
    for (let app of applications) {
      app.items = await db.query(
        'SELECT item_name, quantity, unit, price, subtotal FROM application_items WHERE application_id = ?',
        [app.id]
      );
    }
    
    // 构建Excel数据
    const excelData = [];
    
    applications.forEach(app => {
      const statusText = {pending: '待审批', approved: '已通过', rejected: '已驳回'}[app.status] || '';
      const accountingText = {waiting: '待报账', accounted: '已报账'}[app.accounting_status] || '';
      
      app.items.forEach(item => {
        excelData.push({
          '申请编号': app.app_no,
          '采购日期': app.purchase_date,
          '采购员': app.purchaser_name,
          '物品名称': item.item_name,
          '数量': item.quantity,
          '单位': item.unit,
          '单价': parseFloat(item.price).toFixed(2),
          '小计': parseFloat(item.subtotal).toFixed(2),
          '申请总金额': parseFloat(app.total_amount).toFixed(2),
          '审批状态': statusText,
          '审批时间': app.review_time || '',
          '审批备注': app.review_notes || '',
          '报账状态': accountingText,
          '报账时间': app.accounting_time || '',
          '报账人': app.accounting_person || '',
          '申请备注': app.notes || '',
          '提交时间': app.created_at
        });
      });
    });
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // 设置列宽
    ws['!cols'] = [
      {wch: 18}, // 申请编号
      {wch: 12}, // 采购日期
      {wch: 10}, // 采购员
      {wch: 15}, // 物品名称
      {wch: 8},  // 数量
      {wch: 6},  // 单位
      {wch: 10}, // 单价
      {wch: 10}, // 小计
      {wch: 12}, // 申请总金额
      {wch: 10}, // 审批状态
      {wch: 18}, // 审批时间
      {wch: 20}, // 审批备注
      {wch: 10}, // 报账状态
      {wch: 18}, // 报账时间
      {wch: 10}, // 报账人
      {wch: 20}, // 申请备注
      {wch: 18}, // 提交时间
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '采购数据');
    
    // 生成buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 设置响应头
    const filename = encodeURIComponent(`采购数据_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(buffer);
    
  } catch (error) {
    console.error('导出Excel错误:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});
module.exports = router;