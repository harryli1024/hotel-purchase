const bcrypt = require('bcryptjs');

async function test() {
  // 生成密码哈希
  const hash = await bcrypt.hash('admin123', 10);
  console.log('新密码哈希:', hash);
  
  // 验证
  const isValid = await bcrypt.compare('admin123', hash);
  console.log('验证结果:', isValid);
}

test();