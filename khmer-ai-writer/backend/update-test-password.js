const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'khmer_ai_writer',
  user: 'postgres',
  password: 'postgres'
});

async function updatePassword() {
  const password = 'password123';
  const email = 'menghoutchhon003@gmail.com';
  
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hash);
  
  // Update in database
  await pool.query(
    'UPDATE users SET password_hash = $1 WHERE email = $2',
    [hash, email]
  );
  
  console.log(`✓ Password updated for ${email}`);
  
  // Verify it works
  const result = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
  const isValid = await bcrypt.compare(password, result.rows[0].password_hash);
  console.log('Verification:', isValid ? '✓ Success' : '✗ Failed');
  
  await pool.end();
}

updatePassword().catch(console.error);
