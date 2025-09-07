// app/api/smartsheet/sync-to-db/route.ts
// Example: /api/smartsheet/sync-to-db?sheetType=SHAKEPROOF_NA_OBSERVATION

import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from '../config';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// ---- Server envs (NO NEXT_PUBLIC_* here) ----
const REGION = process.env.AWS_REGION || 'us-east-1';
const SMARTSHEET_TOKEN = process.env.SMARTSHEET_ACCESS_TOKEN; // required
const INJURY_TABLE = process.env.SMARTSHEET_INJURY_TABLE;     // optional override
const OBS_TABLE = process.env.SMARTSHEET_OBSERVATION_TABLE;   // optional override
const REC_TABLE = process.env.SMARTSHEET_RECOGNITION_TABLE;   // optional override

// ---- AWS clients ----
const logs = new CloudWatchLogsClient({ region: REGION });
const ddb = new DynamoDBClient({ region: REGION });
const doc = DynamoDBDocumentClient.from(ddb);

// ---- Logging helpers ----
async function ensureLogGroup(name: string) {
  try {
    await logs.send(new CreateLogGroupCommand({ logGroupName: name }));
  } catch (e: any) {
    if (e?.name !== 'ResourceAlreadyExistsException') throw e;
  }
}
async function ensureLogStream(group: string, stream: string) {
  try {
    await logs.send(new CreateLogStreamCommand({ logGroupName: group, logStreamName: stream }));
  } catch (e: any) {
    if (e?.name !== 'ResourceAlreadyExistsException') throw e;
  }
}
async function getSequenceToken(group: string, stream: string) {
  const r = await logs.send(
      new DescribeLogStreamsCommand({
        logGroupName: group,
        logStreamNamePrefix: stream,
        limit: 1,
      })
  );
  return r.logStreams?.[0]?.uploadSequenceToken;
}
async function logLine(group: string, stream: string, message: string) {
  await ensureLogGroup(group);
  await ensureLogStream(group, stream);
  const sequenceToken = await getSequenceToken(group, stream);
  await logs.send(
      new PutLogEventsCommand({
        logGroupName: group,
        logStreamName: stream,
        sequenceToken,
        logEvents: [{ timestamp: Date.now(), message }],
      })
  );
}

// ---- Table discovery (if you didn’t provide env overrides) ----
async function discoverTableName(kind: 'injury' | 'observation' | 'recognition') {
  if (kind === 'injury' && INJURY_TABLE) return INJURY_TABLE;
  if (kind === 'observation' && OBS_TABLE) return OBS_TABLE;
  if (kind === 'recognition' && REC_TABLE) return REC_TABLE;

  const res = await ddb.send(new ListTablesCommand({}));
  const names = res.TableNames || [];
  const matchers: Record<typeof kind, RegExp> = {
    injury: /SmartsheetInjury/i,
    observation: /SmartsheetObservation/i,
    recognition: /SmartsheetRecognition/i,
  };
  const found = names.find(n => matchers[kind].test(n));
  if (!found) throw new Error(`Could not discover ${kind} staging table`);
  return found;
}

// ---- HTTP handlers ----
export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  const url = new URL(req.url);
  const sheetTypeParam = url.searchParams.get('sheetType') as SheetType | null;

  const logGroup = '/aws/amplify/simsappdev/api/smartsheet';
  const logStream = `${new Date().toISOString().slice(0, 10)}/sync-to-db`;

  try {
    if (!SMARTSHEET_TOKEN) {
      await logLine(logGroup, logStream, '❌ SMARTSHEET_ACCESS_TOKEN is not set');
      return NextResponse.json(
          { ok: false, error: 'SMARTSHEET_ACCESS_TOKEN not configured' },
          { status: 500 }
      );
    }

    const sheetType = sheetTypeParam ?? ('SEATS_NA_INJURY' as SheetType);
    await logLine(logGroup, logStream, `Starting sync-to-db for ${sheetType}`);

    // 1) Fetch 1+ rows from Smartsheet
    const sheetId = SMARTSHEET_CONFIG.SHEET_IDS[sheetType];
    const res = await fetch(`${SMARTSHEET_CONFIG.API_URL}/sheets/${sheetId}`, {
      headers: {
        Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // You can add query params to limit rows if desired (Smartsheet supports pagination via pageSize/page)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      await logLine(logGroup, logStream, `❌ Smartsheet fetch failed: ${res.status} ${text}`);
      return NextResponse.json(
          { ok: false, error: `Smartsheet fetch failed: ${res.status}` },
          { status: 502 }
      );
    }

    const data = await res.json();
    const rows: any[] = data?.rows ?? [];
    const columns: any[] = data?.columns ?? [];
    await logLine(logGroup, logStream, `Fetched ${rows.length} rows from sheet ${sheetId}`);

    if (rows.length === 0) {
      await logLine(logGroup, logStream, 'No rows to stage.');
      return NextResponse.json({ ok: true, staged: 0 });
    }

    // 2) Build column map
    const colMap = new Map<number, string>();
    columns.forEach((c: any) => colMap.set(c.id, c.title));

    // 3) Decide which staging table based on sheetType
    const kind: 'injury' | 'observation' | 'recognition' =
        sheetType.includes('INJURY')
            ? 'injury'
            : sheetType.includes('OBSERVATION')
                ? 'observation'
                : 'recognition';

    const tableName = await discoverTableName(kind);
    await logLine(logGroup, logStream, `Using table ${tableName}`);

    // 4) Stage each row (basic example; align fields with your existing mapper)
    let staged = 0;
    for (const row of rows) {
      const processed: Record<string, any> = { id: String(row.id), rowNumber: row.rowNumber };
      for (const cell of row.cells || []) {
        const name = colMap.get(cell.columnId) || `col_${cell.columnId}`;
        processed[name] = cell.value;
      }

      // Build smartsheetUniqueId consistent with your copy layer
      const smartsheetUniqueId = `${kind}:${sheetId}:${row.id}`;

      // Put into staging table
      await doc.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              smartsheetUniqueId,
              sheetId: String(sheetId),
              rowId: String(row.id),
              rawData: processed,
              lastSyncedAt: new Date().toISOString(),
            },
          })
      );
      staged++;
    }

    await logLine(logGroup, logStream, `✅ Staged ${staged} item(s) to ${tableName}`);
    return NextResponse.json({ ok: true, staged, tableName });
  } catch (err: any) {
    await logLine(logGroup, logStream, `❌ Error: ${err?.message || String(err)}`);
    return NextResponse.json({ ok: false, error: err?.message || 'error' }, { status: 500 });
  }
}
