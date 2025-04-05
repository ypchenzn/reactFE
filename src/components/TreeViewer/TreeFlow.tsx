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
import { ProcessedTreeData, CustomNode as CustomNodeType, CustomEdge, NodeData, EdgeData } from './types';
import CustomNodeComponent from './CustomNode';

const nodeWidth = 150;
const nodeHeight = 40;
const levelGap = 300; // 增加水平間距，從200增加到300
const nodeGap = 100; // 增加節點垂直間距，從60增加到100

interface TreeFlowProps {
  edgesData: EdgeData[];
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

const TreeFlow = ({ edgesData, searchQuery }: TreeFlowProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // 追蹤收縮的節點
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // 從邊資料建立節點映射
  const buildNodeMapFromEdges = useCallback((edges: EdgeData[]) => {
    const nodeMap = new Map<string, string[]>();
    const allNodes = new Set<string>();
    
    // 收集所有唯一的節點ID
    edges.forEach(edge => {
      allNodes.add(edge.source);
      allNodes.add(edge.target);
      
      // 為每個節點建立子節點陣列
      if (!nodeMap.has(edge.source)) {
        nodeMap.set(edge.source, []);
      }
      nodeMap.get(edge.source)?.push(edge.target);
    });
    
    // 確保所有節點都有條目，即使它們沒有子節點
    allNodes.forEach(nodeId => {
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, []);
      }
    });
    
    return nodeMap;
  }, []);

  // 找到根節點（沒有被任何節點指向的節點）
  const findRootNodes = useCallback((edges: EdgeData[]) => {
    const allNodes = new Set<string>();
    const targetNodes = new Set<string>();
    
    edges.forEach(edge => {
      allNodes.add(edge.source);
      allNodes.add(edge.target);
      targetNodes.add(edge.target);
    });
    
    // 根節點是存在於allNodes但不存在於targetNodes的節點
    const rootNodes: string[] = [];
    allNodes.forEach(nodeId => {
      if (!targetNodes.has(nodeId)) {
        rootNodes.push(nodeId);
      }
    });
    
    return rootNodes.length > 0 ? rootNodes : [Array.from(allNodes)[0]];
  }, []);

  // 收集所有子孫節點的函數
  const getDescendants = useCallback((nodeId: string, nodeMap: Map<string, string[]>): string[] => {
    const result: string[] = [];
    
    // 遞迴收集子孫節點
    const collectDescendants = (id: string) => {
      const children = nodeMap.get(id) || [];
      
      children.forEach(childId => {
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

  // 將輸入的邊資料處理成符合ReactFlow的節點和邊緣格式
  const processTreeData = useCallback((edges: EdgeData[]): ProcessedTreeData => {
    // 從邊資料建立節點映射
    const nodeMap = buildNodeMapFromEdges(edges);
    // 找到根節點
    const rootNodes = findRootNodes(edges);
    // 假設只有一個根節點，如果有多個，可以添加一個虛擬根節點
    const rootId = rootNodes[0];
    
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
      const children = nodeMap.get(nodeId) || [];
      
      if (children.length === 0) {
        return { height: 1, maxDepth: 0 };
      }
      
      let totalHeight = 0;
      let maxDepth = 0;
      
      for (const childId of children) {
        // 跳過隱藏的子節點
        if (hiddenNodeIds.has(childId)) continue;
        
        const { height, maxDepth: childDepth } = calculateNodeHeights(childId, levelMap);
        totalHeight += height;
        maxDepth = Math.max(maxDepth, childDepth + 1);
      }
      
      return { height: Math.max(1, totalHeight), maxDepth };
    };
    
    // 獲取根節點的高度計算
    const rootHeightData = calculateNodeHeights(rootId, new Map());
    
    // 計算節點位置的輔助函數 (水平佈局)
    const calculatePosition = (
      nodeId: string, 
      level: number, 
      verticalPosition: number, 
      levelWidths: Map<number, number[]>
    ): number => {
      // x軸是水平方向，現在根據層級決定
      const x = level * levelGap;
      // y軸是垂直方向
      const y = verticalPosition;
      
      const children = nodeMap.get(nodeId) || [];
      
      // 添加節點
      processedNodes.push({
        id: nodeId,
        type: 'customNode',
        position: { x, y },
        data: { 
          label: nodeId, // 使用節點ID作為標籤
          isHighlighted: searchQuery ? nodeId.toLowerCase().includes(searchQuery.toLowerCase()) : false,
          isCollapsed: collapsedNodes.has(nodeId),
          hasChildren: children.length > 0
        },
      });
      
      // 如果沒有子節點或節點已收縮，直接返回
      if (children.length === 0 || collapsedNodes.has(nodeId)) return 1;
      
      // 處理單個子節點的特殊情況
      if (children.length === 1) {
        const childId = children[0];
        if (!hiddenNodeIds.has(childId)) {
          // 創建從當前節點到子節點的邊
          processedEdges.push({
            id: `${nodeId}-${childId}`,
            source: nodeId,
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
          const childHeight: number = calculatePosition(childId, level + 1, verticalPosition, levelWidths);
          return childHeight;
        }
        return 1;
      }
      
      // 計算子節點的垂直起始位置
      let childVerticalStart = verticalPosition;
      let totalChildrenHeight = 0;
      
      // 計算每個子節點的高度總和 (排除隱藏節點)
      const visibleChildren = children.filter(childId => !hiddenNodeIds.has(childId));
      
      visibleChildren.forEach(childId => {
        const { height } = calculateNodeHeights(childId, new Map());
        totalChildrenHeight += height;
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
        // 創建從當前節點到子節點的邊
        processedEdges.push({
          id: `${nodeId}-${childId}`,
          source: nodeId,
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
        const childHeight = calculatePosition(childId, level + 1, currentVerticalPosition, levelWidths);
        // 根據子節點數量和層級動態調整垂直間距
        const adjustedGap = nodeGap + (visibleChildren.length * 10);
        currentVerticalPosition += childHeight * nodeHeight + adjustedGap;
      });
      
      return totalChildrenHeight > 0 ? totalChildrenHeight : 1;
    };
    
    // 從根節點開始計算位置
    calculatePosition(rootId, 0, 0, new Map());
    
    return { nodes: processedNodes, edges: processedEdges };
  }, [searchQuery, collapsedNodes, getDescendants, buildNodeMapFromEdges, findRootNodes]);

  // 當邊資料、搜尋查詢或收縮狀態變化時重新處理資料
  useEffect(() => {
    if (edgesData && edgesData.length > 0) {
      const { nodes: newNodes, edges: newEdges } = processTreeData(edgesData);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [edgesData, processTreeData, setNodes, setEdges, collapsedNodes]);

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