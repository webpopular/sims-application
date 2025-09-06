'use client';

import { useState, useEffect } from "react";

interface InvestigationFiltersProps {
  investigations: any[]; // ✅ List of all investigations
  setInvestigations: (filtered: any[]) => void; // ✅ Function to update displayed list
}

export default function InvestigationFilters({ investigations, setInvestigations }: InvestigationFiltersProps) {
  const [allInvestigations] = useState(investigations); // ✅ Store full data initially
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState("all");
  const [incidentTypeFilter, setIncidentTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [submissionIdFilter, setSubmissionIdFilter] = useState("all");

  // 🔹 Apply filters whenever values change
  useEffect(() => {
    let filtered = [...allInvestigations];

    if (globalFilter) {
      filtered = filtered.filter((item) =>
        item.title?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.submissionId?.toLowerCase().includes(globalFilter.toLowerCase())
      );
    }

    if (submissionIdFilter !== "all") {
      filtered = filtered.filter((item) => item.submissionId === submissionIdFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (submissionTypeFilter !== "all") {
      filtered = filtered.filter((item) => item.submissionType === submissionTypeFilter);
    }

    if (incidentTypeFilter !== "all") {
      filtered = filtered.filter((item) => item.recordType === incidentTypeFilter);
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter((item) => item.location === locationFilter);
    }

    // ✅ Ensures Reset Button Fully Restores Data
    setInvestigations(filtered.length > 0 || globalFilter ? filtered : allInvestigations);
  }, [globalFilter, statusFilter, submissionTypeFilter, incidentTypeFilter, locationFilter, submissionIdFilter]);

  // 🔹 Function to get unique values for dropdowns
  const getUniqueValues = (key: keyof any) => {
    return ["all", ...Array.from(new Set(allInvestigations.map((item) => item[key] || "Unknown")))];
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
      <div className="flex gap-4 flex-wrap">
        {/* 🔹 Search Bar */}
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search reports..."
          className="px-4 py-2 border rounded-md w-64 bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
        />

        {/* 🔹 Submission ID Filter */}
        <select
          value={submissionIdFilter}
          onChange={(e) => setSubmissionIdFilter(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
        >
          {getUniqueValues("submissionId").map((submissionId) => (
            <option key={submissionId} value={submissionId}>
              {submissionId === "all" ? "All Submission Ids" : submissionId}
            </option>
          ))}
        </select>

        {/* 🔹 Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
        >
          {getUniqueValues("status").map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All Status" : status}
            </option>
          ))}
        </select>

        {/* 🔹 Submission Type Filter */}
        <select
          value={submissionTypeFilter}
          onChange={(e) => setSubmissionTypeFilter(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
        >
          {getUniqueValues("submissionType").map((type) => (
            <option key={type} value={type}>
              {type === "all" ? "All Submission Types" : type}
            </option>
          ))}
        </select>

        {/* 🔹 Incident Type Filter */}
        <select
          value={incidentTypeFilter}
          onChange={(e) => setIncidentTypeFilter(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
        >
          {getUniqueValues("recordType").map((type) => (
            <option key={type} value={type}>
              {type === "all" ? "All Incident Types" : type}
            </option>
          ))}
        </select>

        {/* 🔹 Location Filter */}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
        >
          {getUniqueValues("location").map((location) => (
            <option key={location} value={location}>
              {location === "all" ? "All Locations" : location}
            </option>
          ))}
        </select>

        {/* 🔹 Reset Button */}
        <button
          onClick={() => {
            setGlobalFilter("");
            setSubmissionIdFilter("all");
            setStatusFilter("all");
            setSubmissionTypeFilter("all");
            setIncidentTypeFilter("all");
            setLocationFilter("all");
            setInvestigations(allInvestigations); // ✅ Resets List Properly
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-700 transition-all"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
