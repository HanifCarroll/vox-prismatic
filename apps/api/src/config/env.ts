import dotenv from 'dotenv'
import { z } from 'zod'
import { validateSecretEntropy } from '@/utils/crypto'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_AI_API_KEY: z.string(),
  CORS_ORIGIN: z.string().url().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().url().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  DISABLE_RATE_LIMIT: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

// Parse and validate environment variables
const parseEnv = () => {
  try {
    const env = envSchema.parse(process.env)

    // Additional validation for JWT_SECRET entropy
    const jwtSecretValidation = validateSecretEntropy(env.JWT_SECRET)
    if (!jwtSecretValidation.isValid) {
      console.error('❌ JWT_SECRET validation failed:')
      jwtSecretValidation.errors.forEach((err) => console.error(`   - ${err}`))
      console.error(`   Current entropy: ${jwtSecretValidation.entropy.toFixed(2)} bits`)
      console.error(`   Required entropy: ${jwtSecretValidation.minRequired} bits`)
      console.error('\nGenerate a secure secret with:')
      console.error('   openssl rand -base64 64')
      console.error('   or')
      console.error(
        "   node -e \"console.log(require('crypto').randomBytes(64).toString('base64'))\"",
      )

      // Only enforce in production, warn in development
      if (env.NODE_ENV === 'production') {
        process.exit(1)
      } else {
        console.error(
          '\n⚠️  WARNING: Weak JWT_SECRET detected. This must be fixed before production deployment!',
        )
      }
    }

    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:')
      console.error(error.format())
      process.exit(1)
    }
    throw error
  }
}

export const env = parseEnv()
