import { Box, Typography } from '@mui/material';

export default function DashboardTest() {
  console.log('DashboardTest - Component rendering...');
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Dashboard Test
      </Typography>
      <Typography variant="body1">
        Se você está vendo esta mensagem, o roteamento está funcionando!
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        O problema está especificamente no componente Dashboard principal.
      </Typography>
    </Box>
  );
}
