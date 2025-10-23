import { NextResponse } from "next/server";

/**
 * Update existing Smartsheet rows
 * Expects: { sheetId, rows: [{ id, cells }] }
 */
export async function PUT(req: Request) {
    try {
        const { sheetId, rows } = await req.json();

        if (!sheetId || !rows) {
            return NextResponse.json({ error: "Missing sheetId or rows" }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_SMARTSHEET_TOKEN;
        const url = `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows`;

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(rows),
        });

        const data = await res.json();

        if (data.failedItems && data.failedItems.length) {
            console.error("❌ Smartsheet validation errors:", data.failedItems);
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("❌ Smartsheet update-row error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
