// app/api/observation/update-status/route.ts
import { NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
//import { Schema } from '@/amplify/data/resource'; // adjust path as needed
import { type Schema } from '@/amplify/data/schema';


const client = generateClient<Schema>();

export async function POST(req: Request) {
  try {
    const { submissionId, status, investigationStatus } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }
    const result = await client.models.Submission.update({
        id: submissionId,
        status,
        investigationStatus,
      });
      

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[UPDATE_OBSERVATION_STATUS]', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
