///app/utils/fetchLookupData.ts
export async function fetchLookupData(): Promise<Record<string, string[]>> {
    const url = `https://<your-cloudfront-domain>/lookupValues.json`;
  
    try {
      const res = await fetch(url, { cache: "force-cache" }); // Next.js will CDN cache
      if (!res.ok) throw new Error("Failed to fetch lookup data");
  
      return await res.json();
    } catch (error) {
      console.error("❌ Error fetching lookup data", error);
      return {};
    }
  }
  