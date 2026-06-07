import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_KEY are required')
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false },
    db: { schema: 'public' }
})

// Retry wrapper for Supabase queries
// Usage: const result = await withRetry(db => db.from('table').select('*'))
const withRetry = async (queryFn, retries = 3, delay = 500) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await queryFn(supabase)
            if (result.error) throw result.error
            return result
        } catch (err) {
            if (attempt === retries) throw err
            await new Promise(res => setTimeout(res, delay * attempt))
        }
    }
}

export { withRetry }
export default supabase
