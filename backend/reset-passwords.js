const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetPasswords() {
  // 生成 admin123 的哈希
  const hash = await bcrypt.hash('admin123', 10);
  console.log('新密码哈希:', hash);
  
  // 更新所有用户密码
  await db.execute('UPDATE users SET password = ?', [hash]);
  console.log('所有用户密码已重置为: admin123');
  
  process.exit(0);
}

resetPasswords();