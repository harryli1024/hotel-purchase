/**
 * 酒店采购审批系统 - 后端主程序
 * 
 * 运行方式: node server.js
 * 访问地址: http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const applicationRoutes = require('./routes/applications');
const dailyCountRoutes = require('./routes/daily-counts');
const aiRoutes = require('./routes/ai-data');
const itemRoutes = require('./routes/items');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// 中间件配置
// ========================================

// 允许跨域请求
app.use(cors());

// 解析JSON请求体
app.use(express.json({ limit: '50mb' }));

// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, '../frontend')));

// 上传文件存储目录
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ========================================
// API路由
// ========================================

// 认证相关（登录、注册）
app.use('/api/auth', authRoutes);

// 用户管理
app.use('/api/users', userRoutes);

// 采购申请
app.use('/api/applications', applicationRoutes);

// 每日人数
app.use('/api/daily-counts', dailyCountRoutes);

// AI数据管理
app.use('/api/ai', aiRoutes);

// 常用物品管理
app.use('/api/items', itemRoutes);

// ========================================
// 首页路由
// ========================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========================================
// 错误处理
// ========================================

// 404处理
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: '接口不存在' 
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========================================
// 启动服务器
// ========================================

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  🏨 酒店采购审批系统 v4.0');
  console.log('========================================');
  console.log(`  服务器运行在: http://localhost:${PORT}`);
  console.log('  按 Ctrl+C 停止服务器');
  console.log('========================================');
});

module.exports = app;
