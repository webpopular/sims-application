import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheetId");

    if (!sheetId) {
      return NextResponse.json({ error: "Missing sheetId" }, { status: 400 });
    }

    const token = process.env.NEXT_PUBLIC_SMARTSHEET_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Missing Smartsheet API key" }, { status: 500 });
    }

    const res = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    // Simplify payload
    const columns = data.columns.map((c: any) => ({
      title: c.title,
      id: c.id,
      type: c.type,
    }));

    return NextResponse.json({ columns });
  } catch (err: any) {
    console.error("❌ Error fetching columns:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
