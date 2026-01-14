# PM - Malware Detection Platform

A comprehensive malware detection platform with ML-powered scanning, team management, and tiered subscriptions.

## Features

- 🔐 **Authentication**: Secure signup/login with OTP email verification
- 🛡️ **ML Scanning**: File, URL, and image malware detection
- 👥 **Team Management**: Invite team members, assign roles
- 💳 **Subscriptions**: Free, Premium, Business tiers with usage tracking
- 🔑 **API Keys**: Generate and manage API keys for integrations
- 📊 **Real-time Metrics**: Track scans, storage, API calls, threats

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- SendGrid account (for email OTP - optional for development)

### Backend Setup

1. **Navigate to backend**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (see `.env.example`):
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. **Set up database**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Configure email service** (optional):
   - See [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md) for detailed instructions
   - Without SendGrid, OTP codes will be logged to console

6. **Start server**:
   ```bash
   npm run dev
   # Backend runs on http://localhost:6969
   ```

### Frontend Setup

1. **Navigate to frontend**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

4. **Access application**:
   - Open http://localhost:3000 in your browser
   - Sign up with email and verify OTP code

## Email Service Setup

The application requires email service for OTP verification. See [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md) for:

- SendGrid account creation
- API key generation
- Sender email verification
- Testing email delivery
- Troubleshooting guide

**Quick Setup**:
```bash
# 1. Get SendGrid API key from https://app.sendgrid.com/settings/api_keys
# 2. Add to backend/.env:
SENDGRID_API_KEY=SG.your-api-key-here
EMAIL_FROM=noreply@yourdomain.com

# 3. Test email service:
cd backend
npm run test:email your-email@example.com
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Environment & service configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API routes
│   ├── services/
│   │   ├── auth/        # Authentication, OTP, user management
│   │   ├── core/        # Database, queue, S3, webhooks
│   │   ├── scan/        # ML scanning, heuristics
│   │   ├── payment/     # Billing, subscriptions
│   │   └── ml/          # ML model integration
│   └── tests/           # Test scripts
├── prisma/
│   └── schema.prisma    # Database schema
└── .env                 # Environment variables

frontend/
├── app/                 # Next.js app directory
├── components/
│   ├── auth/            # Login, AuthGuard
│   ├── dashboard/       # Dashboard views, metrics
│   ├── payment/         # Pricing, checkout
│   ├── scanner/         # Threat scanner, reports
│   └── ui/              # Shadcn UI components
└── lib/                 # API client, utilities
```

## Environment Variables

### Backend Required
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/khmer_ai_writer
JWT_ACCESS_SECRET=your-secret-key
PORT=6969
```

### Backend Optional (Development)
```env
SENDGRID_API_KEY=SG.xxx  # OTP emails (or logged to console)
EMAIL_FROM=noreply@yourdomain.com
ML_FILE_MODEL_URL=http://localhost:5000/api/scan/file
ML_URL_MODEL_URL=http://localhost:5000/api/scan/url
ML_IMAGE_MODEL_URL=http://localhost:5000/api/scan/image
ML_KHMER_LM_URL=http://localhost:5000
ML_KHMER_NER_URL=http://localhost:5001
```

Note: the NER service runs separately; set `ML_KHMER_NER_URL` to wherever your Khmer NER API is hosted.

See `.env.example` for complete list.

## Documentation

- [Email Setup Guide](docs/EMAIL_SETUP.md) - SendGrid configuration
- [Reorganization Summary](docs/REORGANIZATION_SUMMARY.md) - File structure changes
- [Styling Fixes](docs/STYLING_FIXES.md) - Color system updates
- [Quick Reference](docs/QUICK_REFERENCE.md) - Import path guide

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register with OTP verification
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/login` - Login
- `POST /api/auth/resend-otp` - Resend OTP

### User
- `GET /api/users/metrics` - Usage statistics
- `GET /api/users/profile` - User profile
- `PUT /api/users/profile` - Update profile

### Scanning
- `POST /api/ml-scan/file` - Scan file for malware
- `POST /api/ml-scan/url` - Scan URL
- `POST /api/ml-scan/image` - Scan image

### Team
- `POST /api/teams/invite` - Invite team member
- `GET /api/teams/members` - List members
- `DELETE /api/teams/members/:id` - Remove member

### API Keys
- `POST /api/apikey/create` - Generate API key
- `GET /api/apikey/list` - List API keys
- `DELETE /api/apikey/:id` - Revoke API key

### Language Models
- `POST /api/lm/suggest` - Top-k next word suggestions
- `POST /api/ner/extract` - Khmer named entity extraction

### Payment
- `POST /api/payment/process` - Process subscription payment
- `GET /api/billing/history` - Transaction history

## Testing

### Test Email Service
```bash
cd backend
npm run test:email your-email@example.com
```

### Run Backend Tests
```bash
cd backend
npm test
```

## Development Mode

Without SendGrid configured:
- OTP codes are logged to backend console
- Copy code from console output to verify signup
- All other features work normally

Example console output:
```
[DEV] OTP for user@example.com: 123456
[WARNING] SendGrid API key not configured. OTP email not sent.
```

## Production Deployment

1. **Database**: Set up PostgreSQL production instance
2. **Email**: Configure SendGrid with verified domain
3. **Environment**: Set production environment variables
4. **Build**:
   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```
5. **Deploy**: Use PM2, Docker, or your preferred deployment method

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment guide.

## Subscription Tiers

| Feature | Free | Premium | Business |
|---------|------|---------|----------|
| Scans/month | 50 | 1,000 | Unlimited |
| API Calls | 0 | 2,000 | 10,000 |
| Team Members | 1 | 5 | 20 |
| Storage | 100 MB | 10 GB | 100 GB |
| Support | Community | Email | Priority |

## Troubleshooting

### Backend won't start
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Run `npx prisma migrate dev`

### OTP emails not received
- Check spam folder
- Verify SendGrid API key
- Ensure sender email is verified
- See [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md)

### Import errors after reorganization
- See [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) for new import paths

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Support

- Email: support@malwaredetection.com
- Documentation: [docs/](docs/)
- Issues: GitHub Issues
