import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { sheetId, rows } = await req.json();

        if (!sheetId || !rows) {
            return NextResponse.json({ error: "Missing sheetId or rows" }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_SMARTSHEET_TOKEN;
        const url = `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows?include=validationResults`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(rows), // ✅ send array, not object
        });

        const data = await res.json();

        // Check for validation issues
        if (data.failedItems && data.failedItems.length) {
            console.error("❌ Smartsheet validation errors:", data.failedItems);
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("❌ Smartsheet add-row error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
