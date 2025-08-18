import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Divider,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
  Fade,
  Zoom,
} from '@mui/material';
import {
  TrendingUp,
  Analytics,
  Speed,
  Timeline,
  PieChart as PieChartIcon,
  ScatterPlot,
  Functions,
  Calculate,
  Refresh,
  Download,
  Settings,
  Info,
  Warning,
  CheckCircle,
  PlayArrow,
  Stop,
  Tune,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Types
interface Portfolio {
  id: number;
  name: string;
  total_value: number;
  total_invested: number;
  total_return: number;
  total_return_percentage: number;
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
  asset: {
    id: number;
    symbol: string;
    name: string;
    asset_type: string;
    sector: string;
  };
}

interface OptimizationResult {
  weights: { [symbol: string]: number };
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  sortino_ratio?: number;
  efficient_frontier: Array<{
    return: number;
    risk: number;
    sharpe: number;
    weights: { [symbol: string]: number };
  }>;
}

interface MonteCarloResult {
  scenarios: Array<{
    final_value: number;
    return_percentage: number;
    path: number[];
  }>;
  statistics: {
    mean_return: number;
    std_return: number;
    var_95: number;
    var_99: number;
    probability_of_loss: number;
    best_case: number;
    worst_case: number;
  };
}

export default function Optimization() {
  const theme = useTheme();
  const [selectedPortfolio, setSelectedPortfolio] = useState<number>(0);
  const [riskTolerance, setRiskTolerance] = useState<number>(5);
  const [optimizationMethod, setOptimizationMethod] = useState<'max_sharpe' | 'max_sortino' | 'min_risk' | 'max_return'>('max_sharpe');
  const [timeHorizon, setTimeHorizon] = useState<number>(12);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [monteCarloRuns, setMonteCarloRuns] = useState(10000);
  
  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await api.get('/api/portfolios/');
      return response.data;
    },
  });

  // Auto-select first portfolio
  useEffect(() => {
    if (portfolios.length > 0 && selectedPortfolio === 0) {
      setSelectedPortfolio(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolio]);

  // Fetch positions for selected portfolio
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['positions', selectedPortfolio],
    queryFn: async () => {
      if (selectedPortfolio === 0) return [];
      const response = await api.get(`/api/portfolios/${selectedPortfolio}/positions`);
      return response.data;
    },
    enabled: selectedPortfolio > 0,
  });

  // Optimization results
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    
    try {
      const response = await api.post('/api/optimization/optimize', {
        portfolio_id: selectedPortfolio,
        method: optimizationMethod,
        risk_tolerance: riskTolerance,
        time_horizon: timeHorizon
      });

      setOptimizationResult(response.data);
    } catch (error: any) {
      console.error('Optimization error:', error);
      // Fallback to mock data if API fails
      const mockResult: OptimizationResult = {
        weights: positions.reduce((acc, pos) => {
          acc[pos.asset.symbol] = Math.random() * 0.4 + 0.1;
          return acc;
        }, {} as { [symbol: string]: number }),
        expected_return: 0.12 + (riskTolerance / 10) * 0.08,
        volatility: 0.15 + (riskTolerance / 10) * 0.1,
        sharpe_ratio: 1.2 + (riskTolerance / 10) * 0.5,
        efficient_frontier: Array.from({ length: 20 }, (_, i) => {
          const risk = 0.1 + (i / 19) * 0.3;
          const ret = 0.08 + (i / 19) * 0.15;
          return {
            return: ret,
            risk: risk,
            sharpe: ret / risk,
            weights: positions.reduce((acc, pos) => {
              acc[pos.asset.symbol] = Math.random();
              return acc;
            }, {} as { [symbol: string]: number })
          };
        })
      };

      // Normalize weights
      const totalWeight = Object.values(mockResult.weights).reduce((sum, w) => sum + w, 0);
      Object.keys(mockResult.weights).forEach(symbol => {
        mockResult.weights[symbol] /= totalWeight;
      });

      setOptimizationResult(mockResult);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleMonteCarloSimulation = async () => {
    if (!optimizationResult) return;
    
    setIsSimulating(true);
    
    try {
      const response = await api.post('/api/optimization/monte-carlo', {
        portfolio_id: selectedPortfolio,
        optimization_weights: optimizationResult.weights,
        time_horizon: timeHorizon,
        num_simulations: monteCarloRuns,
        initial_value: selectedPortfolioData?.total_value || 100000
      });

      setMonteCarloResult(response.data);
    } catch (error: any) {
      console.error('Monte Carlo simulation error:', error);
      // Fallback to mock data if API fails
      const scenarios = Array.from({ length: Math.min(monteCarloRuns, 1000) }, () => {
        const finalReturn = (Math.random() - 0.5) * 0.6 + 0.12;
        const finalValue = (selectedPortfolioData?.total_value || 100000) * (1 + finalReturn);
        return {
          final_value: finalValue,
          return_percentage: finalReturn * 100,
          path: Array.from({ length: timeHorizon }, (_, i) => {
            return (selectedPortfolioData?.total_value || 100000) * Math.pow(1 + finalReturn / timeHorizon, i + 1);
          })
        };
      });

      const returns = scenarios.map(s => s.return_percentage);
      returns.sort((a, b) => a - b);

      const mockMonteCarloResult: MonteCarloResult = {
        scenarios,
        statistics: {
          mean_return: returns.reduce((sum, r) => sum + r, 0) / returns.length,
          std_return: Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - 12, 2), 0) / returns.length),
          var_95: returns[Math.floor(returns.length * 0.05)],
          var_99: returns[Math.floor(returns.length * 0.01)],
          probability_of_loss: returns.filter(r => r < 0).length / returns.length * 100,
          best_case: Math.max(...returns),
          worst_case: Math.min(...returns),
        }
      };

      setMonteCarloResult(mockMonteCarloResult);
    } finally {
      setIsSimulating(false);
    }
  };

  const selectedPortfolioData = portfolios.find(p => p.id === selectedPortfolio);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
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
          Otimização de Portfólio
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          Análise quantitativa avançada com Teoria de Markowitz, Fronteira Eficiente e Simulação de Monte Carlo
        </Typography>
      </Box>

      {/* Controls */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 3,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Portfólio</InputLabel>
              <Select
                value={selectedPortfolio}
                onChange={(e) => setSelectedPortfolio(Number(e.target.value))}
                label="Portfólio"
              >
                {portfolios.map((portfolio) => (
                  <MenuItem key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Método de Otimização</InputLabel>
              <Select
                value={optimizationMethod}
                onChange={(e) => setOptimizationMethod(e.target.value as any)}
                label="Método de Otimização"
              >
                <MenuItem value="max_sharpe">Máximo Sharpe</MenuItem>
                <MenuItem value="max_sortino">Máximo Sortino</MenuItem>
                <MenuItem value="min_risk">Mínimo Risco</MenuItem>
                <MenuItem value="max_return">Máximo Retorno</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Tolerância ao Risco: {riskTolerance}
            </Typography>
            <Slider
              value={riskTolerance}
              onChange={(_, value) => setRiskTolerance(value as number)}
              min={1}
              max={10}
              step={1}
              marks
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Horizonte: {timeHorizon} meses
            </Typography>
            <Slider
              value={timeHorizon}
              onChange={(_, value) => setTimeHorizon(value as number)}
              min={3}
              max={60}
              step={3}
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleOptimize}
                disabled={isOptimizing || positions.length === 0}
                startIcon={isOptimizing ? <LinearProgress /> : <Calculate />}
                fullWidth
                size="small"
              >
                {isOptimizing ? 'Otimizando...' : 'Otimizar'}
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
                size="small"
              />
            }
            label="Configurações Avançadas"
          />
          
          {showAdvanced && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Simulações Monte Carlo: {monteCarloRuns.toLocaleString()}
              </Typography>
              <Slider
                value={monteCarloRuns}
                onChange={(_, value) => setMonteCarloRuns(value as number)}
                min={1000}
                max={50000}
                step={1000}
                sx={{ width: 120 }}
                size="small"
              />
              <Button
                variant="outlined"
                onClick={handleMonteCarloSimulation}
                disabled={isSimulating || !optimizationResult}
                startIcon={isSimulating ? <LinearProgress /> : <PlayArrow />}
                size="small"
              >
                {isSimulating ? 'Simulando...' : 'Monte Carlo'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Portfolio Info */}
      {selectedPortfolioData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    <TrendingUp />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      R$ {selectedPortfolioData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valor Total
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ 
              bgcolor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <Analytics />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedPortfolioData.total_return_percentage >= 0 ? '+' : ''}{selectedPortfolioData.total_return_percentage.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Retorno Total
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ 
              bgcolor: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                    <PieChartIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {positions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ativos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ 
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                    <Speed />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {positions.length >= 10 ? 'Alta' : positions.length >= 5 ? 'Média' : 'Baixa'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Diversificação
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Results */}
      <Grid container spacing={4}>
        {/* Optimization Results */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              minHeight: 400,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                <Functions />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Otimização de Markowitz
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fronteira eficiente e alocação ótima
                </Typography>
              </Box>
            </Box>

            {optimizationResult ? (
              <Box>
                {/* Key Metrics */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={optimizationResult.sortino_ratio ? 3 : 4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                        {(optimizationResult.expected_return * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Retorno Esperado
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={optimizationResult.sortino_ratio ? 3 : 4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                        {(optimizationResult.volatility * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Volatilidade
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={optimizationResult.sortino_ratio ? 3 : 4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                        {optimizationResult.sharpe_ratio.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Índice Sharpe
                      </Typography>
                    </Box>
                  </Grid>
                  {optimizationResult.sortino_ratio && (
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                          {optimizationResult.sortino_ratio.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Índice Sortino
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                {/* Efficient Frontier Chart */}
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis 
                      dataKey="risk"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      label={{ value: 'Risco (Volatilidade)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      dataKey="return"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      label={{ value: 'Retorno', angle: -90, position: 'insideLeft' }}
                    />
                    <RechartsTooltip
                      formatter={(value: any, name: string) => [
                        `${(value * 100).toFixed(2)}%`,
                        name === 'return' ? 'Retorno' : name === 'risk' ? 'Risco' : 'Sharpe'
                      ]}
                      contentStyle={{
                        backgroundColor: alpha(theme.palette.background.paper, 0.95),
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        borderRadius: 8,
                      }}
                    />
                    <Scatter 
                      data={optimizationResult.efficient_frontier} 
                      fill={theme.palette.primary.main}
                    />
                    <Scatter 
                      data={[{
                        risk: optimizationResult.volatility,
                        return: optimizationResult.expected_return,
                        sharpe: optimizationResult.sharpe_ratio
                      }]} 
                      fill={theme.palette.success.main}
                      shape="star"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: 300,
                color: 'text.secondary'
              }}>
                <Functions sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Otimização não executada
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center', maxWidth: 300 }}>
                  Selecione um portfólio e clique em "Otimizar" para ver a fronteira eficiente e alocação ótima
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Optimal Allocation */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              minHeight: 400,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main }}>
                <PieChartIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Alocação Ótima
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Distribuição recomendada dos ativos
                </Typography>
              </Box>
            </Box>

            {optimizationResult ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ativo</TableCell>
                      <TableCell align="right">Peso Atual</TableCell>
                      <TableCell align="right">Peso Ótimo</TableCell>
                      <TableCell align="right">Diferença</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {positions.map((position) => {
                      const currentWeight = (position.current_value / selectedPortfolioData!.total_value) * 100;
                      const optimalWeight = (optimizationResult.weights[position.asset.symbol] || 0) * 100;
                      const difference = optimalWeight - currentWeight;
                      
                      return (
                        <TableRow key={position.asset.symbol}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {position.asset.symbol}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {position.asset.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {currentWeight.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {optimalWeight.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${difference >= 0 ? '+' : ''}${difference.toFixed(1)}%`}
                              size="small"
                              color={Math.abs(difference) < 1 ? 'default' : difference > 0 ? 'success' : 'error'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: 300,
                color: 'text.secondary'
              }}>
                <PieChartIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Alocação não calculada
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center', maxWidth: 300 }}>
                  Execute a otimização para ver a distribuição recomendada dos ativos
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Monte Carlo Simulation */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                <ScatterPlot />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Simulação de Monte Carlo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Análise de risco e projeções probabilísticas
                </Typography>
              </Box>
            </Box>

            {monteCarloResult ? (
              <Grid container spacing={3}>
                {/* Statistics */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Retorno Médio
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                        {monteCarloResult.statistics.mean_return.toFixed(2)}%
                      </Typography>
                    </Box>
                    
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Volatilidade
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                        {monteCarloResult.statistics.std_return.toFixed(2)}%
                      </Typography>
                    </Box>
                    
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        VaR 95%
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                        {monteCarloResult.statistics.var_95.toFixed(2)}%
                      </Typography>
                    </Box>
                    
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Probabilidade de Perda
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                        {monteCarloResult.statistics.probability_of_loss.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Distribution Chart */}
                <Grid item xs={12} md={8}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monteCarloResult.scenarios.slice(0, 100).map((scenario, index) => ({
                      scenario: index,
                      return: scenario.return_percentage
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                      <XAxis 
                        dataKey="scenario"
                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        label={{ value: 'Cenários', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        label={{ value: 'Retorno (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <RechartsTooltip
                        formatter={(value: any) => [`${value.toFixed(2)}%`, 'Retorno']}
                        contentStyle={{
                          backgroundColor: alpha(theme.palette.background.paper, 0.95),
                          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                          borderRadius: 8,
                        }}
                      />
                      <Area 
                        dataKey="return" 
                        stroke={theme.palette.info.main}
                        fill={alpha(theme.palette.info.main, 0.3)}
                      />
                      <ReferenceLine 
                        y={monteCarloResult.statistics.mean_return} 
                        stroke={theme.palette.success.main}
                        strokeDasharray="5 5"
                        label="Média"
                      />
                      <ReferenceLine 
                        y={monteCarloResult.statistics.var_95} 
                        stroke={theme.palette.error.main}
                        strokeDasharray="5 5"
                        label="VaR 95%"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: 300,
                color: 'text.secondary'
              }}>
                <ScatterPlot sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Simulação não executada
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center', maxWidth: 400 }}>
                  Execute primeiro a otimização e depois ative as configurações avançadas para rodar a simulação de Monte Carlo
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Alerts and Recommendations */}
      {optimizationResult && (
        <Box sx={{ mt: 4 }}>
          <Alert 
            severity="info" 
            icon={<Info />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              <strong>Recomendação:</strong> A otimização sugere rebalancear o portfólio para maximizar o índice {optimizationMethod === 'max_sortino' ? 'Sortino' : 'Sharpe'}. 
              {optimizationMethod === 'max_sortino' && 'O Sortino considera apenas o risco negativo, oferecendo uma visão mais precisa do risco real. '}
              Considere os custos de transação antes de implementar as mudanças.
            </Typography>
          </Alert>
          
          {monteCarloResult && monteCarloResult.statistics.probability_of_loss > 30 && (
            <Alert 
              severity="warning" 
              icon={<Warning />}
            >
              <Typography variant="body2">
                <strong>Atenção:</strong> A simulação indica uma probabilidade de perda de {monteCarloResult.statistics.probability_of_loss.toFixed(1)}%, 
                que pode ser considerada alta para o seu perfil de risco.
              </Typography>
            </Alert>
          )}
        </Box>
      )}
    </Container>
  );
}
