// Export routes

// Export auth functions and types
export {
  getUserById,
  type LoginDto,
  loginUser,
  type RegisterDto,
  registerUser,
  type UserDto,
} from './auth'

// Export middleware
export { authMiddleware } from './auth.middleware'
export { authRoutes } from './auth.routes'
