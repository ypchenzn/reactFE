import { Metadata } from 'next';
import TreeViewerPage from '@/components/TreeViewer/TreeViewerPage';

export const metadata: Metadata = {
  title: '樹狀圖檢視器',
  description: '互動式樹狀圖檢視器',
};

export default function Page() {
  return <TreeViewerPage />;
} 