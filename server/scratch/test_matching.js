const allUsers = [
    { id: 1, name: 'Aravind S', biometricId: null },
    { id: 2, name: 'Aravindan S', biometricId: null }
];

const findUserOriginal = (name, bioId) => {
    if (bioId) {
        const idMatch = allUsers.find(u => u.biometricId === bioId.toString().trim());
        if (idMatch) return idMatch;
    }

    if (!name) return null;
    
    const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const cleanInput = clean(name);
    if (!cleanInput) return null;

    let match = allUsers.find(u => clean(u.name) === cleanInput);
    if (match) return match;

    const inputWords = name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
    
    match = allUsers.find(u => {
        const userWords = u.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
        
        return inputWords.some(iw => 
            userWords.some(uw => {
                const min = Math.min(iw.length, uw.length, 5);
                return iw.substring(0, min) === uw.substring(0, min) || 
                        uw.includes(iw) || iw.includes(uw);
            })
        );
    });

    return match;
};

const findUserNew = (name, bioId) => {
    if (bioId) {
        const idMatch = allUsers.find(u => u.biometricId === bioId.toString().trim());
        if (idMatch) return idMatch;
    }

    if (!name) return null;
    
    const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const cleanInput = clean(name);
    if (!cleanInput) return null;

    // 2. Exact clean match
    let match = allUsers.find(u => clean(u.name) === cleanInput);
    if (match) return match;

    // 3. Exact match after removing single-letter initials/titles
    const cleanInitials = (s) => {
        return s.toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(w => w.length > 1)
            .join('');
    };
    const cleanInputInitials = cleanInitials(name);
    if (cleanInputInitials) {
        match = allUsers.find(u => cleanInitials(u.name) === cleanInputInitials);
        if (match) return match;
    }

    // 4. Word-based matching (Relaxed)
    const inputWords = name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
    
    match = allUsers.find(u => {
        const userWords = u.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
        
        return inputWords.some(iw => 
            userWords.some(uw => {
                const min = Math.min(iw.length, uw.length, 5);
                return iw.substring(0, min) === uw.substring(0, min) || 
                        uw.includes(iw) || iw.includes(uw);
            })
        );
    });

    return match;
};

console.log("Original match for 'Aravindan':", findUserOriginal('Aravindan'));
console.log("New match for 'Aravindan':", findUserNew('Aravindan'));

console.log("Original match for 'Aravind':", findUserOriginal('Aravind'));
console.log("New match for 'Aravind':", findUserNew('Aravind'));
