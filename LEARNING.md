# 📚 学习路径指南 - 从零到上线

这份指南帮助您从零基础开始，逐步学习并完成系统部署。

---

## 🎯 学习目标

完成学习后，您将能够：
- ✅ 理解Web应用的工作原理
- ✅ 使用Node.js开发后端
- ✅ 操作MySQL数据库
- ✅ 将应用部署到云服务器
- ✅ 独立维护和更新系统

---

## 📅 学习计划（4-6周）

### 第1周：基础环境 + 概念理解

#### Day 1-2：了解基本概念

**什么是Web应用？**
```
用户（浏览器）  <---->  服务器  <---->  数据库
   │                      │              │
   │   发送请求           │   查询数据   │
   │   ───────────>       │  ─────────>  │
   │                      │              │
   │   返回页面           │   返回结果   │
   │   <───────────       │  <─────────  │
```

**推荐视频**：
- B站搜索 "Web开发入门" "前后端分离" 
- 看1-2小时了解概念即可

#### Day 3-4：安装开发环境

**1. 安装 VS Code**
- 下载：https://code.visualstudio.com/
- 推荐插件：
  - Chinese (中文语言包)
  - Live Server (本地服务器)
  - ESLint (代码检查)

**2. 安装 Node.js**
- 下载：https://nodejs.org/
- 选择 LTS 版本（如 18.x）
- 安装后验证：
```bash
# 打开命令提示符或终端
node --version    # 应显示 v18.x.x
npm --version     # 应显示 9.x.x
```

**3. 安装 MySQL**

方式A - 直接安装：
- 下载：https://dev.mysql.com/downloads/mysql/
- 安装时设置root密码（记住它！）

方式B - 使用可视化工具（推荐新手）：
- 下载 XAMPP：https://www.apachefriends.org/
- 包含 MySQL + 管理界面

**4. 安装数据库管理工具**
- Navicat（收费但好用）
- DBeaver（免费）
- MySQL Workbench（官方免费）

#### Day 5-7：动手练习

**练习1：运行第一个Node.js程序**

创建文件 `hello.js`：
```javascript
console.log('Hello, World!');
console.log('我正在学习Node.js');
```

运行：
```bash
node hello.js
```

**练习2：创建简单的Web服务器**

创建文件 `server.js`：
```javascript
// 引入http模块
const http = require('http');

// 创建服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end('<h1>你好！这是我的第一个服务器</h1>');
});

// 监听端口
server.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});
```

运行：
```bash
node server.js
```

然后打开浏览器访问 http://localhost:3000

---

### 第2周：学习Node.js + Express

#### Day 1-2：Express框架入门

**什么是Express？**
- Node.js的Web框架
- 简化服务器开发
- 处理路由、请求、响应

**安装Express**：
```bash
# 创建项目文件夹
mkdir my-first-app
cd my-first-app

# 初始化项目
npm init -y

# 安装Express
npm install express
```

**创建 app.js**：
```javascript
const express = require('express');
const app = express();

// 首页路由
app.get('/', (req, res) => {
  res.send('<h1>欢迎来到我的网站</h1>');
});

// 关于页面
app.get('/about', (req, res) => {
  res.send('<h1>关于我们</h1><p>这是一个学习项目</p>');
});

// 启动服务器
app.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});
```

#### Day 3-4：处理请求和响应

**GET请求 - 获取数据**：
```javascript
// 获取用户列表
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: '张三', role: '采购员' },
    { id: 2, name: '李四', role: '老板' }
  ];
  res.json(users);  // 返回JSON数据
});

// 获取单个用户
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;  // 获取URL中的id
  res.json({ id: userId, name: '张三' });
});
```

**POST请求 - 提交数据**：
```javascript
// 需要先添加中间件来解析JSON
app.use(express.json());

// 创建新用户
app.post('/api/users', (req, res) => {
  const { name, role } = req.body;  // 获取请求体数据
  console.log('收到新用户:', name, role);
  res.json({ success: true, message: '创建成功' });
});
```

#### Day 5-7：练习项目

创建一个简单的待办事项API：
- GET /api/todos - 获取所有待办
- POST /api/todos - 添加待办
- DELETE /api/todos/:id - 删除待办

---

### 第3周：学习MySQL数据库

#### Day 1-2：数据库基础概念

**什么是数据库？**
- 存储数据的仓库
- 类似于Excel表格，但更强大

**基本术语**：
```
数据库(Database) = 一个Excel文件
表(Table)        = Excel中的一个工作表
行(Row)          = 表中的一条记录
列(Column)       = 表的一个字段
```

#### Day 3-4：SQL语句学习

**创建数据库和表**：
```sql
-- 创建数据库
CREATE DATABASE hotel_purchase;

-- 使用数据库
USE hotel_purchase;

-- 创建用户表
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  role ENUM('purchaser', 'boss', 'finance', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**增删改查（CRUD）**：
```sql
-- 插入数据 (Create)
INSERT INTO users (username, password, name, role) 
VALUES ('zhangsan', '123456', '张三', 'purchaser');

-- 查询数据 (Read)
SELECT * FROM users;                    -- 查询所有
SELECT * FROM users WHERE role = 'boss'; -- 条件查询

-- 更新数据 (Update)
UPDATE users SET name = '张三丰' WHERE id = 1;

-- 删除数据 (Delete)
DELETE FROM users WHERE id = 1;
```

#### Day 5-7：Node.js连接MySQL

**安装mysql2**：
```bash
npm install mysql2
```

**连接数据库**：
```javascript
const mysql = require('mysql2/promise');

// 创建连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '你的密码',
  database: 'hotel_purchase'
});

// 查询示例
async function getUsers() {
  const [rows] = await pool.query('SELECT * FROM users');
  return rows;
}

// 在Express中使用
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '数据库错误' });
  }
});
```

---

### 第4周：完整项目开发

这周我们把所有知识整合，完成采购系统的后端。

#### Day 1-2：用户认证系统

**JWT是什么？**
- JSON Web Token
- 用于用户登录后的身份验证
- 类似于"通行证"

**安装依赖**：
```bash
npm install jsonwebtoken bcryptjs
```

**注册和登录**：
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = 'your-secret-key';

// 注册
app.post('/api/register', async (req, res) => {
  const { username, password, name, role } = req.body;
  
  // 密码加密
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // 存入数据库
  await pool.query(
    'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, name, role]
  );
  
  res.json({ success: true });
});

// 登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  // 查找用户
  const [users] = await pool.query(
    'SELECT * FROM users WHERE username = ?',
    [username]
  );
  
  if (users.length === 0) {
    return res.status(401).json({ error: '用户不存在' });
  }
  
  const user = users[0];
  
  // 验证密码
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: '密码错误' });
  }
  
  // 生成Token
  const token = jwt.sign(
    { id: user.id, role: user.role },
    SECRET_KEY,
    { expiresIn: '7d' }
  );
  
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});
```

#### Day 3-5：核心业务API

开发采购申请、审批、报账等接口。
（详见 backend/routes/ 目录下的代码）

#### Day 6-7：前端对接

修改前端代码，使用fetch调用后端API。

---

### 第5周：部署上线

#### Day 1-2：购买云服务器

**推荐**：
- 阿里云ECS
- 腾讯云CVM
- 华为云ECS

**配置建议**：
- 2核4G内存
- 50G硬盘
- 带宽3-5Mbps
- 系统：CentOS 8 或 Ubuntu 20.04

#### Day 3-4：服务器环境配置

使用宝塔面板（推荐新手）：
```bash
# SSH登录服务器后执行
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh
```

安装：
- Nginx
- MySQL
- Node.js

#### Day 5-7：部署项目

详见 [DEPLOY.md](./DEPLOY.md)

---

## 📖 推荐学习资源

### 视频教程

| 主题 | 推荐 |
|------|------|
| Node.js入门 | B站搜索 "Node.js入门到精通" |
| Express框架 | B站搜索 "Express从入门到实战" |
| MySQL基础 | B站搜索 "MySQL数据库入门" |
| 服务器部署 | B站搜索 "宝塔面板部署Node.js" |

### 文档

| 主题 | 链接 |
|------|------|
| Node.js官方 | https://nodejs.org/zh-cn/docs/ |
| Express官方 | https://expressjs.com/zh-cn/ |
| MySQL教程 | https://www.runoob.com/mysql/mysql-tutorial.html |

### 遇到问题

1. **复制错误信息** → 百度/Google搜索
2. **看报错位置** → 检查那一行代码
3. **问AI** → 描述清楚问题和代码

---

## 💪 学习建议

1. **不要急** - 每个概念都要理解
2. **多动手** - 看懂不等于会用
3. **做笔记** - 记录踩过的坑
4. **坚持** - 遇到困难很正常

加油！您一定可以的！🎉
