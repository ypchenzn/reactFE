import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import { RawNode, ProcessedTreeData, CustomNode as CustomNodeType, CustomEdge, NodeData } from './types';
import CustomNodeComponent from './CustomNode';

const nodeWidth = 150;
const nodeHeight = 40;
const gap = 100;

interface TreeFlowProps {
  treeData: RawNode[];
  searchQuery: string;
}

// 註冊自定義節點
const nodeTypes = {
  customNode: CustomNodeComponent,
};

const TreeFlow = ({ treeData, searchQuery }: TreeFlowProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 將輸入的樹狀資料處理成符合ReactFlow的節點和邊緣格式
  const processTreeData = useCallback((data: RawNode[]): ProcessedTreeData => {
    const nodeMap = new Map<string, RawNode>();
    data.forEach(node => nodeMap.set(node.id, node));

    // 找到根節點 (沒有被其他節點作為子節點的節點)
    const childrenIds = new Set<string>();
    data.forEach(node => node.children.forEach(childId => childrenIds.add(childId)));
    const rootNodes = data.filter(node => !childrenIds.has(node.id));
    
    // 如果找不到根節點，就使用第一個節點作為根節點
    const root = rootNodes.length > 0 ? rootNodes[0] : data[0];
    
    const processedNodes: CustomNodeType[] = [];
    const processedEdges: CustomEdge[] = [];
    
    // 計算節點位置的輔助函數
    const calculatePosition = (
      node: RawNode, 
      level: number, 
      horizontalPosition: number, 
      horizontalOffsets: {[key: number]: number}
    ) => {
      if (!horizontalOffsets[level]) {
        horizontalOffsets[level] = 0;
      }
      
      const x = horizontalPosition;
      const y = level * (nodeHeight + gap);
      
      processedNodes.push({
        id: node.id,
        type: 'customNode',
        position: { x, y },
        data: { 
          label: node.label || node.id,
          isHighlighted: searchQuery ? (node.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       (node.label || '').toLowerCase().includes(searchQuery.toLowerCase())) 
                                     : false
        },
      });
      
      // 繼續處理子節點
      let childHorizontalPosition = horizontalPosition - ((node.children.length - 1) * nodeWidth) / 2;
      
      node.children.forEach(childId => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          // 創建從當前節點到子節點的邊
          processedEdges.push({
            id: `${node.id}-${childId}`,
            source: node.id,
            target: childId,
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
          
          calculatePosition(childNode, level + 1, childHorizontalPosition, horizontalOffsets);
          childHorizontalPosition += nodeWidth + 70; // 調整子節點間的水平間距
        }
      });
    };
    
    // 從根節點開始計算位置
    calculatePosition(root, 0, 0, {});
    
    return { nodes: processedNodes, edges: processedEdges };
  }, [searchQuery]);

  // 當樹狀資料或搜尋查詢變化時重新處理資料
  useEffect(() => {
    if (treeData && treeData.length > 0) {
      const { nodes: newNodes, edges: newEdges } = processTreeData(treeData);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [treeData, processTreeData, setNodes, setEdges]);

  // 預設流程配置
  const defaultViewport = { x: 350, y: 150, zoom: 1 };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={defaultViewport}
        attributionPosition="bottom-left"
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const nodeData = node.data as NodeData;
            return nodeData.isHighlighted ? '#ff0072' : '#eee';
          }}
        />
      </ReactFlow>
    </Box>
  );
};

// 包裝組件以提供ReactFlow上下文
const TreeFlowWithProvider = (props: TreeFlowProps) => {
  return (
    <ReactFlowProvider>
      <TreeFlow {...props} />
    </ReactFlowProvider>
  );
};

export default TreeFlowWithProvider; 