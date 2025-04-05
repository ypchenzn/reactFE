import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ConnectionLineType,
  MarkerType,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import { RawNode, ProcessedTreeData, CustomNode as CustomNodeType, CustomEdge, NodeData } from './types';
import CustomNodeComponent from './CustomNode';

const nodeWidth = 150;
const nodeHeight = 40;
const levelGap = 300; // 增加水平間距，從200增加到300
const nodeGap = 100; // 增加節點垂直間距，從60增加到100

interface TreeFlowProps {
  treeData: RawNode[];
  searchQuery: string;
}

// 註冊自定義節點
const nodeTypes = {
  customNode: CustomNodeComponent,
};

// 添加CSS動畫定義
const animatedEdge = {
  '& path': {
    strokeDasharray: 5,
    animation: 'dashdraw 0.5s linear infinite',
  },
  '@keyframes dashdraw': {
    from: { strokeDashoffset: 10 },
    to: { strokeDashoffset: 0 }
  }
};

const TreeFlow = ({ treeData, searchQuery }: TreeFlowProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // 追蹤收縮的節點
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // 收集所有子孫節點的函數
  const getDescendants = useCallback((nodeId: string, nodeMap: Map<string, RawNode>): string[] => {
    const result: string[] = [];
    const node = nodeMap.get(nodeId);
    
    if (!node) return result;
    
    // 遞迴收集子孫節點
    const collectDescendants = (id: string) => {
      const currentNode = nodeMap.get(id);
      if (!currentNode) return;
      
      currentNode.children.forEach(childId => {
        result.push(childId);
        collectDescendants(childId);
      });
    };
    
    collectDescendants(nodeId);
    return result;
  }, []);

  // 處理節點點擊事件
  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const nodeId = node.id;
    
    setCollapsedNodes(prevCollapsed => {
      const newCollapsed = new Set(prevCollapsed);
      if (newCollapsed.has(nodeId)) {
        // 如果節點已經收縮，則展開
        newCollapsed.delete(nodeId);
      } else {
        // 否則收縮
        newCollapsed.add(nodeId);
      }
      return newCollapsed;
    });
  }, []);

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

    // 獲取所有被隱藏的節點IDs (所有收縮節點的子孫)
    const hiddenNodeIds = new Set<string>();
    collapsedNodes.forEach(nodeId => {
      // 獲取該節點的所有子孫
      const descendants = getDescendants(nodeId, nodeMap);
      descendants.forEach(id => hiddenNodeIds.add(id));
    });
    
    // 計算每個節點在其層級中所佔的高度
    const calculateNodeHeights = (nodeId: string, levelMap: Map<number, number[]>) => {
      const node = nodeMap.get(nodeId);
      if (!node) return { height: 1, maxDepth: 0 };
      
      if (node.children.length === 0) {
        return { height: 1, maxDepth: 0 };
      }
      
      let totalHeight = 0;
      let maxDepth = 0;
      
      for (const childId of node.children) {
        // 跳過隱藏的子節點
        if (hiddenNodeIds.has(childId)) continue;
        
        const { height, maxDepth: childDepth } = calculateNodeHeights(childId, levelMap);
        totalHeight += height;
        maxDepth = Math.max(maxDepth, childDepth + 1);
      }
      
      return { height: Math.max(1, totalHeight), maxDepth };
    };
    
    // 獲取根節點的高度計算
    const rootHeightData = calculateNodeHeights(root.id, new Map());
    
    // 計算節點位置的輔助函數 (水平佈局)
    const calculatePosition = (
      node: RawNode, 
      level: number, 
      verticalPosition: number, 
      levelWidths: Map<number, number[]>
    ): number => {
      // x軸是水平方向，現在根據層級決定
      const x = level * levelGap;
      // y軸是垂直方向
      const y = verticalPosition;
      
      // 添加節點
      processedNodes.push({
        id: node.id,
        type: 'customNode',
        position: { x, y },
        data: { 
          label: node.label || node.id,
          isHighlighted: searchQuery ? (node.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       (node.label || '').toLowerCase().includes(searchQuery.toLowerCase())) 
                                     : false,
          isCollapsed: collapsedNodes.has(node.id),
          hasChildren: node.children.length > 0
        },
      });
      
      // 如果沒有子節點或節點已收縮，直接返回
      if (node.children.length === 0 || collapsedNodes.has(node.id)) return 1;
      
      // 處理單個子節點的特殊情況
      if (node.children.length === 1) {
        const childId = node.children[0];
        const childNode = nodeMap.get(childId);
        if (childNode && !hiddenNodeIds.has(childId)) {
          // 創建從當前節點到子節點的邊
          processedEdges.push({
            id: `${node.id}-${childId}`,
            source: node.id,
            target: childId,
            type: 'smoothstep',
            animated: true,
            style: { 
              stroke: '#666', 
              strokeWidth: 2, 
              strokeDasharray: '6 3',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color: '#666',
            },
            className: 'animated-edge'
          });
          
          // 單個子節點垂直位置與父節點相同
          const childHeight: number = calculatePosition(childNode, level + 1, verticalPosition, levelWidths);
          return childHeight;
        }
        return 1;
      }
      
      // 計算子節點的垂直起始位置
      let childVerticalStart = verticalPosition;
      let totalChildrenHeight = 0;
      
      // 計算每個子節點的高度總和 (排除隱藏節點)
      const visibleChildren = node.children.filter(childId => !hiddenNodeIds.has(childId));
      
      visibleChildren.forEach(childId => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          const { height } = calculateNodeHeights(childId, new Map());
          totalChildrenHeight += height;
        }
      });
      
      // 垂直間距總量 (根據子節點數量調整)
      const totalGapSpace = (visibleChildren.length - 1) * (nodeGap + (visibleChildren.length * 10));
      
      // 所有子節點的總高度
      const totalSpaceNeeded = totalChildrenHeight * nodeHeight + totalGapSpace;
      
      // 計算起始位置偏移，使子節點群組垂直居中於父節點
      childVerticalStart = verticalPosition - (totalSpaceNeeded / 2) + (nodeHeight / 2);
      
      // 為每個子節點創建邊並計算位置
      let currentVerticalPosition = childVerticalStart;
      
      visibleChildren.forEach(childId => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          // 創建從當前節點到子節點的邊
          processedEdges.push({
            id: `${node.id}-${childId}`,
            source: node.id,
            target: childId,
            type: 'smoothstep',
            animated: true,
            style: { 
              stroke: '#666', 
              strokeWidth: 2, 
              strokeDasharray: '6 3',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color: '#666',
            },
            className: 'animated-edge'
          });
          
          // 計算並設置子節點位置
          const childHeight = calculatePosition(childNode, level + 1, currentVerticalPosition, levelWidths);
          // 根據子節點數量和層級動態調整垂直間距
          const adjustedGap = nodeGap + (visibleChildren.length * 10);
          currentVerticalPosition += childHeight * nodeHeight + adjustedGap;
        }
      });
      
      return totalChildrenHeight > 0 ? totalChildrenHeight : 1;
    };
    
    // 從根節點開始計算位置
    calculatePosition(root, 0, 0, new Map());
    
    return { nodes: processedNodes, edges: processedEdges };
  }, [searchQuery, collapsedNodes, getDescendants]);

  // 當樹狀資料、搜尋查詢或收縮狀態變化時重新處理資料
  useEffect(() => {
    if (treeData && treeData.length > 0) {
      const { nodes: newNodes, edges: newEdges } = processTreeData(treeData);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [treeData, processTreeData, setNodes, setEdges, collapsedNodes]);

  // 預設流程配置 - 向左偏移以顯示根節點
  const defaultViewport = { x: 80, y: 200, zoom: 0.7 };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      flex: 1,
      display: 'flex',
      position: 'relative',
      '& .animated-edge': animatedEdge
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.4}
        maxZoom={1.5}
        defaultViewport={defaultViewport}
        attributionPosition="bottom-left"
        connectionLineType={ConnectionLineType.SmoothStep}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
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