import { useState } from 'react';
import { Box, styled, Toolbar } from '@mui/material';
import NavigationBar from '@/components/NavigationBar';
import Sidebar from '@/components/Sidebar';
import TreeFlow from '@/components/TreeViewer/TreeFlow';
import { EdgeData } from '@/components/TreeViewer/types';

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
  
  // 範例邊資料：A>B,A>C,A>D, B>E,B>F, D>G
  const edgesData: EdgeData[] = [
    { source: 'A', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'A', target: 'D' },
    { source: 'B', target: 'B1' },
    { source: 'B', target: 'B2' },
    { source: 'B', target: 'B3' },
   
    { source: 'D', target: 'G' },
    { source: 'Z', target: 'X' },
    { source: 'X', target: 'Y' },
    { source: 'X', target: 'W' },
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
            edgesData={edgesData} 
            searchQuery={searchQuery}
          />
        </Box>
      </Content>
    </Container>
  );
};

export default TreeViewerPage; 