import jwt from 'jsonwebtoken'

const authUser = async (req, res, next) => {
    const { token } = req.headers
    if (!token) return res.json({ success: false, message: 'Not Authorized Login Again' })
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (!req.body) req.body = {}
        req.body.userId = decoded.id
        next()
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export default authUser
