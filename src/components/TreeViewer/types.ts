import { Node, Edge } from 'reactflow';

// 原始的節點資料格式
export interface RawNode {
  id: string;
  children: string[];
  label?: string;
}

// 邊資料格式（用於輸入）
export interface EdgeData {
  source: string;
  target: string;
}

// 節點自定義資料
export interface NodeData {
  label: string;
  isHighlighted?: boolean;
  isCollapsed?: boolean;
  hasChildren?: boolean;
}

// 自定義的Flow Node類型
export type CustomNode = Node<NodeData>;

// 自定義的Flow Edge類型
export type CustomEdge = Edge;

// 處理後的Flow資料
export interface ProcessedTreeData {
  nodes: CustomNode[];
  edges: CustomEdge[];
} 