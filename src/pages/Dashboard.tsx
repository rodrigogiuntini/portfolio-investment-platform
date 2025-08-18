import { useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  useTheme,
  alpha,
  Avatar,
  IconButton,
  Tooltip,
  Skeleton,
  ButtonGroup,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
  Analytics,
  Speed,
  Refresh,
  PieChart as PieChartIcon,
  Timeline,
  Add,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface DashboardData {
  portfolios: Array<{
    portfolio_id: number;
    portfolio_name: string;
    total_value: number;
    total_invested: number;
    total_return: number;
    total_return_percentage: number;
    currency: string;
  }>;
  total_patrimony: number;
  total_invested: number;
  total_return: number;
  total_return_percentage: number;
  asset_allocation: Array<{
    asset_type: string;
    value: number;
    percentage: number;
    count: number;
  }>;
  performance_metrics: {
    daily_return?: number;
    monthly_return?: number;
    yearly_return?: number;
    volatility?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
  };
  recent_transactions: Array<{
    id: number;
    date: string;
    transaction_type: string;
    total_amount: number;
    asset?: {
      symbol: string;
      name: string;
    };
  }>;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function Dashboard() {
  const theme = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '7d' | '1m' | '3m' | '1y'>('1m');
  const [showValues, setShowValues] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/');
      return response.data;
    },
    refetchInterval: 60000,
    retry: 2,
  });

  const { data: evolutionData } = useQuery({
    queryKey: ['evolution', selectedPeriod],
    queryFn: async () => {
      try {
        if (!dashboardData?.portfolios || dashboardData.portfolios.length === 0) {
          return { data: [] };
        }

        const response = await api.get(`/api/dashboard/evolution?period=${selectedPeriod}`);
        
        if (response.data?.data && response.data.data.length > 0) {
          return response.data;
        }

        // Fallback: gerar dados simulados baseados nos dados reais
        const totalInvested = dashboardData.total_invested || 0;
        const totalReturn = dashboardData.total_return || 0;
        const periodDays = selectedPeriod === '1d' ? 1 : 
                          selectedPeriod === '7d' ? 7 :
                          selectedPeriod === '1m' ? 30 :
                          selectedPeriod === '3m' ? 90 : 365;

        const evolutionPoints = [];
        const now = new Date();
        
        for (let i = periodDays; i >= 0; i -= Math.max(1, Math.floor(periodDays / 15))) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const progress = (periodDays - i) / periodDays;
          const simulatedReturn = totalReturn * progress;
          const value = totalInvested + simulatedReturn;
          
          evolutionPoints.push({
            date: date.toISOString().split('T')[0],
            value: Math.max(0, value),
            invested: totalInvested,
            return: simulatedReturn
          });
        }

        return { data: evolutionPoints };
      } catch (err: any) {
        console.error('Evolution API error:', err);
        return { data: [] };
      }
    },
    enabled: !!dashboardData,
    retry: 1,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={300} height={20} />
        </Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card elevation={0} sx={{ 
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderRadius: 2,
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1.5 }} />
                    <Skeleton variant="text" width={100} height={16} />
                  </Box>
                  <Skeleton variant="text" width={120} height={32} />
                  <Skeleton variant="rectangular" width={60} height={20} sx={{ mt: 1, borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Paper elevation={0} sx={{ 
              p: 2, 
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
            }}>
              <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={250} sx={{ borderRadius: 1 }} />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper elevation={0} sx={{ 
              p: 2, 
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
            }}>
              <Skeleton variant="text" width={140} height={28} sx={{ mb: 2 }} />
              <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Dashboard
        </Typography>
        <Paper elevation={0} sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: alpha(theme.palette.error.main, 0.05),
          border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          borderRadius: 2,
        }}>
          <Typography variant="h6" sx={{ mb: 2, color: theme.palette.error.main }}>
            Erro ao Carregar Dados
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Não foi possível carregar os dados do dashboard. Tente novamente.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            color="error"
          >
            Tentar Novamente
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!dashboardData || dashboardData.portfolios.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Dashboard
        </Typography>
        <Paper elevation={0} sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: 2,
        }}>
          <Avatar sx={{
            width: 64,
            height: 64,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            mx: 'auto',
            mb: 2,
            fontSize: '2rem',
          }}>
            📊
          </Avatar>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Bem-vindo ao seu Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            Comece criando seu primeiro portfólio para acompanhar seus investimentos e ter acesso a análises detalhadas.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            href="/portfolios"
            sx={{ borderRadius: 2 }}
          >
            Criar Primeiro Portfólio
          </Button>
        </Paper>
      </Container>
    );
  }

  const safeData = {
    ...dashboardData,
    total_return: dashboardData.total_return ?? 0,
    total_return_percentage: dashboardData.total_return_percentage ?? 0,
    total_patrimony: dashboardData.total_patrimony ?? 0,
    total_invested: dashboardData.total_invested ?? 0,
    portfolios: dashboardData.portfolios ?? [],
    asset_allocation: dashboardData.asset_allocation ?? [],
    performance_metrics: dashboardData.performance_metrics ?? {},
    recent_transactions: dashboardData.recent_transactions ?? []
  };

  const isPositiveReturn = safeData.total_return >= 0;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Compacto */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visão geral dos investimentos
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={showValues ? "Ocultar valores" : "Mostrar valores"}>
            <IconButton
              onClick={() => setShowValues(!showValues)}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }
              }}
            >
              {showValues ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Atualizar dados">
            <IconButton
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }
              }}
            >
              <Refresh sx={{ 
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                }
              }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Cards de Métricas Principais - Compactos */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={0} sx={{ 
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
            height: '100%',
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  mr: 1.5,
                }}>
                  <AccountBalanceWallet sx={{ fontSize: '1rem' }} />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Patrimônio Total
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {showValues ? formatCurrency(safeData.total_patrimony) : '••••••'}
              </Typography>
              <Chip
                label={showValues ? formatPercentage(safeData.total_return_percentage) : '••••'}
                size="small"
                color={isPositiveReturn ? 'success' : 'error'}
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={0} sx={{ 
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
            height: '100%',
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  mr: 1.5,
                }}>
                  <Analytics sx={{ fontSize: '1rem' }} />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Investido
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {showValues ? formatCurrency(safeData.total_invested) : '••••••'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Capital aplicado
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={0} sx={{ 
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
            height: '100%',
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha(isPositiveReturn ? theme.palette.success.main : theme.palette.error.main, 0.1),
                  color: isPositiveReturn ? theme.palette.success.main : theme.palette.error.main,
                  mr: 1.5,
                }}>
                  {isPositiveReturn ? <TrendingUp sx={{ fontSize: '1rem' }} /> : <TrendingDown sx={{ fontSize: '1rem' }} />}
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Retorno
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                color: isPositiveReturn ? theme.palette.success.main : theme.palette.error.main
              }}>
                {showValues ? formatCurrency(safeData.total_return) : '••••••'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isPositiveReturn ? 'Lucro' : 'Prejuízo'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={0} sx={{ 
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
            height: '100%',
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: theme.palette.warning.main,
                  mr: 1.5,
                }}>
                  <Speed sx={{ fontSize: '1rem' }} />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Portfólios
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {safeData.portfolios.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ativos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos Principais - Layout Compacto */}
      <Grid container spacing={2}>
        {/* Evolução do Patrimônio */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{
            p: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{
                  width: 32,
                  height: 32,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}>
                  <Timeline sx={{ fontSize: '1rem' }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    Evolução do Patrimônio
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Últimos {selectedPeriod === '1d' ? '1 dia' : selectedPeriod === '7d' ? '7 dias' : selectedPeriod === '1m' ? '30 dias' : selectedPeriod === '3m' ? '3 meses' : '1 ano'}
                  </Typography>
                </Box>
              </Box>

              <ButtonGroup variant="outlined" size="small">
                {(['1d', '7d', '1m', '3m', '1y'] as const).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'contained' : 'outlined'}
                    onClick={() => setSelectedPeriod(period)}
                    sx={{ minWidth: 36, fontSize: '0.75rem' }}
                  >
                    {period}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>

            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={evolutionData?.data || []}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  axisLine={{ stroke: alpha(theme.palette.divider, 0.5) }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  axisLine={{ stroke: alpha(theme.palette.divider, 0.5) }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: alpha(theme.palette.background.paper, 0.95),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    borderRadius: 8,
                    fontSize: '0.875rem',
                  }}
                  formatter={(value: any) => [formatCurrency(value), 'Valor']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Alocação de Ativos */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{
            p: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar sx={{
                width: 32,
                height: 32,
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                color: theme.palette.secondary.main,
              }}>
                <PieChartIcon sx={{ fontSize: '1rem' }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  Alocação de Ativos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Distribuição por categoria
                </Typography>
              </Box>
            </Box>

            {safeData.asset_allocation.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={safeData.asset_allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="percentage"
                    >
                      {safeData.asset_allocation.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: alpha(theme.palette.background.paper, 0.95),
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        borderRadius: 8,
                        fontSize: '0.875rem',
                      }}
                      formatter={(value: any, _name: string, props: any) => [
                        `${value.toFixed(1)}%`,
                        props.payload.asset_type
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <Box sx={{ mt: 1 }}>
                  {safeData.asset_allocation.map((item, index) => (
                    <Box key={item.asset_type} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: COLORS[index % COLORS.length]
                        }} />
                        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                          {item.asset_type}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {item.percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: 200,
                color: 'text.secondary'
              }}>
                <PieChartIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center' }}>
                  Sem dados de alocação
                </Typography>
                <Typography variant="caption" sx={{ textAlign: 'center' }}>
                  Adicione ativos aos portfólios
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}