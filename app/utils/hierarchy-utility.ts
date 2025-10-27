import hierarchyMapping from '@/hierarchy-mapping.json';

export function extractAllPlantsFromMapping(hierarchy: any = hierarchyMapping): string[] {
    const allPlants: string[] = [];
    try {
        const segments = hierarchy?.segments || {};
        for (const segmentKey in segments) {
            const platforms = segments[segmentKey]?.platforms || {};
            for (const platformKey in platforms) {
                const regions = platforms[platformKey]?.regions || {};
                for (const regionKey in regions) {
                    const divisions = regions[regionKey]?.divisions || {};
                    for (const divisionKey in divisions) {
                        const plants = divisions[divisionKey] || [];
                        if (Array.isArray(plants)) allPlants.push(...plants);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[extractAllPlantsFromMapping] error:', err);
    }
    return [...new Set(allPlants)].sort();
}

export function extractPlantsBySegment(hierarchy: any = hierarchyMapping, segmentName: string): string[] {
    const result: string[] = [];
    const cleanSeg = segmentName.toLowerCase().replace(/\s+/g, '');
    try {
        const segments = hierarchy?.segments || {};
        for (const segKey in segments) {
            if (segKey.toLowerCase().replace(/\s+/g, '').includes(cleanSeg)) {
                const platforms = segments[segKey]?.platforms || {};
                for (const platKey in platforms) {
                    const regions = platforms[platKey]?.regions || {};
                    for (const regKey in regions) {
                        const divisions = regions[regKey]?.divisions || {};
                        for (const divKey in divisions) {
                            const plants = divisions[divKey];
                            if (Array.isArray(plants)) result.push(...plants);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('[extractPlantsBySegment] error:', err);
    }
    return [...new Set(result)].sort();
}

export function extractPlantsByPlatform(hierarchy: any = hierarchyMapping, platformName: string): string[] {
    const result: string[] = [];
    const cleanPlat = platformName.toLowerCase().replace(/\s+/g, '');
    try {
        const segments = hierarchy?.segments || {};
        for (const segKey in segments) {
            const platforms = segments[segKey]?.platforms || {};
            for (const platKey in platforms) {
                if (platKey.toLowerCase().replace(/\s+/g, '').includes(cleanPlat)) {
                    const regions = platforms[platKey]?.regions || {};
                    for (const regKey in regions) {
                        const divisions = regions[regKey]?.divisions || {};
                        for (const divKey in divisions) {
                            const plants = divisions[divKey];
                            if (Array.isArray(plants)) result.push(...plants);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('[extractPlantsByPlatform] error:', err);
    }
    return [...new Set(result)].sort();
}

export function findMatchingDivisionPlants(hierarchy: any = hierarchyMapping, divisionHierarchy: string): string[] {
    const results: string[] = [];
    if (!divisionHierarchy) return [];
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const targetDiv = norm(divisionHierarchy.split('>').pop() || '');
    try {
        const segments = hierarchy?.segments || {};
        for (const segKey in segments) {
            const platforms = segments[segKey]?.platforms || {};
            for (const platKey in platforms) {
                const regions = platforms[platKey]?.regions || {};
                for (const regKey in regions) {
                    const divisions = regions[regKey]?.divisions || {};
                    for (const divKey in divisions) {
                        if (norm(divKey).includes(targetDiv)) {
                            const plants = divisions[divKey];
                            if (Array.isArray(plants)) results.push(...plants);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('[findMatchingDivisionPlants] error:', err);
    }
    return [...new Set(results)].sort();
}

export function getPlantsForUser(hierarchy: any = hierarchyMapping, userPlant: string): string[] {
    const all = extractAllPlantsFromMapping(hierarchy);
    const lower = userPlant.toLowerCase();
    const matches = all.filter(p => p.toLowerCase().includes(lower) || lower.includes(p.toLowerCase()));
    return matches.length ? matches : [];
}
