import { otpService } from '../services/auth/otp.service';
import { config } from '../config/env';

async function testEmailService() {
  console.log('=== Email Service Test ===\n');

  // Check configuration
  console.log('Configuration:');
  console.log(`- SendGrid API Key: ${config.email?.sendgridApiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`- From Email: ${config.email?.fromEmail || 'Not configured'}`);
  console.log(`- From Name: ${config.email?.fromName || 'Not configured'}\n`);

  if (!config.email?.sendgridApiKey) {
    console.log('⚠️  WARNING: SendGrid API key not configured');
    console.log('Email will be logged to console instead of sent.\n');
    console.log('To configure SendGrid:');
    console.log('1. Get API key from https://app.sendgrid.com/settings/api_keys');
    console.log('2. Add to .env: SENDGRID_API_KEY=SG.your-api-key');
    console.log('3. Set EMAIL_FROM to your verified sender email\n');
  }

  // Test email
  const testEmail = process.argv[2] || 'test@example.com';
  console.log(`Testing OTP email to: ${testEmail}\n`);

  console.log('Generating and sending OTP...');
  const result = await otpService.generateAndSendOTP(testEmail);

  console.log('\nResult:');
  console.log(`- Success: ${result.success ? '✅' : '❌'}`);
  console.log(`- Message: ${result.message}\n`);

  if (result.success) {
    console.log('✅ Email service is working correctly!');
    if (config.email?.sendgridApiKey) {
      console.log(`\nCheck your inbox at ${testEmail} for the OTP code.`);
      console.log('Note: Email may take a few seconds to arrive.');
      console.log('Check spam folder if not received within 1 minute.\n');
    } else {
      console.log('\nCheck console output above for the OTP code (development mode).\n');
    }
  } else {
    console.log('❌ Email service test failed!');
    console.log('\nTroubleshooting:');
    console.log('1. Verify SendGrid API key is correct');
    console.log('2. Ensure sender email is verified in SendGrid');
    console.log('3. Check SendGrid dashboard for error details');
    console.log('4. Review backend logs for specific error messages\n');
  }

  process.exit(result.success ? 0 : 1);
}

testEmailService().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
