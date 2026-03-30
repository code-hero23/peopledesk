const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('DEBUG: Received token:', token ? token.substring(0, 10) + '...' : 'NONE');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, name: true, email: true, role: true, designation: true, status: true, reportingBhId: true, isGlobalAccess: true, wfhViewEnabled: true },
            });

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            if (req.user.status === 'BLOCKED') {
                return res.status(403).json({ message: 'Account is blocked. Contact Admin.' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else if (req.query.token) {
        // Fallback for Download Links (query param)
        try {
            token = req.query.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, name: true, email: true, role: true, designation: true, status: true, reportingBhId: true, isGlobalAccess: true, wfhViewEnabled: true },
            });

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            if (req.user.status === 'BLOCKED') {
                return res.status(403).json({ message: 'Account is blocked. Contact Admin.' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        // Flatten in case an array was passed
        const requiredRoles = roles.flat();

        if (!requiredRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`,
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
