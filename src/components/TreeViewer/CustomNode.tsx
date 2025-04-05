import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { NodeData } from './types';

const CustomNode = ({ data }: NodeProps<NodeData>) => {
  const showCollapseIndicator = data.hasChildren;
  
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <Box
        sx={{
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #ddd',
          backgroundColor: data.isHighlighted ? '#ffe6f0' : '#f8f8f8',
          width: 150,
          height: 40,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: data.isHighlighted 
            ? '0 0 10px 3px rgba(255, 0, 114, 0.3)' 
            : '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
          position: 'relative',
          cursor: showCollapseIndicator ? 'pointer' : 'default',
          '&:hover': {
            backgroundColor: data.isHighlighted ? '#ffd6e6' : '#f0f0f0',
            transform: 'scale(1.05)',
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: data.isHighlighted ? 'bold' : 'normal',
            color: data.isHighlighted ? '#ff0072' : '#333',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {data.label}
        </Typography>
        
        {showCollapseIndicator && (
          <Box
            sx={{
              position: 'absolute',
              right: '5px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
            }}
          >
            {data.isCollapsed ? (
              <AddIcon sx={{ fontSize: 12, color: '#555' }} />
            ) : (
              <RemoveIcon sx={{ fontSize: 12, color: '#555' }} />
            )}
          </Box>
        )}
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </>
  );
};

export default memo(CustomNode); 