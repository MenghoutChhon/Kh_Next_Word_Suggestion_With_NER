import dotenv from 'dotenv';

dotenv.config();

export const config = {
	port: Number(process.env.PORT || 8080),
	nodeEnv: process.env.NODE_ENV || 'development',

	database: {
		url: process.env.DATABASE_URL || '',
	},

	redis: {
		host: process.env.REDIS_HOST || 'localhost',
		port: Number(process.env.REDIS_PORT || 6380),
		password: process.env.REDIS_PASSWORD || undefined,
	},

	jwt: {
		accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'please-change-me',
		refreshSecret: process.env.JWT_REFRESH_SECRET || '',
		accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
		refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
	},

	aws: {
		region: process.env.AWS_REGION || 'us-east-1',
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY || '',
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY || '',
		s3Bucket: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || '',
	},

	stripe: {
		secretKey: process.env.STRIPE_SECRET_KEY || '',
		webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
	},

	mlService: {
		url: process.env.ML_SERVICE_URL || 'http://localhost:8000',
	},

	email: {
		sendgridApiKey: process.env.SENDGRID_API_KEY || '',
		fromEmail: process.env.EMAIL_FROM || 'noreply@malwaredetection.com',
		fromName: process.env.EMAIL_FROM_NAME || 'Malware Detection AI',
		replyTo: process.env.EMAIL_REPLY_TO || '',
	},

	app: {
		frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
		backendUrl: process.env.BACKEND_URL || 'http://localhost:8080',
	},

	// per-plan rate limits used by application logic
	rateLimits: {
		free: { daily: Number(process.env.RATE_LIMIT_FREE_DAILY || 10), hourly: Number(process.env.RATE_LIMIT_FREE_HOURLY || 5) },
		premium: { daily: Number(process.env.RATE_LIMIT_PREMIUM_DAILY || 100), hourly: Number(process.env.RATE_LIMIT_PREMIUM_HOURLY || 50) },
		business: { daily: Number(process.env.RATE_LIMIT_BUSINESS_DAILY || -1), hourly: Number(process.env.RATE_LIMIT_BUSINESS_HOURLY || 200) },
		enterprise: { daily: Number(process.env.RATE_LIMIT_ENTERPRISE_DAILY || -1), hourly: Number(process.env.RATE_LIMIT_ENTERPRISE_HOURLY || -1) },
	},

	// express global limiter defaults (keeps compatibility with previous setup)
	expressRateLimit: {
		windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
		max: Number(process.env.RATE_LIMIT_MAX || 500),
	},
};
