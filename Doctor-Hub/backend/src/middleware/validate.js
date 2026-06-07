import validator from 'validator'

/**
 * Central validation middleware.
 * schema.body / schema.params / schema.query — field rules:
 * required, email, minLength, maxLength, isIn, isUUID, isArray, custom(fn)
 */
export function validate(schema = {}) {
  return (req, res, next) => {
    const errors = []

    const checkSection = (source, rules, label) => {
      if (!rules) return
      for (const [field, rule] of Object.entries(rules)) {
        const val = source[field]
        const display = `${label}.${field}`

        if (rule.required && (val === undefined || val === null || val === '')) {
          errors.push(`${display} is required`)
          continue
        }
        if (val === undefined || val === null || val === '') continue

        if (rule.email && !validator.isEmail(String(val))) {
          errors.push(`${display} must be a valid email`)
        }
        if (rule.isUUID && !validator.isUUID(String(val))) {
          errors.push(`${display} must be a valid UUID`)
        }
        if (rule.minLength != null && String(val).length < rule.minLength) {
          errors.push(`${display} must be at least ${rule.minLength} characters`)
        }
        if (rule.maxLength != null && String(val).length > rule.maxLength) {
          errors.push(`${display} must be at most ${rule.maxLength} characters`)
        }
        if (rule.isIn && !rule.isIn.includes(val)) {
          errors.push(`${display} must be one of: ${rule.isIn.join(', ')}`)
        }
        if (rule.isArray && !Array.isArray(val)) {
          errors.push(`${display} must be an array`)
        }
        if (rule.custom) {
          const msg = rule.custom(val, source)
          if (msg) errors.push(msg)
        }
      }
    }

    checkSection(req.body, schema.body, 'body')
    checkSection(req.params, schema.params, 'params')
    checkSection(req.query, schema.query, 'query')

    if (typeof schema.validate === 'function') {
      const msg = schema.validate(req)
      if (msg) errors.push(msg)
    }

    if (errors.length) {
      return res.status(400).json({
        message: errors[0],
        errors,
      })
    }
    next()
  }
}

export const schemas = {
  forgotPassword: {
    body: {
      email: { required: true, email: true },
    },
  },
  resetPassword: {
    body: {
      token: { required: true, minLength: 32 },
      password: { required: true, minLength: 6 },
      confirm_password: { required: true, minLength: 6 },
    },
  },
  register: {
    body: {
      full_name: { minLength: 2, maxLength: 120 },
      name: { minLength: 2, maxLength: 120 },
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      role: { required: true, isIn: ['patient', 'doctor'] },
      phone: { required: true, minLength: 7, maxLength: 20 },
    },
    validate(req) {
      const n = (req.body.full_name || req.body.name || '').trim()
      if (!n) return 'Name is required (full_name or name)'
      if (n.length < 2) return 'Name must be at least 2 characters'
      return null
    },
  },
  login: {
    body: {
      email: { required: true, email: true },
      password: { required: true, minLength: 1 },
    },
  },
  uploadPatientReport: {
    body: {
      title: { required: true, minLength: 2, maxLength: 200 },
      description: { maxLength: 2000 },
    },
  },
  createAssistant: {
    body: {
      full_name: { required: true, minLength: 2, maxLength: 120 },
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      phone: { required: true, minLength: 7, maxLength: 20 },
      doctorId: { isUUID: true },
    },
  },
  assignAssistant: {
    body: {
      doctorId: { required: true, isUUID: true },
      assistantUserId: { required: true, isUUID: true },
    },
  },
}
