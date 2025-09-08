// app/api/debug-all-submission/route.ts
'use server';

import { NextResponse } from 'next/server';
import '@/app/amplify-config-server';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';
import { fetchAuthSession } from 'aws-amplify/auth/server';

Amplify.configure({}, { ssr: true });

export async function GET() {
  try {
    // Require a signed-in user (same as InjuryList)
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      return NextResponse.json({ error: 'Not authenticated (no ID token)' }, { status: 401 });
    }

    const client = generateClient<Schema>({ authMode: 'userPool' });

    // Same selection set you’re using now
    const selectionSet = [
      'id','submissionId','autoNumber','recordType','division','platform',
      'location','incidentType','submissionType','title','createdAt',
      'status','activityType','documents.*',
      'rejectionReason','rejectedAt','rejectedBy',
      'dateOfIncident','timeOfIncident','timeOfIncidentHour','timeOfIncidentMinute',
      'timeOfInjuryAmPm','timeEmployeeBegan','timeEmployeeBeganAmPm',
      'employeeId','firstName','lastName','streetAddress','city','state',
      'zipCode','phoneNumber','dateOfBirth','sex','dateHired','priorActivity',
      'incidentLocation',
      'employeeType','ageRange','tenure','experience',
      'locationOnSite','whereDidThisOccur','workAreaDescription','workActivityCategory',
      'incidentDescription','injuryDescription','injuryType','injuredBodyPart',
      'estimatedLostWorkDays','injuryCategory','incidentCategory',
      'isCovidRelated','isRestrictedWork','isJobTransfer','finalDaysAway',
      'updatedAt','createdBy','updatedBy','owner','investigationStatus',
      'OSHArecordableType','caseClassification','injuryIllness',
      'obsCorrectiveAction','obsPriorityType','obsTypeOfConcern',
      'quickFixStatus',
      'hierarchyString'
    ] as const;

    // Optional: paginate beyond 1000
    const all: Schema['Submission']['type'][] = [];
    let nextToken: string | undefined;
    do {
      const resp = await client.models.Submission.list({
        selectionSet,
        limit: 1000,
        nextToken,
      });
      all.push(...(resp.data ?? []));
      nextToken = resp.nextToken as string | undefined;
    } while (nextToken);

    const data = all;

    // Analysis (convert min/max to ISO for readability)
    const timestamps = data
        .map(i => (i.createdAt ? new Date(i.createdAt).getTime() : undefined))
        .filter((n): n is number => Number.isFinite(n));

    const earliestIso = timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null;
    const latestIso   = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

    const dataAnalysis = {
      totalRecords: data.length,
      uniqueRecordTypes: [...new Set(data.map(i => i.recordType).filter(Boolean))],
      uniqueHierarchies: [...new Set(data.map(i => i.hierarchyString).filter(Boolean))],
      uniqueStatuses:    [...new Set(data.map(i => i.status).filter(Boolean))],
      uniqueCreatedBy:   [...new Set(data.map(i => i.createdBy).filter(Boolean))],
      hierarchyFormats: {
        withUnderscore:   data.filter(i => i.hierarchyString?.includes('_')).length,
        withAngleBracket: data.filter(i => i.hierarchyString?.includes('>')).length,
        withITW:          data.filter(i => i.hierarchyString?.startsWith('ITW')).length,
        empty:            data.filter(i => !i.hierarchyString).length,
      },
      dateRange: { earliest: earliestIso, latest: latestIso },
    };

    return NextResponse.json({
      success: true,
      message: 'Raw data fetch from Submission table completed',
      totalRecords: data.length,
      dataAnalysis,
      sampleData: data.slice(0, 10).map(i => ({
        id: i.id,
        submissionId: i.submissionId,
        recordType: i.recordType,
        hierarchyString: i.hierarchyString,
        createdBy: i.createdBy,
        createdAt: i.createdAt,
        status: i.status,
        location: i.location,
        locationOnSite: i.locationOnSite,
        title: i.title,
      })),
      hierarchyAnalysis: {
        allHierarchyStrings: data
            .map(i => ({ submissionId: i.submissionId, hierarchyString: i.hierarchyString, createdBy: i.createdBy }))
            .filter(i => i.hierarchyString),
      },
    });

  } catch (error: any) {
    console.error('❌ [FetchAllSubmissions] Error:', error);
    return NextResponse.json(
        { error: 'Failed to fetch all submissions', details: error?.message ?? 'Unknown error' },
        { status: 500 }
    );
  }
}
