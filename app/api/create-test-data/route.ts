// app/api/create-test-data/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import '@/app/amplify-config-server';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';
import { fetchAuthSession } from 'aws-amplify/auth/server';

// Safer defaults for server routes
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Enable SSR cookie/session handling without changing categories
Amplify.configure({}, { ssr: true });

export async function POST(_request: NextRequest) {
  try {
    // Require a signed-in user; mirror InjuryList (userPool)
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      return NextResponse.json(
          { error: 'Not authenticated (no ID token)' },
          { status: 401 }
      );
    }

    // Use userPool auth for AppSync writes
    const client = generateClient<Schema>({ authMode: 'userPool' });

    // Create test data matching your hierarchy strings
    const nowIso = new Date().toISOString();
    const testSubmissions: Array<Partial<Schema['Submission']['type']>> = [
      {
        submissionId: 'TEST-ENT-001',
        recordType: 'INJURY_REPORT',
        hierarchyString: 'ITW>',
        incidentDescription: 'Enterprise level test injury - visible to all enterprise users',
        createdBy: 'ITW.Safety.Director.User1@gmail.com',
        status: 'Draft',
        location: 'Enterprise Level',
        submissionType: 'Direct',
        createdAt: nowIso,
        updatedAt: nowIso,
        owner: 'ITW.Safety.Director.User1@gmail.com',
        dateOfIncident: '2025-06-17',
        documents: []
      },
      {
        submissionId: 'TEST-PLT-GENAY-001',
        recordType: 'INJURY_REPORT',
        hierarchyString: 'ITW>Automotive OEM>TFM & Metals>TFM EU>Genay',
        incidentDescription: 'Plant level test injury - Genay plant only',
        createdBy: 'Plant.Safety.Manager.User1@outlook.com',
        status: 'Draft',
        location: 'Genay Plant',
        submissionType: 'Direct',
        createdAt: nowIso,
        updatedAt: nowIso,
        owner: 'Plant.Safety.Manager.User1@outlook.com',
        dateOfIncident: '2025-06-17',
        documents: []
      },
      {
        submissionId: 'TEST-DIV-SMARTCOMP-001',
        recordType: 'OBSERVATION_REPORT',
        hierarchyString: 'ITW>Automotive OEM>Smart Components>Smart Components NA>',
        incidentDescription: 'Division level test observation - Smart Components NA',
        createdBy: 'Operations.Director.User1@outlook.com',
        status: 'Draft',
        location: 'Smart Components NA Division',
        submissionType: 'Direct',
        createdAt: nowIso,
        updatedAt: nowIso,
        owner: 'Operations.Director.User1@outlook.com',
        dateOfIncident: '2025-06-17',
        obsTypeOfConcern: 'Safety Hazard',
        obsPriorityType: 'High',
        obsCorrectiveAction: 'Immediate action required',
        documents: []
      },
      {
        submissionId: 'TEST-PLT-BYTCA-001',
        recordType: 'OBSERVATION_REPORT',
        hierarchyString: 'ITW>Automotive OEM>Engineered Products>AFM EU>Bytča',
        incidentDescription: 'Plant level test observation - Bytča plant only',
        createdBy: 'Plant.HR.Manager.User1@outlook.com',
        status: 'Draft',
        location: 'Bytča Plant',
        submissionType: 'Direct',
        createdAt: nowIso,
        updatedAt: nowIso,
        owner: 'Plant.HR.Manager.User1@outlook.com',
        dateOfIncident: '2025-06-17',
        obsTypeOfConcern: 'Process Improvement',
        obsPriorityType: 'Medium',
        obsCorrectiveAction: 'Process review needed',
        documents: []
      },
      {
        submissionId: 'TEST-SEG-AUTO-001',
        recordType: 'INJURY_REPORT',
        hierarchyString: 'ITW>Automotive OEM>',
        incidentDescription: 'Segment level test injury - All Automotive OEM',
        createdBy: 'Segment.Leadership.User1@gmail.com',
        status: 'Draft',
        location: 'Automotive OEM Segment',
        submissionType: 'Direct',
        createdAt: nowIso,
        updatedAt: nowIso,
        owner: 'Segment.Leadership.User1@gmail.com',
        dateOfIncident: '2025-06-17',
        documents: []
      }
    ];

    const results: Array<{
      success: boolean;
      submissionId: string;
      id?: string | null;
      hierarchyString?: string;
      error?: string;
    }> = [];

    for (const submission of testSubmissions) {
      try {
        // If your schema requires additional fields, add them here before create()
        const res = await client.models.Submission.create(submission as any);
        results.push({
          success: true,
          submissionId: String(submission.submissionId),
          id: res.data?.id ?? null,
          hierarchyString: submission.hierarchyString
        });
      } catch (err: any) {
        results.push({
          success: false,
          submissionId: String(submission.submissionId),
          hierarchyString: submission.hierarchyString,
          error: err?.message ?? 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data creation completed',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error: any) {
    console.error('❌ [CreateTestData] Error:', error);
    return NextResponse.json(
        { error: 'Failed to create test data', details: error?.message ?? 'Unknown error' },
        { status: 500 }
    );
  }
}
