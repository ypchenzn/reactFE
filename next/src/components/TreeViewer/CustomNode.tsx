import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography } from '@mui/material';
import { NodeData } from './types';

const CustomNode = ({ data }: NodeProps<NodeData>) => {
  return (
    <>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#555', visibility: 'hidden' }} 
      />
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
          cursor: data.hasChildren ? 'pointer' : 'default',
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
      </Box>
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#555', visibility: 'hidden' }} 
      />
    </>
  );
};

export default memo(CustomNode); 