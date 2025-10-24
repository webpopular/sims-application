/** Cache live column maps so we only fetch once per sheet */
type ColumnMeta = { id: number; type: string };
const COLUMN_CACHE: Record<string, Record<string, ColumnMeta>> = {};

/** Each plant or location sheet id */
export const SHEET_IDS: Record<string, string> = {
    TROY: "2662923852795780",
    // Add more sheets as needed
};

/** Fetch live column IDs from our API (server-side proxy) */
async function getSmartsheetColumnMap(sheetId: string): Promise<Record<string, ColumnMeta>> {
    if (COLUMN_CACHE[sheetId]) return COLUMN_CACHE[sheetId];

    const res = await fetch(`/api/smartsheet/get-columns?sheetId=${sheetId}`);
    if (!res.ok) throw new Error(`Failed to fetch column map (${res.status})`);
    const data = await res.json();

    const map: Record<string, ColumnMeta> = {};
    for (const col of data.columns) {
        map[col.title.trim()] = { id: col.id, type: col.type };
    }
    COLUMN_CACHE[sheetId] = map;
    console.log(`🧩 Loaded ${Object.keys(map).length} columns for sheet ${sheetId}`);
    return map;
}

/** Send a new injury record to Smartsheet */
export async function sendInjuryToSmartsheet(location: string, formData: any) {
    const sheetId = SHEET_IDS[location.toUpperCase()] || SHEET_IDS.TROY;
    const columns = await getSmartsheetColumnMap(sheetId);
    const cells: any[] = [];

    const pushCell = (title: string, value?: any) => {
        if (value === undefined || value === null || value === "") return;

        const col = columns[title];
        if (!col) {
            console.warn(`⚠️ No column found for "${title}"`);
            return;
        }

        let normalized = value;

        switch (col.type) {
            case "DATE":
                if (typeof value === "string") normalized = value.slice(0, 10);
                if (value instanceof Date) normalized = value.toISOString().slice(0, 10);
                break;
            case "CHECKBOX":
                normalized = value === true || value === "Yes" ? true : false;
                break;
            case "PICKLIST":
                normalized = String(value).trim();
                break;
            case "TEXT_NUMBER":
                if (Array.isArray(value)) normalized = value.join(", ");
                if (typeof value === "object") normalized = JSON.stringify(value);
                normalized = String(normalized);
                break;
            default:
                normalized = String(value);
                break;
        }

        cells.push({ columnId: col.id, value: normalized });
    };


    // --- Map SIMS fields ---
    pushCell("First Name", formData.firstName);
    pushCell("Last Name", formData.lastName);
    pushCell("Employee ID", formData.employeeId);
    pushCell("Phone Number", formData.phoneNumber);
    pushCell("Street Address", formData.streetAddress);
    pushCell("City", formData.city);
    pushCell("State", formData.state);
    pushCell("Zip Code", formData.zipCode);
    pushCell("Date of Birth", formData.dateOfBirth);
    pushCell("Date Hired", formData.dateHired);
    pushCell("Sex", formData.sex);
    pushCell("Age Range", formData.ageRange);
    pushCell("Employee Type", formData.employeeType);
    pushCell("Experience at ITW", formData.tenure);
    pushCell("Experience in Role", formData.experience);
    pushCell("Division", formData.division);
    pushCell("Platform", formData.platform);
    pushCell("LOCATION", formData.locationOnSite || location);
    pushCell("Date of Incident", formData.dateOfIncident);
    pushCell("Incident Category/Type", formData.incidentCategory);
    pushCell("Body Part Injured", formData.injuredBodyPart);
    pushCell("Injury Category", formData.injuryCategory);
    pushCell("Injury Type", formData.injuryType);
    pushCell("Incident Description", formData.incidentDescription);
    pushCell("Injury Description", formData.injuryDescription);
    pushCell("COVID-19", formData.isCovidRelated ? "Yes" : "No");
    pushCell("Supervisor Notified", formData.supervisorNotified ? "Yes" : "No");
    pushCell("Investigation Status", formData.investigationStatus);
    pushCell("Submission Type", "Injury");
    pushCell("Record Type", "Injury Report");
    pushCell("Submission Location", location);
    pushCell("Created At", new Date().toISOString().slice(0, 10));
    pushCell("Created By", formData.createdByName);

    console.log("📦 Sending cells:", JSON.stringify(cells, null, 2));

    const response = await fetch("/api/smartsheet/add-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sheetId,
            rows: [
                { toTop: true, cells },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Smartsheet API failed: ${errorText}`);
    }

    const result = await response.json();
    console.log("🟢 Smartsheet sync successful:", result);
    return result;
}
