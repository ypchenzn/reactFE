import { useState } from 'react';
import { Box, styled } from '@mui/material';
import NavigationBar from '../../components/NavigationBar';
import Sidebar from '../../components/Sidebar';
import TreeFlow from '../../components/TreeViewer/TreeFlow';
import { RawNode } from '../../components/TreeViewer/types';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100%',
});

const Content = styled(Box)({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
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
        <Box sx={{ flex: 1, height: '100%' }}>
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