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
const levelGap = 300; // 水平間距（層級之間）
const nodeGap = 100; // 節點垂直間距
const treeGap = 400; // 樹之間的水平間距

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
    // 找到所有根節點
    const rootNodes = findRootNodes(edges);
    
    const processedNodes: CustomNodeType[] = [];
    const processedEdges: CustomEdge[] = [];

    // 獲取所有被隱藏的節點IDs (所有收縮節點的子孫)
    const hiddenNodeIds = new Set<string>();
    collapsedNodes.forEach(nodeId => {
      // 獲取該節點的所有子孫
      const descendants = getDescendants(nodeId, nodeMap);
      descendants.forEach(id => hiddenNodeIds.add(id));
    });

    // 記錄每個層級的節點佔用情況，用於防止重疊
    // 格式: Map<levelIndex, Map<y位置, 節點寬度>>
    const levelOccupancy: Map<number, Map<number, number>> = new Map();
    
    // 初始化層級佔用映射
    const initLevelOccupancy = (maxLevel: number) => {
      for (let i = 0; i <= maxLevel; i++) {
        levelOccupancy.set(i, new Map());
      }
    };
    
    // 檢查特定位置是否有重疊
    const hasOverlap = (level: number, y: number, height: number): boolean => {
      const levelMap = levelOccupancy.get(level);
      if (!levelMap) return false;
      
      // 檢查所有已佔用的位置，是否有與當前節點重疊
      for (const [existingY, existingHeight] of levelMap.entries()) {
        // 檢查垂直方向是否重疊
        if (
          (y >= existingY && y < existingY + existingHeight) || 
          (y + height > existingY && y + height <= existingY + existingHeight) ||
          (existingY >= y && existingY < y + height)
        ) {
          return true;
        }
      }
      
      return false;
    };
    
    // 標記位置為已佔用
    const markOccupied = (level: number, y: number, height: number) => {
      const levelMap = levelOccupancy.get(level);
      if (levelMap) {
        levelMap.set(y, height);
      }
    };
    
    // 找到可用的垂直位置
    const findAvailablePosition = (level: number, nodeHeight: number, startY: number): number => {
      let y = startY;
      
      // 如果當前位置重疊，嘗試往下移動直到找到無重疊的位置
      while (hasOverlap(level, y, nodeHeight)) {
        y += nodeGap;
      }
      
      return y;
    };
    
    // 估算樹的最大深度
    const estimateMaxDepth = (rootId: string): number => {
      const getDepth = (nodeId: string, depth = 0): number => {
        if (hiddenNodeIds.has(nodeId) || collapsedNodes.has(nodeId)) return depth;
        
        const children = nodeMap.get(nodeId) || [];
        if (children.length === 0) return depth;
        
        return Math.max(...children.map(childId => getDepth(childId, depth + 1)));
      };
      
      return getDepth(rootId);
    };
    
    // 計算所有樹的最大深度
    const maxDepth = Math.max(...rootNodes.map(estimateMaxDepth)) + 1;
    initLevelOccupancy(maxDepth);
    
    // 為每棵樹分配水平空間
    let currentTreeX = 0;
    
    // 處理每棵樹
    rootNodes.forEach((rootId, treeIndex) => {
      const processNode = (
        nodeId: string,
        level: number,
        parentX: number,
        parentY: number
      ): { width: number; height: number; bottomY: number } => {
        if (hiddenNodeIds.has(nodeId)) {
          return { width: 0, height: 0, bottomY: parentY };
        }
        
        const children = nodeMap.get(nodeId) || [];
        const visibleChildren = children.filter(childId => !hiddenNodeIds.has(childId));
        
        // 計算當前節點的位置
        const x = currentTreeX + level * levelGap;
        // 初始垂直位置從父節點位置開始，如果是根節點則從0開始
        let y = level === 0 ? 0 : parentY;
        
        // 找到不與同層級節點重疊的垂直位置
        y = findAvailablePosition(level, nodeHeight, y);
        
        // 標記當前節點佔用的位置
        markOccupied(level, y, nodeHeight);
        
        // 添加節點
        processedNodes.push({
          id: nodeId,
          type: 'customNode',
          position: { x, y },
          data: { 
            label: nodeId,
            isHighlighted: searchQuery ? nodeId.toLowerCase().includes(searchQuery.toLowerCase()) : false,
            isCollapsed: collapsedNodes.has(nodeId),
            hasChildren: children.length > 0
          },
        });
        
        // 如果節點已收縮或沒有子節點，它只佔一個節點的空間
        if (collapsedNodes.has(nodeId) || visibleChildren.length === 0) {
          return { width: nodeWidth, height: nodeHeight, bottomY: y + nodeHeight };
        }
        
        // 計算子節點布局
        let maxChildWidth = 0;
        let totalHeight = 0;
        let lastBottomY = y;
        
        // 處理每個子節點
        visibleChildren.forEach((childId, index) => {
          // 計算子節點的布局
          const childResult = processNode(
            childId,
            level + 1,
            x + nodeWidth,
            lastBottomY + (index > 0 ? nodeGap : 0)
          );
          
          // 更新最後一個子節點的底部Y坐標
          lastBottomY = childResult.bottomY;
          
          // 添加連接邊
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
          
          // 更新最大子節點寬度和總高度
          maxChildWidth = Math.max(maxChildWidth, childResult.width);
          totalHeight += childResult.height + (index > 0 ? nodeGap : 0);
        });
        
        // 計算當前節點子樹的寬度和高度
        const subtreeWidth = maxChildWidth + levelGap;
        const subtreeHeight = Math.max(nodeHeight, totalHeight);
        
        return { 
          width: Math.max(nodeWidth, subtreeWidth), 
          height: subtreeHeight,
          bottomY: Math.max(y + nodeHeight, lastBottomY)
        };
      };
      
      // 處理當前樹的根節點
      const treeLayout = processNode(rootId, 0, 0, 0);
      
      // 為下一棵樹更新水平偏移
      currentTreeX += treeLayout.width + treeGap;
    });
    
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

  // 預設流程配置 - 向左偏移以顯示更多層級
  const defaultViewport = { x: 50, y: 50, zoom: 0.7 };

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
        minZoom={0.3}
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