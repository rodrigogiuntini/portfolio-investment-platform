import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  Paper,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tooltip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  Download,
  FilterList,
  PieChart,
  Speed,
  AccountBalance,
  Refresh,
  AttachMoney,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Types
interface Portfolio {
  id: number;
  name: string;
  total_value: number;
  total_invested: number;
  total_return: number;
  total_return_percentage: number;
  currency: string;
}

interface DashboardData {
  portfolios: Portfolio[];
  total_patrimony: number;
  total_invested: number;
  total_return: number;
  total_return_percentage: number;
  asset_allocation: any[];
  performance_metrics: any;
  recent_transactions: any[];
}

interface Transaction {
  id: number;
  transaction_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  date: string;
  asset_id: number;
  portfolio_id: number;
  asset?: {
    id: number;
    symbol: string;
    name: string;
    asset_type: string;
    sector: string;
  };
}

interface Dividend {
  id: number;
  dividend_type: string;
  amount_per_share: number;
  total_amount: number;
  net_amount: number;
  payment_date: string;
  asset_id: number;
  portfolio_id: number;
}

interface Position {
  id: number;
  asset_id: number;
  portfolio_id: number;
  quantity: number;
  average_price: number;
  current_price: number;
  current_value: number;
  total_invested: number;
  total_return: number;
  total_return_percentage: number;
  dividends_received: number;
  asset: {
    id: number;
    symbol: string;
    name: string;
    asset_type: string;
    sector: string;
  };
}

interface AssetAllocation {
  asset_type: string;
  value: number;
  percentage: number;
  count: number;
}

export default function Reports() {
  const theme = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const [selectedPortfolio, setSelectedPortfolio] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await api.get('/api/portfolios/');
      console.log('📊 Reports - Portfólios carregados:', response.data);
      return response.data;
    },
  });

  // Auto-select first portfolio
  useEffect(() => {
    if (portfolios.length > 0 && selectedPortfolio === 0) {
      console.log('🎯 Reports - Selecionando primeiro portfólio:', portfolios[0]);
      setSelectedPortfolio(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolio]);

  // Fetch dashboard data
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard/').then(res => res.data),
  });

  // Fetch transactions with filters
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions', selectedPortfolio, selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPortfolio > 0) params.append('portfolio_id', selectedPortfolio.toString());
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedPeriod) {
        case '1M': startDate.setMonth(startDate.getMonth() - 1); break;
        case '3M': startDate.setMonth(startDate.getMonth() - 3); break;
        case '6M': startDate.setMonth(startDate.getMonth() - 6); break;
        case '1A': startDate.setFullYear(startDate.getFullYear() - 1); break;
        case '2A': startDate.setFullYear(startDate.getFullYear() - 2); break;
      }
      
      params.append('start_date', startDate.toISOString().split('T')[0]);
      params.append('end_date', endDate.toISOString().split('T')[0]);
      
      console.log('📋 Reports - Buscando transações:', {
        portfolio: selectedPortfolio,
        period: selectedPeriod,
        url: `/api/transactions/?${params.toString()}`
      });
      
      const response = await api.get(`/api/transactions/?${params.toString()}`);
      console.log('✅ Reports - Transações encontradas:', response.data);
      return response.data;
    },
    enabled: selectedPortfolio > 0,
  });

  // Fetch dividends with filters
  const { data: dividends = [] } = useQuery<Dividend[]>({
    queryKey: ['dividends', selectedPortfolio, selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPortfolio > 0) params.append('portfolio_id', selectedPortfolio.toString());
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedPeriod) {
        case '1M': startDate.setMonth(startDate.getMonth() - 1); break;
        case '3M': startDate.setMonth(startDate.getMonth() - 3); break;
        case '6M': startDate.setMonth(startDate.getMonth() - 6); break;
        case '1A': startDate.setFullYear(startDate.getFullYear() - 1); break;
        case '2A': startDate.setFullYear(startDate.getFullYear() - 2); break;
      }
      
      params.append('start_date', startDate.toISOString().split('T')[0]);
      params.append('end_date', endDate.toISOString().split('T')[0]);
      
      console.log('💰 Reports - Buscando dividendos:', {
        portfolio: selectedPortfolio,
        period: selectedPeriod,
        url: `/api/dividends/?${params.toString()}`
      });
      
      const response = await api.get(`/api/dividends/?${params.toString()}`);
      console.log('✅ Reports - Dividendos encontrados:', response.data);
      return response.data;
    },
    enabled: selectedPortfolio > 0,
  });

  // Fetch positions for selected portfolio
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['positions', selectedPortfolio],
    queryFn: async () => {
      if (selectedPortfolio <= 0) return [];
      
      console.log('📊 Reports - Buscando posições para portfolio:', selectedPortfolio);
      const response = await api.get(`/api/portfolios/${selectedPortfolio}/positions`);
      console.log('✅ Reports - Posições encontradas:', response.data);
      return response.data;
    },
    enabled: selectedPortfolio > 0,
  });

  // Fetch allocation data
  const { data: allocation = [] } = useQuery<AssetAllocation[]>({
    queryKey: ['allocation', selectedPortfolio],
    queryFn: async () => {
      if (selectedPortfolio <= 0) return [];
      
      console.log('📊 Reports - Buscando alocação para portfolio:', selectedPortfolio);
      try {
        const response = await api.get(`/api/portfolios/${selectedPortfolio}/allocation`);
        console.log('✅ Reports - Alocação encontrada:', response.data);
        return response.data;
      } catch (error) {
        console.log('⚠️ Reports - Erro na alocação, calculando das posições:', error);
        // Fallback: calculate allocation from positions
        if (positions.length > 0) {
          const allocationMap: { [key: string]: { value: number; count: number } } = {};
          
          positions.forEach(pos => {
            const assetType = pos.asset?.asset_type || 'Outros';
            const value = pos.current_value || pos.total_invested || 0;
            
            if (!allocationMap[assetType]) {
              allocationMap[assetType] = { value: 0, count: 0 };
            }
            allocationMap[assetType].value += value;
            allocationMap[assetType].count += 1;
          });
          
          const totalValue = Object.values(allocationMap).reduce((sum, item) => sum + item.value, 0);
          
          return Object.entries(allocationMap).map(([asset_type, data]) => ({
            asset_type,
            value: data.value,
            percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
            count: data.count,
          }));
        }
        return [];
      }
    },
    enabled: selectedPortfolio > 0,
  });

  const handleGenerateReport = () => {
    setIsGenerating(true);
    // Refresh all data
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dividends'] });
    queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dividends'] });
    queryClient.invalidateQueries({ queryKey: ['portfolios'] });
  };

  const handleExport = () => {
    // Export report data as CSV
    const reportData = {
      period: selectedPeriod,
      portfolio: selectedPortfolio === 0 ? 'Todos' : portfolios.find(p => p.id === selectedPortfolio)?.name,
      generated_at: new Date().toISOString(),
      transactions: transactions.length,
      dividends: dividends.length,
      total_invested: dashboardData?.total_invested || 0,
      total_return: dashboardData?.total_return || 0,
      return_percentage: dashboardData?.total_return_percentage || 0,
    };

    const csvContent = [
      'Relatório de Investimentos',
      `Período,${reportData.period}`,
      `Portfólio,${reportData.portfolio}`,
      `Gerado em,${new Date(reportData.generated_at).toLocaleString('pt-BR')}`,
      '',
      'Resumo Financeiro',
      `Total Investido,R$ ${reportData.total_invested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `Retorno Total,R$ ${reportData.total_return.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `Retorno (%),${reportData.return_percentage.toFixed(2)}%`,
      '',
      'Atividade',
      `Transações,${reportData.transactions}`,
      `Dividendos,${reportData.dividends}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${selectedPeriod}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate real stats from data
  const calculateRealStats = () => {
    // Calculate from positions if available, fallback to dashboard
    if (positions.length > 0) {
      const positionsTotal = positions.reduce((sum, pos) => sum + (pos.total_invested || 0), 0);
      const positionsCurrentValue = positions.reduce((sum, pos) => sum + (pos.current_value || pos.total_invested || 0), 0);
      const positionsReturn = positionsCurrentValue - positionsTotal;
      const positionsDividends = positions.reduce((sum, pos) => sum + (pos.dividends_received || 0), 0);
      
      // Include dividends in total return calculation
      const totalReturnWithDividends = positionsReturn + positionsDividends;
      const returnPercentage = positionsTotal > 0 ? (totalReturnWithDividends / positionsTotal) * 100 : 0;
      
      console.log('📊 Reports - Estatísticas calculadas das posições:', {
        totalInvestido: positionsTotal,
        valorAtual: positionsCurrentValue,
        retornoCapital: positionsReturn,
        totalDividendos: positionsDividends,
        retornoTotal: totalReturnWithDividends,
        percentualRetorno: returnPercentage
      });
      
      return {
        totalInvested: positionsTotal,
        totalReturn: totalReturnWithDividends,
        returnPercentage: returnPercentage,
        totalDividends: positionsDividends
      };
    }
    
    // Fallback to dashboard data
    return {
      totalInvested: dashboardData?.total_invested || 0,
      totalReturn: dashboardData?.total_return || 0,
      returnPercentage: dashboardData?.total_return_percentage || 0,
      totalDividends: dividends.reduce((sum, d) => sum + (d.net_amount || d.total_amount || 0), 0)
    };
  };

  const { totalInvested, totalReturn, returnPercentage, totalDividends } = calculateRealStats();
  const totalTransactions = transactions.length;

  // Calculate advanced metrics from positions
  const calculateAdvancedMetrics = () => {
    if (positions.length === 0) {
      return {
        volatility: 0,
        beta: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        topPerformers: [],
        sectors: [],
      };
    }

    // Calculate real returns including dividends for each position
    const positionReturns = positions.map(p => {
      const invested = p.total_invested || 0;
      const current = p.current_value || invested;
      const capitalReturn = current - invested;
      const dividends = p.dividends_received || 0;
      const totalReturn = capitalReturn + dividends;
      return invested > 0 ? (totalReturn / invested) * 100 : 0;
    });

    console.log('📊 Reports - Retornos reais das posições:', positionReturns);

    // Calculate real volatility (standard deviation of position returns)
    const avgReturn = positionReturns.reduce((sum, r) => sum + r, 0) / positionReturns.length;
    const variance = positionReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / positionReturns.length;
    const volatility = Math.sqrt(variance);

    // Real beta calculation (correlation with market)
    // For Brazilian market, using IBOVESPA benchmark (~15% annual return)
    const marketReturn = 15; // IBOVESPA expected return
    const marketVolatility = 25; // IBOVESPA typical volatility
    
    // Calculate covariance with market (simplified)
    const beta = volatility > 0 ? (avgReturn / marketReturn) * (volatility / marketVolatility) : 0;

    // Real Sharpe ratio (using SELIC as risk-free rate ≈ 12%)
    const riskFreeRate = 12; // Current SELIC rate
    const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;

    // Real max drawdown (maximum negative return from positions)
    const maxDrawdown = Math.min(...positionReturns, 0);

    // Top performers - show all positions, not just positive returns
    const topPerformers = positions
      .filter(p => p.asset)
      .sort((a, b) => {
        const aReturn = (a.total_return || 0) + (a.dividends_received || 0);
        const bReturn = (b.total_return || 0) + (b.dividends_received || 0);
        return bReturn - aReturn;
      })
      .slice(0, 4)
      .map(p => {
        const capitalReturn = p.total_return || 0;
        const dividendReturn = p.dividends_received || 0;
        const totalReturn = capitalReturn + dividendReturn;
        const returnPercentage = (p.total_invested || 0) > 0 ? (totalReturn / (p.total_invested || 1)) * 100 : 0;
        const contribution = (p.total_invested || 0) > 0 ? ((p.total_invested || 0) / totalInvested) * returnPercentage : 0;
        
        return {
          symbol: p.asset.symbol,
          name: p.asset.name,
          return: returnPercentage,
          contribution: contribution,
          value: p.current_value || p.total_invested || 0,
          totalReturn: totalReturn,
        };
      });

    // Group by sector
    const sectorMap: { [key: string]: { value: number; count: number; return: number } } = {};
    positions.forEach(p => {
      const sector = p.asset?.sector || 'Outros';
      if (!sectorMap[sector]) {
        sectorMap[sector] = { value: 0, count: 0, return: 0 };
      }
      // Use total_invested instead of current_value if not available
      const positionValue = p.current_value || p.total_invested || 0;
      sectorMap[sector].value += positionValue;
      sectorMap[sector].count += 1;
      sectorMap[sector].return += p.total_return_percentage || 0;
    });

    const sectors = Object.entries(sectorMap)
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalInvested > 0 ? (data.value / totalInvested) * 100 : 0,
        trend: data.count > 0 ? data.return / data.count : 0,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    console.log('📈 Reports - Métricas calculadas:', {
      volatility,
      beta,
      sharpeRatio,
      maxDrawdown,
      topPerformers,
      sectors
    });

    return {
      volatility,
      beta,
      sharpeRatio,
      maxDrawdown,
      topPerformers,
      sectors,
    };
  };

  const metrics = calculateAdvancedMetrics();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Premium - Consistente com Portfolios */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: 2,
          mb: 3
        }}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                fontSize: { xs: '2rem', md: '2.5rem' }
              }}
            >
              Relatórios Avançados
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Análises detalhadas de performance, risco e alocação com insights profissionais
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            size="large"
            startIcon={isGenerating ? null : <Assessment />}
            onClick={handleGenerateReport}
            disabled={isGenerating}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
              },
              transition: 'all 0.2s ease',
            }}
          >
            {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </Box>

        {/* Barra de Controles - Estilo Portfolios */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 3,
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            {/* Estatísticas e Controles */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Estatísticas Compactas */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney sx={{ color: theme.palette.success.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Investido
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                    R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {positions.length} posição{positions.length !== 1 ? 'ões' : ''}
                  </Typography>
                </Box>
              </Box>
              
              <Divider orientation="vertical" flexItem />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp sx={{ color: totalReturn >= 0 ? theme.palette.primary.main : theme.palette.error.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Retorno Total
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: totalReturn >= 0 ? theme.palette.primary.main : theme.palette.error.main 
                  }}>
                    {totalReturn >= 0 ? '+' : ''}R$ {totalReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment sx={{ color: theme.palette.warning.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Performance
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600,
                    color: returnPercentage >= 0 ? theme.palette.success.main : theme.palette.error.main
                  }}>
                    {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    R$ {totalReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              {/* Seletores */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Portfólio</InputLabel>
                <Select
                  value={selectedPortfolio}
                  onChange={(e) => setSelectedPortfolio(Number(e.target.value))}
                  label="Portfólio"
                >
                  <MenuItem value={0}>Todos os Portfólios</MenuItem>
                  {portfolios.map((portfolio) => (
                    <MenuItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <ButtonGroup variant="outlined" size="small">
                {['1M', '3M', '6M', '1A', '2A'].map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'contained' : 'outlined'}
                    onClick={() => setSelectedPeriod(period)}
                    sx={{ 
                      minWidth: 40,
                      background: selectedPeriod === period ? 
                        `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` : 
                        'transparent'
                    }}
                  >
                    {period}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>

            {/* Controles */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Filtros Avançados" arrow>
                <IconButton 
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      borderColor: theme.palette.primary.main,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FilterList fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Exportar Relatório" arrow>
                <IconButton 
                  size="small"
                  onClick={handleExport}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      borderColor: theme.palette.success.main,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Atualizar dados" arrow>
                <IconButton 
                  size="small"
                  onClick={handleRefresh}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      borderColor: theme.palette.info.main,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {isGenerating && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                sx={{ 
                  borderRadius: 1,
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }
                }} 
              />
            </Box>
          )}
        </Paper>
      </Box>

      {/* Resumo Executivo */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 3,
            p: 4,
            mb: 4,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: theme.palette.primary.main }}>
            Resumo Executivo - {selectedPeriod}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ 
                  fontWeight: 700, 
                  color: returnPercentage >= 0 ? theme.palette.success.main : theme.palette.error.main,
                  mb: 1 
                }}>
                  {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(1)}%
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Retorno Total
                </Typography>
                <Chip 
                  label={`R$ ${totalReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  size="small" 
                  sx={{ 
                    mt: 1,
                    background: alpha(returnPercentage >= 0 ? theme.palette.success.main : theme.palette.error.main, 0.1),
                    color: returnPercentage >= 0 ? theme.palette.success.main : theme.palette.error.main
                  }} 
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.primary.main,
                  mb: 1 
                }}>
                  R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Investido
                </Typography>
                <Chip 
                  label={portfolios.length > 0 ? `${portfolios.length} portfólio${portfolios.length > 1 ? 's' : ''}` : 'Nenhum portfólio'}
                  size="small" 
                  sx={{ 
                    mt: 1,
                    background: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main 
                  }} 
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.warning.main,
                  mb: 1 
                }}>
                  {totalTransactions}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Transações
                </Typography>
                <Chip 
                  label={`Período: ${selectedPeriod}`}
                  size="small" 
                  sx={{ 
                    mt: 1,
                    background: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main 
                  }} 
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.info.main,
                  mb: 1 
                }}>
                  R$ {totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Dividendos
                </Typography>
                <Chip 
                  label={`${dividends.length} pagamento${dividends.length !== 1 ? 's' : ''}`}
                  size="small" 
                  sx={{ 
                    mt: 1,
                    background: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main 
                  }} 
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      {/* Grid de Conteúdo */}
      <Grid container spacing={4}>
        {/* Tipos de Relatório */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              borderRadius: 4,
              p: 3,
              height: 'auto',
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              mb: 3,
              color: theme.palette.text.primary,
              fontSize: '1.1rem'
            }}>
              Tipos de Relatório
            </Typography>

            <Grid container spacing={2.5} sx={{ flexGrow: 1 }}>
              {[
                { 
                  title: 'Performance', 
                  desc: `${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(1)}% retorno`, 
                  value: `${positions.length} posição${positions.length !== 1 ? 'ões' : ''}`,
                  icon: TrendingUp, 
                  color: returnPercentage >= 0 ? '#059669' : '#dc2626',
                  bgColor: returnPercentage >= 0 ? '#f0fdf4' : '#fef2f2'
                },
                { 
                  title: 'Alocação', 
                  desc: `${metrics.sectors.length} setor${metrics.sectors.length !== 1 ? 'es' : ''}`, 
                  value: `${allocation.length || 1} classe${(allocation.length || 1) !== 1 ? 's' : ''}`,
                  icon: PieChart, 
                  color: '#2563eb',
                  bgColor: '#eff6ff'
                },
                { 
                  title: 'Diversificação', 
                  desc: `${positions.length} ativo${positions.length !== 1 ? 's' : ''}`, 
                  value: positions.length >= 10 ? 'Alta' : positions.length >= 5 ? 'Média' : 'Baixa',
                  icon: Speed, 
                  color: positions.length >= 10 ? '#059669' : positions.length >= 5 ? '#d97706' : '#dc2626',
                  bgColor: positions.length >= 10 ? '#f0fdf4' : positions.length >= 5 ? '#fffbeb' : '#fef2f2'
                },
                { 
                  title: 'Fiscal', 
                  desc: `${transactions.length} transaç${transactions.length !== 1 ? 'ões' : 'ão'}`, 
                  value: `R$ ${(totalDividends/1000).toFixed(0)}k`,
                  icon: AccountBalance, 
                  color: '#0891b2',
                  bgColor: '#f0f9ff'
                }
              ].map((report, index) => (
                <Grid item xs={6} key={index} sx={{ display: 'flex' }}>
                  <Zoom in timeout={300 + index * 100} style={{ width: '100%' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        cursor: 'pointer',
                        background: report.bgColor,
                        border: `1px solid ${alpha(report.color, 0.15)}`,
                        borderRadius: 3,
                        p: 2.5,
                        textAlign: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        height: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-6px) scale(1.03)',
                          boxShadow: `0 12px 40px ${alpha(report.color, 0.2)}`,
                          border: `1px solid ${alpha(report.color, 0.3)}`,
                          '& .report-icon': {
                            transform: 'scale(1.1) rotate(5deg)',
                          },
                          '& .status-chip': {
                            transform: 'scale(1.05)',
                          }
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '3px',
                          background: `linear-gradient(90deg, ${report.color}, ${alpha(report.color, 0.7)})`,
                        }
                      }}
                    >
                      {/* Ícone */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: 1,
                        flex: 1,
                        justifyContent: 'center'
                      }}>
                        <Avatar
                          className="report-icon"
                          sx={{
                            background: `linear-gradient(135deg, ${report.color}, ${alpha(report.color, 0.8)})`,
                            width: 48,
                            height: 48,
                            boxShadow: `0 4px 16px ${alpha(report.color, 0.25)}`,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <report.icon sx={{ fontSize: 24, color: 'white' }} />
                        </Avatar>
                        
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 700, 
                          color: report.color,
                          fontSize: '1rem',
                          lineHeight: 1.2
                        }}>
                          {report.title}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          fontSize: '0.85rem',
                          lineHeight: 1.3,
                          opacity: 0.8
                        }}>
                          {report.desc}
                        </Typography>
                      </Box>
                      
                      {/* Status Chip */}
                      <Chip
                        className="status-chip"
                        label={report.value}
                        size="small"
                        sx={{
                          background: report.color,
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          height: '28px',
                          borderRadius: '14px',
                          transition: 'all 0.3s ease',
                          boxShadow: `0 2px 8px ${alpha(report.color, 0.3)}`,
                          '& .MuiChip-label': {
                            px: 2
                          }
                        }}
                      />
                    </Paper>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>



        {/* Top Performers */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              p: 3,
              height: 400,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Maiores Contribuidores
            </Typography>

            <Stack spacing={2}>
              {metrics.topPerformers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPortfolio === 0 ? 'Selecione um portfólio para ver os maiores contribuidores' : 'Nenhuma posição encontrada'}
                  </Typography>
                </Box>
              ) : (
                metrics.topPerformers.map((stock, index) => (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    background: `linear-gradient(145deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          background: `linear-gradient(45deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.main, 0.7)})`,
                          width: 32,
                          height: 32,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                      >
                        {stock.symbol.slice(0, 2)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {stock.symbol}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {stock.name}
                        </Typography>
                      </Box>
                    </Stack>
                    <Box textAlign="right">
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 700,
                        color: stock.return >= 0 ? theme.palette.success.main : theme.palette.error.main,
                        fontSize: '0.85rem'
                      }}>
                        {stock.return >= 0 ? '+' : ''}{stock.return.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {stock.contribution >= 0 ? '+' : ''}{stock.contribution.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              )))}
            </Stack>
          </Paper>
        </Grid>

        {/* Análise de Alocação */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              p: 4,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Análise de Alocação por Setor
            </Typography>

            <Grid container spacing={3}>
              {metrics.sectors.length === 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPortfolio === 0 ? 'Selecione um portfólio para ver a análise de alocação' : 'Nenhum setor encontrado'}
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                metrics.sectors.slice(0, 5).map((sector, index) => {
                  const colors = ['#4f46e5', '#059669', '#dc2626', '#d97706', '#7c3aed'];
                  const color = colors[index % colors.length];
                  
                  return (
                <Grid item xs={12} sm={6} md={2.4} key={index}>
                  <Paper
                    elevation={0}
                    sx={{
                      background: `linear-gradient(145deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                      border: `1px solid ${alpha(color, 0.2)}`,
                      borderRadius: 2,
                      p: 2,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 32px ${alpha(color, 0.3)}`,
                      },
                    }}
                  >
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700, 
                      color: color,
                      mb: 1 
                    }}>
                      {sector.percentage.toFixed(1)}%
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      {sector.name}
                    </Typography>
                    <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                      <Chip
                        label={`${sector.trend >= 0 ? '+' : ''}${sector.trend.toFixed(1)}%`}
                        size="small"
                        sx={{
                          background: alpha(sector.trend >= 0 ? theme.palette.success.main : theme.palette.error.main, 0.1),
                          color: sector.trend >= 0 ? theme.palette.success.main : theme.palette.error.main,
                          fontSize: '0.7rem',
                          height: 20,
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={`${sector.count} ativo${sector.count > 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          background: alpha(color, 0.1),
                          color: color,
                          fontSize: '0.7rem',
                          height: 20,
                          fontWeight: 600,
                        }}
                      />
                    </Stack>
                  </Paper>
                </Grid>
                  );
                })
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Resumo Detalhado de Transações e Performance */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Resumo de Atividade - {selectedPeriod}
            </Typography>

            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Transações no Período
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 1 }}>
                  {totalTransactions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {transactions.length > 0 ? 
                    `Última: ${new Date(transactions[0]?.date || '').toLocaleDateString('pt-BR')}` : 
                    'Nenhuma transação no período'
                  }
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Dividendos Recebidos
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.success.main, mb: 1 }}>
                  R$ {totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dividends.length} pagamento{dividends.length !== 1 ? 's' : ''} no período
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Yield sobre Investido
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: totalInvested > 0 ? theme.palette.info.main : theme.palette.text.secondary,
                  mb: 1 
                }}>
                  {totalInvested > 0 ? 
                    `${((totalDividends / totalInvested) * 100).toFixed(2)}%` : 
                    '0.00%'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rendimento sobre capital investido
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Evolução e Metas */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Performance vs Mercado
            </Typography>

            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Retorno Total (Capital + Dividendos)
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: returnPercentage >= 0 ? theme.palette.success.main : theme.palette.error.main,
                  mb: 1 
                }}>
                  {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  R$ {totalReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em retorno total
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Comparação com CDI (≈12% a.a.)
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: returnPercentage > 12 ? theme.palette.success.main : 
                         returnPercentage > 6 ? theme.palette.warning.main : theme.palette.error.main,
                  mb: 1 
                }}>
                  {returnPercentage > 12 ? 'Superando' : 
                   returnPercentage > 6 ? 'Próximo' : 'Abaixo'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {returnPercentage > 12 ? 'Performance superior ao CDI' : 
                   returnPercentage > 6 ? 'Performance competitiva' : 'Espaço para melhoria'}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Concentração de Risco
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: positions.length >= 10 ? theme.palette.success.main : 
                         positions.length >= 5 ? theme.palette.warning.main : theme.palette.error.main,
                  mb: 1 
                }}>
                  {positions.length >= 10 ? 'Diversificado' : 
                   positions.length >= 5 ? 'Moderado' : 'Concentrado'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {positions.length} posição{positions.length !== 1 ? 'ões' : ''} ativa{positions.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
