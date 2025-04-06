import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  styled,
  TextField,
  InputAdornment,
  Typography,
  Divider,
  Paper,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Description as FileIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  //FolderSpecial as RootFolderIcon,
} from '@mui/icons-material';

// 抽屜寬度
const drawerWidth = 240;

// 樣式化的抽屜
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    top: '64px', // AppBar 高度
    height: 'calc(100% - 64px)', // 減去 AppBar 高度
    background: theme.palette.background.default,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

// 搜尋框容器
const SearchContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

// 範例檔案結構
const mockFileStructure = {
  id: 'root',
  name: '根目錄',
  children: [
    {
      id: 'folder1',
      name: '資料夾 1',
      children: [
        { id: 'file1', name: '檔案 1.txt', children: [] },
        { id: 'file2', name: '檔案 2.js', children: [] },
      ],
    },
    {
      id: 'folder2',
      name: '資料夾 2',
      children: [
        { id: 'file3', name: '檔案 3.css', children: [] },
        { 
          id: 'folder3', 
          name: '子資料夾',
          children: [
            { id: 'file4', name: '檔案 4.tsx', children: [] },
          ],
        },
      ],
    },
    { id: 'file5', name: '檔案 5.html', children: [] },
  ],
};

// 檔案節點介面
interface FileNode {
  id: string;
  name: string;
  children: FileNode[];
}

interface SidebarProps {
  open: boolean;
}

const Sidebar = ({ open }: SidebarProps) => {
  // 存儲已展開的資料夾ID
  const [expanded, setExpanded] = useState<string[]>(['root']);
  // 搜尋關鍵字
  //const [rootSearch, setRootSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  // 用於高亮顯示的搜尋結果節點
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  // 保存找到節點的父節點路徑
  //const [nodePaths, setNodePaths] = useState<Map<string, string[]>>(new Map());

  // 搜尋檔案或資料夾並展開與高亮
  useEffect(() => {
    if (!fileSearch.trim()) {
      setHighlightedNodes(new Set());
      return;
    }

    const newHighlighted = new Set<string>();
    const paths = new Map<string, string[]>();
    
    // 遞迴搜尋節點
    const searchNode = (node: FileNode, path: string[] = []) => {
      // 檢查當前節點是否匹配
      if (node.name.toLowerCase().includes(fileSearch.toLowerCase())) {
        newHighlighted.add(node.id);
        paths.set(node.id, [...path, node.id]);
      }
      
      // 搜尋子節點
      node.children.forEach(child => {
        searchNode(child, [...path, node.id]);
      });
    };
    
    // 開始從根節點搜尋
    searchNode(mockFileStructure);
    
    // 設置高亮節點和路徑
    setHighlightedNodes(newHighlighted);
    //setNodePaths(paths);
    
    // 自動展開找到的節點的父節點路徑
    if (newHighlighted.size > 0) {
      const allPaths = Array.from(paths.values()).flat();
      const uniquePaths = [...new Set(allPaths)];
      setExpanded(uniquePaths);
    }
  }, [fileSearch]);

  // 切換資料夾展開狀態
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 渲染檔案樹狀結構
  const renderTree = (node: FileNode, level: number = 0) => {
    const isFolder = node.children.length > 0;
    const isExpanded = expanded.includes(node.id);
    const isHighlighted = highlightedNodes.has(node.id);

    return (
      <React.Fragment key={node.id}>
        <ListItemButton
          onClick={() => isFolder && toggleExpand(node.id)}
          sx={{ 
            pl: level * 2 + 1,
            backgroundColor: isHighlighted ? 'rgba(255, 0, 114, 0.1)' : 'transparent',
            '&:hover': {
              backgroundColor: isHighlighted ? 'rgba(255, 0, 114, 0.2)' : undefined,
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {isFolder ? (
              isExpanded ? <FolderOpenIcon color="primary" /> : <FolderIcon color="primary" />
            ) : (
              <FileIcon color="action" />
            )}
          </ListItemIcon>
          <ListItemText 
            primary={node.name} 
            primaryTypographyProps={{
              sx: { 
                fontWeight: isHighlighted ? 'bold' : 'normal',
                color: isHighlighted ? '#ff0072' : 'inherit'
              }
            }}
          />
          {isFolder && (isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />)}
        </ListItemButton>
        {isFolder && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {node.children.map((child) => renderTree(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <StyledDrawer variant="persistent" anchor="left" open={open}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 搜尋框容器 */}
        <Box sx={{ p: 1, pt: 2 }}>
 
          {/* <SearchContainer elevation={1}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, pl: 0.5 }}>
              搜尋根目錄
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="輸入根目錄名稱..."
              value={rootSearch}
              onChange={(e) => setRootSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RootFolderIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </SearchContainer> */}

          {/* 檔案/資料夾搜尋 */}
          <SearchContainer elevation={1}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, pl: 0.5 }}>
              Search
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="flie name..."
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </SearchContainer>
          
          <Divider sx={{ my: 1 }} />
        </Box>

        {/* 檔案樹狀結構 */}
        <Box sx={{ overflow: 'auto', flex: 1 }}>
          <List component="nav" aria-label="file system navigator">
            {renderTree(mockFileStructure)}
          </List>
        </Box>
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar; 