'use client';

import { useState } from 'react';
import { Box, styled } from '@mui/material';
import NavigationBar from '@/components/NavigationBar';
import Sidebar from '@/components/Sidebar';
import TreeFlow from '@/components/TreeViewer/TreeFlow';
import { bondType, EdgeData, TreeViewerType } from '@/components/TreeViewer/types';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100vw',
  margin: 0,
  padding: 0,
  boxSizing: 'border-box',
  overflow: 'hidden',
});

const Content = styled(Box)({
  display: 'flex',
  flex: 1,
  width: '100%',
  height: 'calc(100% - 64px)', // 減去 AppBar 高度
  overflow: 'hidden',
  marginTop: '64px', // 提供空間給固定位置的 AppBar
});

const TreeViewerPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [treeType, setTreeType] = useState<TreeViewerType>(TreeViewerType.FORWARD);
  
  // 範例邊資料：A>B,A>C,A>D, B>E,B>F, D>G
  const edgesData: EdgeData[] = [
    { source: 'A', target: 'B' ,type: bondType.SRC},
    { source: 'A', target: 'C' ,type: bondType.SRC},
    { source: 'A', target: 'D' ,type: bondType.SRC},
    { source: 'B', target: 'B1' ,type: bondType.SRC},
    { source: 'B', target: 'B2' ,type: bondType.SRC},
    { source: 'B', target: 'B3' ,type: bondType.SRC},   
    { source: 'D', target: 'G' ,type: bondType.SRC},
  ];

  const handleTreeTypeChange = (type: TreeViewerType) => {
    setTreeType(type);
  };

  return (
    <Container>
      <NavigationBar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <Content>
        <Sidebar 
          open={sidebarOpen} 
          onTreeTypeChange={handleTreeTypeChange}
        />
        <Box sx={{ 
          flex: 1, 
          display: 'flex',
          height: '100%', 
          width: '100%',
          overflow: 'hidden'
        }}>
          <TreeFlow 
            edgesData={edgesData} 
            searchQuery={searchQuery}
            treeType={treeType}
          />
        </Box>
      </Content>
    </Container>
  );
};

export default TreeViewerPage; 