// Environment configuration
export default {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-secret-key-not-for-production';
  })(),
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  emailVerificationExpiration: 24 * 60 * 60 * 1000, // 24 hours
  uploadsDir: process.env.UPLOADS_DIR || './uploads',
  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@nyrbingo.com'
  }
};
