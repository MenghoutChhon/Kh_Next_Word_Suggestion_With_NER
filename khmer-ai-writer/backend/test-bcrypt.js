const bcrypt = require('bcryptjs');

async function test() {
  const password = 'password123';
  const hash = '$2a$10$NDLpbhpPIUpT0PGSCaCFTeT2jdiGgabKNC9yvjZcrd1boNFoc9aPe';
  
  console.log('Testing password:', password);
  console.log('Against hash:', hash);
  
  const isValid = await bcrypt.compare(password, hash);
  console.log('Is valid:', isValid);
  
  // Generate new hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash:', newHash);
}

test();
