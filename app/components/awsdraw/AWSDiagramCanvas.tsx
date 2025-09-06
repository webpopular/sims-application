"use client";

import React, { useCallback } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
} from "reactflow";

import "reactflow/dist/style.css";

import LambdaIcon from "./icons/aws-lambda.svg";
import S3Icon from "./icons/aws-s3.svg";

// ✅ Custom minimal node with icon + label, no border or box
const AwsNode = ({ data }: any) => {
  return (
    <div className="flex items-center gap-1 bg-transparent">
      <img src={data.icon} alt={data.label} className="w-6 h-6" />
      {data.label && <span className="text-sm">{data.label}</span>}
    </div>
  );
};

const nodeTypes = {
  aws: AwsNode,
};

const initialNodes: Node[] = [
  {
    id: "lambda",
    type: "aws",
    position: { x: 100, y: 100 },
    data: {
      icon: LambdaIcon.src,
      //label: "Lambda Function",
    },
  },
  {
    id: "s3",
    type: "aws",
    position: { x: 300, y: 200 },
    data: {
      icon: S3Icon.src,
      //label: "S3 Bucket",
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "lambda-s3",
    source: "lambda",
    target: "s3",
    type: "default",
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
];

export default function AWSDiagramCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-[600px] border rounded-lg shadow-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background variant={"dots" as any} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
