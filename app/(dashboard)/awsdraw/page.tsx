// app/(dashboard)/awsdraw/page.tsx
"use client";

import dynamic from "next/dynamic";
import React from "react";

// Use relative path or alias if tsconfig supports it
const AWSDiagramCanvas = dynamic(
  () => import("../../components/awsdraw/AWSDiagramCanvas"),
  { ssr: false }
);

export default function AWSVisualDesignerPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Lens - AWS Visual Designer</h1>
      <AWSDiagramCanvas />
    </main>
  );
}
