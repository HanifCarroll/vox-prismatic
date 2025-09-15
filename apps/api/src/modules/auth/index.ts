// Export routes

// Export auth functions and types
export {
  extractBearerToken,
  generateToken,
  getUserById,
  type JWTPayload,
  type LoginDto,
  loginUser,
  type RegisterDto,
  registerUser,
  type UserDto,
  verifyToken,
} from './auth'

// Export middleware
export { authMiddleware } from './auth.middleware'
export { authRoutes } from './auth.routes'
