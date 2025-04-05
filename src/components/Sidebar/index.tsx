import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  styled,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Description as FileIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
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
    background: theme.palette.background.default,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
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

    return (
      <React.Fragment key={node.id}>
        <ListItemButton
          onClick={() => isFolder && toggleExpand(node.id)}
          sx={{ pl: level * 2 + 1 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {isFolder ? (
              isExpanded ? <FolderOpenIcon color="primary" /> : <FolderIcon color="primary" />
            ) : (
              <FileIcon color="action" />
            )}
          </ListItemIcon>
          <ListItemText primary={node.name} />
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
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>{renderTree(mockFileStructure)}</List>
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar; 