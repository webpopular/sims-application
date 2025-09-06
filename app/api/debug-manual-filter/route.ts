// app/api/debug-manual-filter/route.ts - UPDATED for underscore delimiter testing
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email parameter required',
        usage: 'Add ?email=user@example.com to test with specific user'
      }, { status: 400 });
    }

    console.log(`🔍 [DebugManualFilter] Testing underscore delimiter for user: ${email}`);

    // ✅ Use your existing working API pattern
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/get-filtered-incidents?email=${encodeURIComponent(email)}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.details || 'Failed to fetch data');
    }

    // ✅ Analyze hierarchy string format (should now be underscore-delimited)
    const userHierarchy = result.userAccess?.hierarchyString || '';
    
    console.log(`🔍 [DebugManualFilter] User hierarchy: ${userHierarchy}`);
    console.log(`🔍 [DebugManualFilter] Expected format: ITW_Automotive OEM_Smart Components_Smart Components NA_`);

    // ✅ Check if hierarchy uses underscore delimiter
    const usesUnderscore = userHierarchy.includes('_');
    const usesAngleBracket = userHierarchy.includes('>') || userHierarchy.includes('\\u003E');

    return NextResponse.json({
      success: true,
      message: `Debug test for user: ${email}`,
      totalRecords: result.totalCount || 0,
      userAccess: {
        ...result.userAccess,
        hierarchyFormat: usesUnderscore ? 'UNDERSCORE' : usesAngleBracket ? 'ANGLE_BRACKET' : 'UNKNOWN'
      },
      appliedFilters: result.filters,
      uniqueHierarchies: [...new Set((result.data || []).map((item: any) => item.hierarchyString).filter(Boolean))],
      hierarchyAnalysis: {
        userHierarchy: userHierarchy,
        usesUnderscore: usesUnderscore,
        usesAngleBracket: usesAngleBracket,
        expectedFormat: "ITW_Automotive OEM_Smart Components_Smart Components NA_",
        formatMatch: userHierarchy === "ITW_Automotive OEM_Smart Components_Smart Components NA_",
        hierarchyLength: userHierarchy.length,
        filterType: result.userAccess?.accessScope === 'DIVISION' ? 'beginsWith' : 
                   result.userAccess?.accessScope === 'PLANT' ? 'exact match' : 
                   result.userAccess?.accessScope === 'ENTERPRISE' ? 'no filter' : 'unknown'
      },
      sampleData: result.data?.slice(0, 3).map((item: any) => ({
        submissionId: item.submissionId,
        hierarchyString: item.hierarchyString,
        recordType: item.recordType,
        createdBy: item.createdBy,
        status: item.status
      })) || []
    });

  } catch (error) {
    console.error('❌ [DebugManualFilter] Error:', error);
    return NextResponse.json(
      { 
        error: 'Manual debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
