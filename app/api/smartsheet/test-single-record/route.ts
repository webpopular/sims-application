// app/api/smartsheet/test-single-record/route.ts
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from '../config';

// ✅ Initialize Amplify (env-driven) once for server usage of generateClient
import '@/app/lib/amplify-config-universal';

import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/schema';

import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// ---------- Server envs (no NEXT_PUBLIC_* here) ----------
const REGION = process.env.AWS_REGION || process.env.MY_AWS_REGION || 'us-east-1';
const SMARTSHEET_TOKEN = process.env.SMARTSHEET_ACCESS_TOKEN;
const INJURY_TABLE = process.env.SMARTSHEET_INJURY_TABLE; // optional (if not set, keep your hardcoded name below)

// ---------- AWS clients ----------
const cloudWatchClient = new CloudWatchLogsClient({ region: REGION });
const dynamoClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// ---------- Amplify Data client (IAM auth) ----------
const client = generateClient<Schema>({ authMode: 'iam' });

// ---------- CloudWatch logging helpers (robust with sequenceToken) ----------
async function ensureLogGroupExists(logGroupName: string) {
  try {
    await cloudWatchClient.send(new CreateLogGroupCommand({ logGroupName }));
  } catch (e: any) {
    if (e?.name !== 'ResourceAlreadyExistsException') throw e;
  }
}

async function ensureLogStream(logGroupName: string, logStreamName: string) {
  try {
    await cloudWatchClient.send(new CreateLogStreamCommand({ logGroupName, logStreamName }));
  } catch (e: any) {
    if (e?.name !== 'ResourceAlreadyExistsException') throw e;
  }
}

async function getSequenceToken(logGroupName: string, logStreamName: string) {
  const r = await cloudWatchClient.send(
      new DescribeLogStreamsCommand({
        logGroupName,
        logStreamNamePrefix: logStreamName,
        limit: 1,
      })
  );
  return r.logStreams?.[0]?.uploadSequenceToken;
}

async function logToCloudWatch(logGroupName: string, logStreamName: string, message: string) {
  await ensureLogGroupExists(logGroupName);
  await ensureLogStream(logGroupName, logStreamName);
  const sequenceToken = await getSequenceToken(logGroupName, logStreamName);

  await cloudWatchClient.send(
      new PutLogEventsCommand({
        logGroupName,
        logStreamName,
        sequenceToken,
        logEvents: [{ timestamp: Date.now(), message }],
      })
  );
}

// ---------- Handlers ----------
export async function GET() {
  return fetchAndStoreSingleRecord();
}

export async function POST() {
  return fetchAndStoreSingleRecord();
}

async function fetchAndStoreSingleRecord() {
  const logGroupName = '/aws/amplify/simsappdev/api/smartsheet';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const logStreamName = `${today}/test-single-record`;

  try {
    if (!SMARTSHEET_TOKEN) {
      await logToCloudWatch(logGroupName, logStreamName, '❌ SMARTSHEET_ACCESS_TOKEN is not set');
      return NextResponse.json(
          { success: false, message: 'SMARTSHEET_ACCESS_TOKEN not configured' },
          { status: 500 }
      );
    }

    await logToCloudWatch(logGroupName, logStreamName, 'Starting test to fetch/store one Smartsheet record');

    // Use SEATS_NA_INJURY for this test
    const sheetType = 'SEATS_NA_INJURY' as SheetType;
    await logToCloudWatch(logGroupName, logStreamName, `Fetching from Smartsheet: ${sheetType}`);

    // Fetch data from Smartsheet (limit to 1 row if your API supports it)
    const response = await fetch(
        `${SMARTSHEET_CONFIG.API_URL}/sheets/${SMARTSHEET_CONFIG.SHEET_IDS[sheetType]}?rows=1`,
        {
          headers: {
            Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      await logToCloudWatch(
          logGroupName,
          logStreamName,
          `❌ Smartsheet fetch failed: ${response.status} ${text}`
      );
      return NextResponse.json(
          { success: false, message: `Smartsheet fetch failed: ${response.status}` },
          { status: 502 }
      );
    }

    const data = await response.json();
    const rows: any[] = data?.rows ?? [];
    const columns: any[] = data?.columns ?? [];
    await logToCloudWatch(logGroupName, logStreamName, `Fetched ${rows.length} rows`);

    if (rows.length === 0) {
      await logToCloudWatch(logGroupName, logStreamName, 'No rows found');
      return NextResponse.json({ success: true, message: 'No rows found in the sheet' });
    }

    // Prepare column map
    const columnMap = new Map<number, string>();
    for (const c of columns) columnMap.set(c.id, c.title);

    // First row only (test)
    const row = rows[0];

    // Process row into a flat object keyed by column name
    const processedRow: Record<string, any> = {
      id: row.id,
      rowNumber: row.rowNumber,
    };
    for (const cell of row.cells || []) {
      const columnName = columnMap.get(cell.columnId) || `column_${cell.columnId}`;
      processedRow[columnName] = cell.value;
    }

    await logToCloudWatch(
        logGroupName,
        logStreamName,
        `Processed row ${row.id} with ${row.cells?.length || 0} cells`
    );

    // ---------- Method 1: Write using Amplify Data (IAM) ----------
    try {
      await logToCloudWatch(logGroupName, logStreamName, 'Attempting write via Amplify Data (IAM)…');

      const result = await client.models.SmartsheetInjury.create({
        sheetId: String(data.id),
        rowId: String(row.id),
        autoNumber: processedRow['Auto #'] || processedRow['Auto Number'],
        simsAutoRecordId: processedRow['SIMS Auto Record ID'],
        resolved: processedRow['Resolved?'] === true,
        lessonsLearned: processedRow['Lessons Learned'],
        emergency: processedRow['Emergency'],
        location: processedRow['Location'],
        employeeId: processedRow['Employee ID'],
        firstName: processedRow['First Name'],
        lastName: processedRow['Last Name'],
        streetAddress: processedRow['Street Address'],
        city: processedRow['City'],
        state: processedRow['State'],
        zipCode: processedRow['Zip Code'],
        dateOfBirth: processedRow['Date of Birth'],
        dateHired: processedRow['Date Hired'],
        employeeType: processedRow['Employee Type'],
        dateOfIncident: processedRow['Date of Incident'],
        timeOfIncident: processedRow['Time of Incident'],
        incidentDescription: processedRow['Incident Description'],
        injuryDescription: processedRow['Injury Description'],
        bodyPartInjured: processedRow['Body Part Injured'],
        injuryCategory: processedRow['Injury Category'],
        incidentCategory: processedRow['Incident Category'],
        submissionStatus: processedRow['Submission Status'],
        investigationStatus: processedRow['Investigation Status'],
        rawData: processedRow,
        lastSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      await logToCloudWatch(
          logGroupName,
          logStreamName,
          `✅ Amplify Data write ok. Record ID: ${result.data?.id || '(unknown)'}`
      );
    } catch (amplifyError: any) {
      await logToCloudWatch(
          logGroupName,
          logStreamName,
          `❌ Amplify Data write error: ${amplifyError?.message || String(amplifyError)}`
      );
      console.error('Amplify API Error:', amplifyError);
    }

    // ---------- Method 2: Direct DynamoDB write ----------
    try {
      const tableName =
          INJURY_TABLE || 'SmartsheetInjury-veooqyh5ireufagj7kv3h2ybwm-NONE'; // TODO: prefer env to avoid hardcoding
      const testId = `test-${Date.now()}`;

      const item = {
        id: testId,
        sheetId: String(data.id),
        rowId: String(row.id),
        autoNumber: processedRow['Auto #'] || processedRow['Auto Number'],
        simsAutoRecordId: processedRow['SIMS Auto Record ID'],
        resolved: processedRow['Resolved?'] === true,
        lessonsLearned: processedRow['Lessons Learned'],
        emergency: processedRow['Emergency'],
        location: processedRow['Location'],
        employeeId: processedRow['Employee ID'],
        firstName: processedRow['First Name'],
        lastName: processedRow['Last Name'],
        lastSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await logToCloudWatch(
          logGroupName,
          logStreamName,
          `Attempting direct DynamoDB write to ${tableName}…`
      );

      const putRes = await docClient.send(new PutCommand({ TableName: tableName, Item: item }));

      await logToCloudWatch(
          logGroupName,
          logStreamName,
          `✅ DynamoDB write ok: ${JSON.stringify(putRes)}`
      );
    } catch (dynamoError: any) {
      await logToCloudWatch(
          logGroupName,
          logStreamName,
          `❌ DynamoDB write error: ${dynamoError?.message || String(dynamoError)}`
      );
      console.error('DynamoDB Error:', dynamoError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test completed, check logs for details',
      rowId: row.id,
      sheetId: data.id,
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    await logToCloudWatch(logGroupName, logStreamName, `❌ Error in test op: ${errorMessage}`);
    console.error('Test Error:', error);
    return NextResponse.json(
        { error: 'Failed to fetch and store Smartsheet record', details: errorMessage },
        { status: 500 }
    );
  }
}
