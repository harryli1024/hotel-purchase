-- ========================================
-- 酒店采购审批系统 - 数据库初始化脚本
-- ========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS hotel_purchase 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE hotel_purchase;

-- ========================================
-- 1. 用户表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '登录账号',
  password VARCHAR(255) NOT NULL COMMENT '密码(加密)',
  name VARCHAR(50) NOT NULL COMMENT '真实姓名',
  role ENUM('purchaser', 'boss', 'finance', 'admin') NOT NULL COMMENT '角色',
  phone VARCHAR(20) COMMENT '手机号',
  status TINYINT DEFAULT 1 COMMENT '状态:1启用,0禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT '用户表';

-- 插入默认管理员 (密码: admin123)
INSERT INTO users (username, password, name, role) VALUES 
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQlTmGO5Fz1qDZOhvCdJR1BE.4Hy', '管理员', 'admin'),
('boss', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQlTmGO5Fz1qDZOhvCdJR1BE.4Hy', '王老板', 'boss'),
('finance', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQlTmGO5Fz1qDZOhvCdJR1BE.4Hy', '李财务', 'finance'),
('purchaser1', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQlTmGO5Fz1qDZOhvCdJR1BE.4Hy', '张采购', 'purchaser');

-- ========================================
-- 2. 采购申请表
-- ========================================
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  app_no VARCHAR(20) NOT NULL UNIQUE COMMENT '申请编号',
  purchaser_id INT NOT NULL COMMENT '采购员ID',
  purchaser_name VARCHAR(50) NOT NULL COMMENT '采购员姓名',
  purchase_date DATE NOT NULL COMMENT '采购日期',
  notes TEXT COMMENT '备注说明',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '总金额',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审批状态',
  review_time DATETIME COMMENT '审批时间',
  reviewer_id INT COMMENT '审批人ID',
  review_notes TEXT COMMENT '审批意见',
  accounting_status ENUM('waiting', 'accounted') COMMENT '报账状态',
  accounting_time DATETIME COMMENT '报账时间',
  accounting_person VARCHAR(50) COMMENT '报账经办人',
  accounting_notes TEXT COMMENT '报账备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (purchaser_id) REFERENCES users(id)
) COMMENT '采购申请表';

-- ========================================
-- 3. 采购物品明细表
-- ========================================
CREATE TABLE IF NOT EXISTS application_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL COMMENT '申请ID',
  item_name VARCHAR(100) NOT NULL COMMENT '物品名称',
  quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
  unit VARCHAR(20) NOT NULL COMMENT '单位',
  price DECIMAL(10,2) NOT NULL COMMENT '单价',
  subtotal DECIMAL(10,2) NOT NULL COMMENT '小计',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) COMMENT '采购物品明细';

-- ========================================
-- 4. 附件表
-- ========================================
CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL COMMENT '申请ID',
  file_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
  file_path VARCHAR(500) NOT NULL COMMENT '存储路径',
  file_type VARCHAR(50) COMMENT '文件类型',
  file_size INT COMMENT '文件大小(字节)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) COMMENT '附件表';

-- ========================================
-- 5. 每日人数记录表
-- ========================================
CREATE TABLE IF NOT EXISTS daily_counts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  record_date DATE NOT NULL UNIQUE COMMENT '日期',
  guest_count INT NOT NULL DEFAULT 0 COMMENT '在住人数',
  notes VARCHAR(255) COMMENT '备注',
  recorder_id INT COMMENT '记录人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT '每日人数记录';

-- ========================================
-- 6. AI价格学习表
-- ========================================
CREATE TABLE IF NOT EXISTS price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL UNIQUE COMMENT '物品名称',
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '价格总和',
  count INT NOT NULL DEFAULT 0 COMMENT '采购次数',
  min_price DECIMAL(10,2) COMMENT '最低价',
  max_price DECIMAL(10,2) COMMENT '最高价',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT 'AI价格学习数据';

-- ========================================
-- 7. AI用量学习表
-- ========================================
CREATE TABLE IF NOT EXISTS consumption_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL UNIQUE COMMENT '物品名称',
  total_rate DECIMAL(12,6) NOT NULL DEFAULT 0 COMMENT '用量总和',
  count INT NOT NULL DEFAULT 0 COMMENT '学习次数',
  avg_rate DECIMAL(10,6) COMMENT '平均人均消耗',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT 'AI用量学习数据';

-- ========================================
-- 8. 操作日志表
-- ========================================
CREATE TABLE IF NOT EXISTS operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT COMMENT '操作用户ID',
  user_name VARCHAR(50) COMMENT '用户姓名',
  action VARCHAR(50) NOT NULL COMMENT '操作类型',
  target_type VARCHAR(50) COMMENT '操作对象类型',
  target_id INT COMMENT '操作对象ID',
  details TEXT COMMENT '详细信息',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) COMMENT '操作日志';

-- ========================================
-- 索引优化
-- ========================================
CREATE INDEX idx_app_status ON applications(status);
CREATE INDEX idx_app_date ON applications(purchase_date);
CREATE INDEX idx_app_purchaser ON applications(purchaser_id);
CREATE INDEX idx_daily_date ON daily_counts(record_date);
CREATE INDEX idx_log_user ON operation_logs(user_id);
CREATE INDEX idx_log_time ON operation_logs(created_at);

-- ========================================
-- 完成提示
-- ========================================
SELECT '✅ 数据库初始化完成！' AS message;
SELECT '默认账号：admin / boss / finance / purchaser1' AS accounts;
SELECT '默认密码：admin123' AS password;
