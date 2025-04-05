import { useState } from 'react';
import { Box, styled, Toolbar } from '@mui/material';
import NavigationBar from '@/components/NavigationBar';
import Sidebar from '@/components/Sidebar';
import TreeFlow from '@/components/TreeViewer/TreeFlow';
import { RawNode } from '@/components/TreeViewer/types';

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
  height: '100%',
  overflow: 'hidden',
  marginTop: '64px', // 提供空間給固定位置的 AppBar
});

const TreeViewerPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // 範例樹狀資料 (A>B,A>C,A>D, B>E,B>F, D>G)
  const treeData: RawNode[] = [
    { id: 'A', children: ['B', 'C', 'D'] },
    { id: 'B', children: ['E', 'F'] },
    { id: 'C', children: [] },
    { id: 'D', children: ['G'] },
    { id: 'E', children: [] },
    { id: 'F', children: [] },
    { id: 'G', children: [] },
  ];

  return (
    <Container>
      <NavigationBar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <Content>
        <Sidebar open={sidebarOpen} />
        <Box sx={{ 
          flex: 1, 
          display: 'flex',
          height: '100%', 
          width: '100%',
          overflow: 'hidden'
        }}>
          <TreeFlow 
            treeData={treeData} 
            searchQuery={searchQuery}
          />
        </Box>
      </Content>
    </Container>
  );
};

export default TreeViewerPage; 