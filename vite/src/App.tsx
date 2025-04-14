import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import TreeViewerPage from './pages/TreeViewer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/tree-viewer" element={<TreeViewerPage />} />
        <Route path="*" element={<Navigate to="/tree-viewer" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
