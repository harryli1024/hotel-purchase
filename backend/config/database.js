/**
 * 数据库配置文件
 * 
 * 使用前请修改以下配置为您的实际数据库信息
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',      // 数据库地址
  port: process.env.DB_PORT || 3306,             // 端口
  user: process.env.DB_USER || 'hoteluser',           // 用户名
  password: process.env.DB_PASSWORD || '512064652Sc?', // 密码（请修改）
  database: process.env.DB_NAME || 'hotel_purchase', // 数据库名
  waitForConnections: true,
  connectionLimit: 10,                            // 连接池大小
  queueLimit: 0,
  charset: 'utf8mb4'
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的辅助函数
async function query(sql, params) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error.message);
    throw error;
  }
}

// 执行单条记录查询
async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// 执行插入并返回ID
async function insert(sql, params) {
  const [result] = await pool.query(sql, params);
  return result.insertId;
}

// 执行更新/删除并返回影响行数
async function execute(sql, params) {
  const [result] = await pool.query(sql, params);
  return result.affectedRows;
}

module.exports = {
  pool,
  query,
  queryOne,
  insert,
  execute,
  testConnection
};
