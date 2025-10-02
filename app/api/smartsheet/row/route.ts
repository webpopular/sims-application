import {NextResponse} from "next/server";
import {generateClient} from "aws-amplify/data";
import type {Schema} from "@/amplify/data/schema";

const client = generateClient<Schema>();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const row = body.row ?? body; // support direct row or wrapped { row }

        if (!row?.cells) {
            return NextResponse.json(
                { status: "error", message: "Invalid Smartsheet payload" },
                { status: 400 }
            );
        }

        // Flatten { "Column Name": { columnId, value, displayValue } }
        const mapped: Record<string, any> = {};
        for (const [colName, cell] of Object.entries(row.cells)) {
            mapped[colName] =
                (cell as any).value ??
                (cell as any).displayValue ??
                null;
        }

        // Look for SIMS Auto Record ID → if present, update instead of create
        const simsId = mapped["SIMS Auto Record ID"];

        let result;
        if (simsId) {
            result = await client.models.SmartsheetInjury.update({
                id: String(simsId),
                dateOfIncident: mapped["Date of Incident"],
                timeOfIncident: mapped["Time of Incident"],
                incidentDescription: mapped["Incident Description"],
                injuryDescription: mapped["Injury Description"],
                bodyPartInjured: mapped["Body Part Injured"],
                injuryCategory: mapped["Injury Category"],
                incidentCategory: mapped["Incident Category"],
                updatedAt: new Date().toISOString(),
            });
        } else {
            result = await client.models.SmartsheetInjury.create({
                dateOfIncident: mapped["Date of Incident"],
                timeOfIncident: mapped["Time of Incident"],
                incidentDescription: mapped["Incident Description"],
                injuryDescription: mapped["Injury Description"],
                bodyPartInjured: mapped["Body Part Injured"],
                injuryCategory: mapped["Injury Category"],
                incidentCategory: mapped["Incident Category"],
                createdAt: new Date().toISOString(),
                sheetId: row.sheetId?.toString(),
                rowId: row.id?.toString(),
                lastSyncedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            status: "ok",
            id: result.data?.id ?? simsId,
            message: simsId
                ? `Updated incident (SIMS ID ${simsId})`
                : `Created new incident (ID ${result.data?.id})`,
        });
    } catch (err: any) {
        console.error("Smartsheet intake error:", err);
        return NextResponse.json(
            { status: "error", error: err.message },
            { status: 500 }
        );
    }
}
