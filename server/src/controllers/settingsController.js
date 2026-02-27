const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get all global settings
// @route   GET /api/settings
// @access  Private (Admin)
const getSettings = async (req, res) => {
    try {
        const settings = await prisma.globalSetting.findMany();
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(settingsMap);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update or Create a global setting
// @route   POST /api/settings
// @access  Private (Admin)
const updateSetting = async (req, res) => {
    const { key, value } = req.body;

    if (!key) {
        return res.status(400).json({ message: 'Key is required' });
    }

    try {
        const setting = await prisma.globalSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
        });
        res.json(setting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getSettings,
    updateSetting,
};
