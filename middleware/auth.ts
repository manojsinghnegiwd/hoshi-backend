import { RequestHandler } from 'express'
import { createClient, User } from '@supabase/supabase-js'

declare global {
  namespace Express {
    interface Request {
      user: User
    }
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export const authMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header' })
      return
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    // Attach user info to request
    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ error: 'Authentication failed' })
    return
  }
} 