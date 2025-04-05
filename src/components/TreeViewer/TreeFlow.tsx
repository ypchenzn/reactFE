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
const levelGap = 300; // 水平間距
const nodeGap = 100; // 節點垂直間距
const treeVerticalGap = 200; // 樹之間的垂直間距

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

  // 計算樹的最大深度
  const calculateTreeDepth = useCallback((rootId: string, nodeMap: Map<string, string[]>, hiddenNodeIds: Set<string>): number => {
    const calculateDepth = (nodeId: string, currentDepth: number): number => {
      const children = nodeMap.get(nodeId) || [];
      const visibleChildren = children.filter(childId => !hiddenNodeIds.has(childId));
      
      if (visibleChildren.length === 0) {
        return currentDepth;
      }
      
      // 計算所有子節點的最大深度
      const childDepths = visibleChildren.map(childId => 
        calculateDepth(childId, currentDepth + 1)
      );
      
      return Math.max(...childDepths);
    };
    
    return calculateDepth(rootId, 0);
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
    
    // 計算每個樹的深度
    const treeDepths = rootNodes.map(rootId => 
      calculateTreeDepth(rootId, nodeMap, hiddenNodeIds)
    );
    const maxTreeDepth = Math.max(...treeDepths);
    
    // 計算每個樹的寬度
    const treeWidths: { [key: string]: number } = {};
    
    // 計算每個節點在其層級中所佔的高度
    const calculateNodeHeights = (nodeId: string, depth: number = 0) => {
      const children = nodeMap.get(nodeId) || [];
      
      if (children.length === 0 || collapsedNodes.has(nodeId)) {
        return 1;
      }
      
      let totalHeight = 0;
      
      const visibleChildren = children.filter(childId => !hiddenNodeIds.has(childId));
      
      visibleChildren.forEach(childId => {
        totalHeight += calculateNodeHeights(childId, depth + 1);
      });
      
      return Math.max(1, totalHeight);
    };
    
    // 計算每棵樹的總高度，用於垂直排列樹
    const treeHeights = rootNodes.map(rootId => {
      return {
        rootId,
        height: calculateNodeHeights(rootId)
      };
    });
    
    // 初始化level位置映射 - 用於確保相同level的節點垂直對齊
    const levelPositions: { [key: number]: number[] } = {};
    
    // 計算節點位置的輔助函數 (垂直佈局，根節點在上)
    const calculatePositions = (
      nodeId: string, 
      treeIndex: number,
      level: number = 0,
      verticalPosition: number = 0
    ): { treeHeight: number, maxY: number } => {
      const children = nodeMap.get(nodeId) || [];
      const visibleChildren = children.filter(childId => !hiddenNodeIds.has(childId));
      
      // 計算x坐標 - 根據層級
      const x = level * levelGap;
      
      // 計算y坐標
      const y = verticalPosition;
      
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
      
      // 如果沒有子節點或節點已收縮，返回
      if (visibleChildren.length === 0 || collapsedNodes.has(nodeId)) {
        return { treeHeight: 1, maxY: y };
      }
      
      // 計算子節點佔用的總高度
      let totalChildHeight = 0;
      const childHeights: number[] = [];
      
      visibleChildren.forEach(childId => {
        const height = calculateNodeHeights(childId);
        childHeights.push(height);
        totalChildHeight += height;
      });
      
      // 計算間隔高度
      const totalGapSpace = (visibleChildren.length - 1) * nodeGap;
      
      // 總空間需求
      const totalSpace = totalChildHeight * nodeHeight + totalGapSpace;
      
      // 子節點起始垂直位置
      let childVerticalPos = y - totalSpace / 2 + nodeHeight / 2;
      let maxChildY = 0;
      
      // 為每個子節點創建邊並計算位置
      visibleChildren.forEach((childId, index) => {
        // 計算子節點高度
        const childHeight = childHeights[index];
        
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
        
        // 計算子節點位置
        const result = calculatePositions(
          childId, 
          treeIndex,
          level + 1, 
          childVerticalPos + (childHeight * nodeHeight) / 2
        );
        
        maxChildY = Math.max(maxChildY, result.maxY);
        
        // 更新下一個子節點的垂直位置
        childVerticalPos += childHeight * nodeHeight + nodeGap;
      });
      
      return { 
        treeHeight: totalChildHeight > 0 ? totalChildHeight : 1,
        maxY: Math.max(y, maxChildY)
      };
    };

    // 計算每棵樹的垂直起始位置
    let currentTreeY = 0;
    const treePositions: number[] = [];
    
    // 從每個根節點開始計算垂直位置
    rootNodes.forEach((_, index) => {
      treePositions.push(currentTreeY);
      if (index < rootNodes.length - 1) {
        const currentTreeHeight = treeHeights[index].height * nodeHeight;
        currentTreeY += currentTreeHeight + treeVerticalGap;
      }
    });
    
    // 從每個根節點開始計算所有節點位置
    rootNodes.forEach((rootId, index) => {
      calculatePositions(rootId, index, 0, treePositions[index]);
    });
    
    return { nodes: processedNodes, edges: processedEdges };
  }, [
    searchQuery, 
    collapsedNodes, 
    getDescendants, 
    buildNodeMapFromEdges, 
    findRootNodes,
    calculateTreeDepth
  ]);

  // 當邊資料、搜尋查詢或收縮狀態變化時重新處理資料
  useEffect(() => {
    if (edgesData && edgesData.length > 0) {
      const { nodes: newNodes, edges: newEdges } = processTreeData(edgesData);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [edgesData, processTreeData, setNodes, setEdges, collapsedNodes]);

  // 預設流程配置 - 中央顯示
  const defaultViewport = { x: 200, y: 0, zoom: 0.6 };

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