// app/api/debug-all-submission/route.ts - FIXED to match InjuryList authentication
import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import config from '@/amplify_outputs.json';

Amplify.configure(config, { ssr: true });

export async function GET(request: NextRequest) {
  try {
    // ✅ CRITICAL FIX: Remove authMode to match InjuryList authentication pattern
    const client = generateClient<Schema>();
    // Removed: { authMode: 'apiKey' }

    console.log('🔍 [FetchAllSubmissions] Fetching ALL data from Submission table...');
    console.log('🔍 [FetchAllSubmissions] Using same authentication as InjuryList component');

    // ✅ Use exact same selectionSet as your working InjuryList component
    const response = await client.models.Submission.list({
      selectionSet: [
        'id', 'submissionId', 'autoNumber', 'recordType', 'division', 'platform',
        'location', 'incidentType', 'submissionType', 'title', 'createdAt',
        'status', 'activityType', 'documents.*',
        'rejectionReason', 'rejectedAt', 'rejectedBy',
        // Time and date fields
        'dateOfIncident', 'timeOfIncident', 'timeOfIncidentHour', 'timeOfIncidentMinute',
        'timeOfInjuryAmPm', 'timeEmployeeBegan', 'timeEmployeeBeganAmPm',
        // Employee information
        'employeeId', 'firstName', 'lastName', 'streetAddress', 'city', 'state',
        'zipCode', 'phoneNumber', 'dateOfBirth', 'sex', 'dateHired', 'priorActivity',
        // Location and division
        'incidentLocation',
        // Employee classification
        'employeeType', 'ageRange', 'tenure', 'experience',
        // Incident details
        'locationOnSite', 'whereDidThisOccur', 'workAreaDescription', 'workActivityCategory',
        'incidentDescription', 'injuryDescription', 'injuryType', 'injuredBodyPart',
        // Status fields
        'estimatedLostWorkDays', 'injuryCategory', 'incidentCategory',
        'isCovidRelated', 'isRestrictedWork', 'isJobTransfer', 'finalDaysAway',
        // Metadata
        'updatedAt', 'createdBy', 'updatedBy', 'owner', 'investigationStatus',
        'OSHArecordableType', 'caseClassification', 'injuryIllness',
        // Observation fields
        'obsCorrectiveAction', 'obsPriorityType', 'obsTypeOfConcern',
        // Quick Fix
        'quickFixStatus',
        // Hierarchy field for data-level security
        'hierarchyString'
      ],
      limit: 1000
    });
    
    const data = response.data || [];
    
    console.log(`✅ [FetchAllSubmissions] Found ${data.length} total submissions`);
    console.log(`✅ [FetchAllSubmissions] Table accessed: Submission-veooqyh5ireufagj7kv3h2ybwm-NONE`);

    // ✅ Enhanced data analysis for hierarchy debugging
    const dataAnalysis = {
      totalRecords: data.length,
      uniqueRecordTypes: [...new Set(data.map(item => item.recordType).filter(Boolean))],
      uniqueHierarchies: [...new Set(data.map(item => item.hierarchyString).filter(Boolean))],
      uniqueStatuses: [...new Set(data.map(item => item.status).filter(Boolean))],
      uniqueCreatedBy: [...new Set(data.map(item => item.createdBy).filter(Boolean))],
      hierarchyFormats: {
        withUnderscore: data.filter(item => item.hierarchyString?.includes('_')).length,
        withAngleBracket: data.filter(item => item.hierarchyString?.includes('>')).length,
        withITW: data.filter(item => item.hierarchyString?.startsWith('ITW')).length,
        empty: data.filter(item => !item.hierarchyString).length
      },
      dateRange: {
        earliest: data.length > 0 ? Math.min(...data.map(item => new Date(item.createdAt || 0).getTime())) : null,
        latest: data.length > 0 ? Math.max(...data.map(item => new Date(item.createdAt || 0).getTime())) : null
      }
    };

    return NextResponse.json({
      success: true,
      message: `Raw data fetch from Submission table (Submission-veooqyh5ireufagj7kv3h2ybwm-NONE) completed`,
      totalRecords: data.length,
      dataAnalysis,
      sampleData: data.slice(0, 10).map(item => ({
        id: item.id,
        submissionId: item.submissionId,
        recordType: item.recordType,
        hierarchyString: item.hierarchyString,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        status: item.status,
        location: item.location,
        locationOnSite: item.locationOnSite,
        title: item.title
      })),
      hierarchyAnalysis: {
        allHierarchyStrings: data.map(item => ({
          submissionId: item.submissionId,
          hierarchyString: item.hierarchyString,
          createdBy: item.createdBy
        })).filter(item => item.hierarchyString)
      }
    });

  } catch (error) {
    console.error('❌ [FetchAllSubmissions] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch all submissions',
        details: error instanceof Error ? error.message : 'Unknown error',
        tableName: 'Submission-veooqyh5ireufagj7kv3h2ybwm-NONE'
      },
      { status: 500 }
    );
  }
}
