// app/api/create-test-data/route.ts - FIXED with proper auth
import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import config from '@/amplify_outputs.json';

Amplify.configure(config, { ssr: true });

export async function POST(request: NextRequest) {
  try {
    // ✅ Create client with API key for server-side calls
    const client = generateClient<Schema>({
      authMode: 'apiKey'
    });

    // ✅ Create test data that matches your actual user hierarchy strings
    const testSubmissions = [
      {
        submissionId: 'TEST-ENT-001',
        recordType: 'INJURY_REPORT',
        hierarchyString: 'ITW>',
        incidentDescription: 'Enterprise level test injury - visible to all enterprise users',
        createdBy: 'ITW.Safety.Director.User1@gmail.com',
        status: 'Draft',
        location: 'Enterprise Level',
        submissionType: 'Direct',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: 'Segment.Leadership.User1@gmail.com',
        dateOfIncident: '2025-06-17',
        documents: []
      }
    ];

    const results = [];
    
    for (const submission of testSubmissions) {
      try {
        console.log(`🔄 Creating test submission: ${submission.submissionId}`);
        
        const response = await client.models.Submission.create(submission);
        
        results.push({
          success: true,
          submissionId: submission.submissionId,
          id: response.data?.id,
          hierarchyString: submission.hierarchyString
        });
        
        console.log(`✅ Created test submission: ${submission.submissionId} with ID: ${response.data?.id}`);
        
      } catch (error) {
        results.push({
          success: false,
          submissionId: submission.submissionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          hierarchyString: submission.hierarchyString
        });
        console.error(`❌ Failed to create ${submission.submissionId}:`, error);
      }
    }

    console.log(`📊 Test data creation summary: ${results.filter(r => r.success).length}/${results.length} successful`);

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

  } catch (error) {
    console.error('❌ [CreateTestData] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
