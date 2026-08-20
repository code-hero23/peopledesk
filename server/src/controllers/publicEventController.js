const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');

const DEFAULT_GAMES = [
    { name: 'Chess', playerCount: '2', emoji: '♟️' },
    { name: 'Carrom', playerCount: '4', emoji: '🎯' },
    { name: 'Wooden Block', playerCount: '2', emoji: '🪵' },
    { name: 'Interior Based Puzzle', playerCount: '4', emoji: '🧩' },
    { name: 'Ludo', playerCount: '6', emoji: '🎲' },
    { name: 'UNO', playerCount: '4 to 6', emoji: '🎴' }
];

// Helper to generate URL-safe slug
const generateSlug = (title) => {
    const clean = (title || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    return `${clean}-${Date.now().toString(36)}`;
};

// @desc    Create a new public game registration event
// @route   POST /api/public-events
// @access  Public (No Login)
exports.createEvent = async (req, res) => {
    const { title, description, games } = req.body;

    try {
        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Event title is required' });
        }

        const configuredGames = Array.isArray(games) && games.length > 0
            ? games.map(g => typeof g === 'string' ? { name: g, playerCount: '2', emoji: '🎮' } : g)
            : DEFAULT_GAMES;

        const slug = generateSlug(title);

        const event = await prisma.publicEvent.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : null,
                games: configuredGames,
                slug
            }
        });

        res.status(201).json({
            message: 'Event created successfully!',
            event
        });
    } catch (error) {
        console.error('Error creating public event:', error);
        res.status(500).json({ message: 'Failed to create event', error: error.message });
    }
};

// @desc    Get all active public events
// @route   GET /api/public-events
// @access  Public (No Login)
exports.getEvents = async (req, res) => {
    try {
        let events = await prisma.publicEvent.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: { responses: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // If no events exist yet, auto-create a default one with the requested games
        if (events.length === 0) {
            const defaultEvent = await prisma.publicEvent.create({
                data: {
                    title: 'Office Games Tournament 2026',
                    description: 'Select the games you want to participate in and join the fun!',
                    games: DEFAULT_GAMES,
                    slug: 'A7K9M2Q4X8P1L6Z3'
                },
                include: {
                    _count: { select: { responses: true } }
                }
            });
            events = [defaultEvent];
        }

        const formatted = events.map(e => ({
            ...e,
            totalResponses: e._count?.responses || 0
        }));

        res.status(200).json(formatted);
    } catch (error) {
        console.error('Error fetching public events:', error);
        res.status(500).json({ message: 'Failed to fetch events', error: error.message });
    }
};

// @desc    Get event details, live counts, and responses by ID or Slug
// @route   GET /api/public-events/:identifier
// @access  Public (No Login)
exports.getEventById = async (req, res) => {
    const { identifier } = req.params;

    try {
        const event = await prisma.publicEvent.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { slug: identifier }
                ]
            },
            include: {
                responses: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Compute game breakdown counts
        const gamesList = Array.isArray(event.games) ? event.games : DEFAULT_GAMES;
        const gameStats = {};

        gamesList.forEach(g => {
            const gameName = typeof g === 'string' ? g : g.name;
            gameStats[gameName] = {
                name: gameName,
                playerCount: typeof g === 'object' ? (g.playerCount || '-') : '-',
                emoji: typeof g === 'object' ? (g.emoji || '🎮') : '🎮',
                count: 0
            };
        });

        event.responses.forEach(r => {
            const selected = Array.isArray(r.selectedGames) ? r.selectedGames : [];
            selected.forEach(gameName => {
                if (gameStats[gameName]) {
                    gameStats[gameName].count += 1;
                } else {
                    gameStats[gameName] = {
                        name: gameName,
                        playerCount: '-',
                        emoji: '🎮',
                        count: 1
                    };
                }
            });
        });

        res.status(200).json({
            event: {
                id: event.id,
                slug: event.slug,
                title: event.title,
                description: event.description,
                games: gamesList,
                createdAt: event.createdAt
            },
            totalResponses: event.responses.length,
            gameStats: Object.values(gameStats),
            responses: event.responses
        });
    } catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).json({ message: 'Failed to fetch event', error: error.message });
    }
};

// @desc    Submit registration for a game event
// @route   POST /api/public-events/:identifier/register
// @access  Public (No Login)
exports.submitRegistration = async (req, res) => {
    const { identifier } = req.params;
    const { name, selectedGames } = req.body;

    try {
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Please enter your name' });
        }

        if (!Array.isArray(selectedGames) || selectedGames.length === 0) {
            return res.status(400).json({ message: 'Please select at least one game' });
        }

        const event = await prisma.publicEvent.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { slug: identifier }
                ]
            }
        });

        if (!event || !event.isActive) {
            return res.status(404).json({ message: 'Event not found or registration is closed' });
        }

        const response = await prisma.publicEventResponse.create({
            data: {
                eventId: event.id,
                name: name.trim(),
                selectedGames: selectedGames
            }
        });

        res.status(201).json({
            message: 'Registration successful! Best of luck for the games! 🎉',
            response
        });
    } catch (error) {
        console.error('Error submitting registration:', error);
        res.status(500).json({ message: 'Failed to submit registration', error: error.message });
    }
};

// @desc    Export Event Registrations to Multi-Sheet Excel File
// @route   GET /api/public-events/:identifier/export
// @access  Public (No Login)
exports.exportEventResponses = async (req, res) => {
    const { identifier } = req.params;

    try {
        const event = await prisma.publicEvent.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { slug: identifier }
                ]
            },
            include: {
                responses: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'PeopleDesk Event Hub';
        workbook.created = new Date();

        const gamesList = Array.isArray(event.games) ? event.games : DEFAULT_GAMES;

        // -------------------------------------------------------------
        // SHEET 1: MASTER LIST (ALL PARTICIPANTS)
        // -------------------------------------------------------------
        const masterSheet = workbook.addWorksheet('All Registrations');

        // Header Title
        const titleRow = masterSheet.addRow([`Event: ${event.title}`]);
        titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        masterSheet.mergeCells('A1:D1');
        masterSheet.getRow(1).height = 35;
        masterSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        masterSheet.addRow([`Total Participants: ${event.responses.length}`, '', `Generated: ${new Date().toLocaleString()}`, '']);
        masterSheet.mergeCells('A2:B2');
        masterSheet.mergeCells('C2:D2');
        masterSheet.addRow([]); // empty spacing

        const headerRow = masterSheet.addRow(['S.No', 'Player Name', 'Selected Games', 'Registered At']);
        headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        headerRow.height = 25;
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        event.responses.forEach((resp, idx) => {
            const gamesStr = Array.isArray(resp.selectedGames)
                ? resp.selectedGames.join(', ')
                : String(resp.selectedGames || '');
            const timeStr = resp.createdAt ? new Date(resp.createdAt).toLocaleString() : '-';

            const row = masterSheet.addRow([idx + 1, resp.name, gamesStr, timeStr]);
            row.alignment = { vertical: 'middle' };
            if (idx % 2 === 1) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
        });

        masterSheet.columns = [
            { width: 8 },
            { width: 30 },
            { width: 45 },
            { width: 25 }
        ];

        // -------------------------------------------------------------
        // SHEETS 2..N: INDIVIDUAL GAME SHEETS
        // -------------------------------------------------------------
        gamesList.forEach(g => {
            const gameName = typeof g === 'string' ? g : g.name;
            const playerCount = typeof g === 'object' ? (g.playerCount || '-') : '-';
            const emoji = typeof g === 'object' ? (g.emoji || '') : '';

            // Filter players who selected this game
            const players = event.responses.filter(r => {
                const list = Array.isArray(r.selectedGames) ? r.selectedGames : [];
                return list.includes(gameName);
            });

            // Safe tab name (Excel allows max 31 chars)
            const safeTabName = `${gameName}`.replace(/[/\\?*[\]]/g, '_').substring(0, 30);
            const gameSheet = workbook.addWorksheet(safeTabName);

            // Game Header
            const gTitle = gameSheet.addRow([`${emoji} ${gameName} (${playerCount} Players per match)`]);
            gTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            gTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            gameSheet.mergeCells('A1:C1');
            gameSheet.getRow(1).height = 30;
            gameSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            gameSheet.addRow([`Total Registered Players: ${players.length}`, '', `Match Size: ${playerCount} Players`]);
            gameSheet.mergeCells('A2:B2');
            gameSheet.addRow([]);

            const gHeader = gameSheet.addRow(['S.No', 'Player Name', 'Registered At']);
            gHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            gHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
            gHeader.height = 24;
            gHeader.alignment = { vertical: 'middle', horizontal: 'center' };

            players.forEach((p, pIdx) => {
                const pTime = p.createdAt ? new Date(p.createdAt).toLocaleString() : '-';
                const pRow = gameSheet.addRow([pIdx + 1, p.name, pTime]);
                pRow.alignment = { vertical: 'middle' };
                if (pIdx % 2 === 1) {
                    pRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
                }
            });

            gameSheet.columns = [
                { width: 8 },
                { width: 32 },
                { width: 25 }
            ];
        });

        const safeTitle = event.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
        const filename = `Games_Registration_${safeTitle}_${Date.now()}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting event registrations to Excel:', error);
        res.status(500).json({ message: 'Failed to export Excel spreadsheet', error: error.message });
    }
};
