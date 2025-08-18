import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Dialog,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Grid,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Stack,
  Avatar,
  ButtonGroup,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  FilterList,
  Download,
  Refresh,
  MonetizationOn,
  AttachMoney,
  AccountBalance,
  Receipt,
  Close as CloseIcon,
  Calculate as CalculateIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Types
interface Dividend {
  id: number;
  portfolio_id: number;
  asset_id: number;
  position_id: number;
  dividend_type: 'DIVIDEND' | 'JCP' | 'COUPON' | 'RENT' | 'BONUS' | 'OTHER' | 'dividend' | 'jcp' | 'coupon' | 'rent' | 'bonus' | 'other';
  amount_per_share: number;
  shares_quantity: number;
  total_amount: number;
  payment_date: string;
  ex_dividend_date?: string;
  record_date?: string;
  gross_amount?: number;
  tax_amount: number;
  net_amount?: number;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'EVENTUAL' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'eventual';
  is_recurring: boolean;
  currency: string;
  notes?: string;
  created_at: string;
  asset?: Asset;
  portfolio?: Portfolio;
}

interface Portfolio {
  id: number;
  name: string;
}

interface Asset {
  id: number;
  symbol: string;
  name: string;
}

interface Position {
  id: number;
  portfolio_id: number;
  asset_id: number;
  quantity: number;
  asset: Asset;
}

interface DividendForm {
  portfolio_id: number;
  asset_id: number;
  position_id: number;
  dividend_type: string;
  amount_per_share: number;
  shares_quantity: number;
  payment_date: string;
  ex_dividend_date: string;
  record_date: string;
  gross_amount: number;
  tax_amount: number;
  frequency: string;
  is_recurring: boolean;
  notes: string;
}

const DIVIDEND_TYPES = [
  { value: 'dividend', label: 'Dividendo' },
  { value: 'jcp', label: 'Juros sobre Capital Próprio (JCP)' },
  { value: 'coupon', label: 'Cupom' },
  { value: 'rent', label: 'Aluguel de Ação' },
  { value: 'bonus', label: 'Bonificação' },
  { value: 'other', label: 'Outro' },
];

const FREQUENCIES = [
  { value: 'eventual', label: 'Eventual' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];



const Dividends: React.FC = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const [formData, setFormData] = useState<DividendForm>({
    portfolio_id: 0,
    asset_id: 0,
    position_id: 0,
    dividend_type: 'dividend',
    amount_per_share: 0,
    shares_quantity: 0,
    payment_date: new Date().toISOString().split('T')[0],
    ex_dividend_date: '',
    record_date: '',
    gross_amount: 0,
    tax_amount: 0,
    frequency: 'eventual',
    is_recurring: false,
    notes: '',
  });

  const queryClient = useQueryClient();

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: () => api.get('/api/portfolios/').then(res => res.data),
  });

  // Auto-select first portfolio when portfolios load
  useEffect(() => {
    console.log('📊 Portfólios carregados:', {
      portfoliosLength: portfolios.length,
      selectedPortfolio,
      portfolios: portfolios.map(p => ({ id: p.id, name: p.name }))
    });
    
    if (portfolios.length > 0 && selectedPortfolio === 0) {
      console.log('🎯 Selecionando primeiro portfólio automaticamente:', portfolios[0]);
      setSelectedPortfolio(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolio]);

  // Fetch positions for selected portfolio
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['positions', selectedPortfolio],
    queryFn: () => 
      selectedPortfolio > 0 
        ? api.get(`/api/portfolios/${selectedPortfolio}/positions`).then(res => res.data)
        : Promise.resolve([]),
    enabled: selectedPortfolio > 0,
  });

  // Fetch assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => api.get('/api/assets/').then(res => res.data),
  });

  // Fetch dividends
  const { data: dividends = [] } = useQuery<Dividend[]>({
    queryKey: ['dividends', selectedPortfolio],
    queryFn: async () => {
      const params = selectedPortfolio > 0 ? `?portfolio_id=${selectedPortfolio}` : '';
      console.log('🔍 Buscando dividendos:', {
        selectedPortfolio,
        params,
        url: `/api/dividends/${params}`
      });
      
      try {
        const response = await api.get(`/api/dividends/${params}`);
        // Enrich dividends with asset info
        const enrichedDividends = response.data.map((dividend: any) => ({
          ...dividend,
          asset: assets.find(asset => asset.id === dividend.asset_id),
          portfolio: portfolios.find(portfolio => portfolio.id === dividend.portfolio_id)
        }));
        
        console.log('✅ Dividendos encontrados:', {
          quantidade: enrichedDividends.length,
          dados: enrichedDividends,
          primeiroItem: enrichedDividends[0]
        });
        return enrichedDividends;
      } catch (error: any) {
        console.error('❌ Erro ao buscar dividendos:', error);
        console.error('❌ Response:', error?.response?.data);
        throw error;
      }
    },
    enabled: assets.length > 0 && portfolios.length > 0,
  });

  // Create dividend mutation
  const createDividendMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('📤 Criando dividendo:', data);
      return api.post('/api/dividends/', data);
    },
    onSuccess: (response) => {
      console.log('✅ Dividendo criado com sucesso:', response.data);
      queryClient.invalidateQueries({ queryKey: ['dividends'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('❌ Erro ao criar dividendo:', error);
      console.error('❌ Response:', error?.response?.data);
      alert(`Erro ao criar dividendo: ${error?.response?.data?.detail || error.message}`);
    },
  });

  // Update dividend mutation
  const updateDividendMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      console.log('📤 Atualizando dividendo:', { id, data });
      return api.put(`/api/dividends/${id}`, data);
    },
    onSuccess: (response) => {
      console.log('✅ Dividendo atualizado com sucesso:', response.data);
      queryClient.invalidateQueries({ queryKey: ['dividends'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('❌ Erro ao atualizar dividendo:', error);
      console.error('❌ Response:', error?.response?.data);
      alert(`Erro ao atualizar dividendo: ${error?.response?.data?.detail || error.message}`);
    },
  });

  // Delete dividend mutation
  const deleteDividendMutation = useMutation({
    mutationFn: (id: number) => {
      console.log('🗑️ Deletando dividendo:', id);
      return api.delete(`/api/dividends/${id}`);
    },
    onSuccess: () => {
      console.log('✅ Dividendo deletado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['dividends'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao deletar dividendo:', error);
      console.error('❌ Response:', error?.response?.data);
      alert(`Erro ao deletar dividendo: ${error?.response?.data?.detail || error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      portfolio_id: selectedPortfolio || 0,
      asset_id: 0,
      position_id: 0,
      dividend_type: 'dividend',
      amount_per_share: 0,
      shares_quantity: 0,
      payment_date: new Date().toISOString().split('T')[0],
      ex_dividend_date: '',
      record_date: '',
      gross_amount: 0,
      tax_amount: 0,
      frequency: 'eventual',
      is_recurring: false,
      notes: '',
    });
    setEditingDividend(null);
  };

  const handleSubmit = () => {
    // Transform data to match backend schema
    const submitData = {
      ...formData,
      // dividend_type: backend expects UPPERCASE
      dividend_type: formData.dividend_type.toUpperCase(),
      // frequency: backend expects lowercase
      frequency: formData.frequency.toLowerCase(),
      // Convert empty strings to null for optional fields
      ex_dividend_date: formData.ex_dividend_date || null,
      record_date: formData.record_date || null,
      notes: formData.notes || null,
      // Ensure gross_amount is calculated if not provided
      gross_amount: formData.gross_amount || (formData.amount_per_share * formData.shares_quantity),
    };

    console.log('🚀 Enviando dados para API:', submitData);

    if (editingDividend) {
      updateDividendMutation.mutate({
        id: editingDividend.id,
        data: submitData,
      });
    } else {
      createDividendMutation.mutate(submitData);
    }
  };

  const handleEdit = (dividend: Dividend) => {
    console.log('✏️ Editando dividendo:', dividend);
    setEditingDividend(dividend);
    setFormData({
      portfolio_id: dividend.portfolio_id,
      asset_id: dividend.asset_id,
      position_id: dividend.position_id,
      // Convert API data (UPPERCASE/lowercase) to form format (lowercase)
      dividend_type: dividend.dividend_type.toLowerCase(),
      amount_per_share: dividend.amount_per_share,
      shares_quantity: dividend.shares_quantity,
      payment_date: dividend.payment_date,
      ex_dividend_date: dividend.ex_dividend_date || '',
      record_date: dividend.record_date || '',
      gross_amount: dividend.gross_amount || (dividend.amount_per_share * dividend.shares_quantity),
      tax_amount: dividend.tax_amount || 0,
      // API returns frequency in lowercase, keep as is
      frequency: dividend.frequency,
      is_recurring: dividend.is_recurring,
      notes: dividend.notes || '',
    });
    setOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dividends'] });
    queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    queryClient.invalidateQueries({ queryKey: ['positions'] });
  };

  const handleExport = () => {
    // Prepare data for export
    const exportData = filteredDividends.map(dividend => ({
      'Data Pagamento': new Date(dividend.payment_date).toLocaleDateString('pt-BR'),
      'Tipo': getDividendTypeLabel(dividend.dividend_type),
      'Ativo': dividend.asset?.symbol || `Asset ${dividend.asset_id}`,
      'Portfólio': dividend.portfolio?.name || `Portfolio ${dividend.portfolio_id}`,
      'Valor por Ação': dividend.amount_per_share.toFixed(2),
      'Quantidade': dividend.shares_quantity,
      'Valor Total': (dividend.total_amount || 0).toFixed(2),
      'Valor Líquido': (dividend.net_amount || dividend.total_amount || 0).toFixed(2),
      'Imposto': dividend.tax_amount.toFixed(2),
      'Frequência': getFrequencyLabel(dividend.frequency),
      'Observações': dividend.notes || ''
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${(row as any)[header]}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dividendos_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este dividendo?')) {
      deleteDividendMutation.mutate(id);
    }
  };

  const getDividendTypeLabel = (type: string) => {
    // Normalize to lowercase for comparison
    const normalizedType = type.toLowerCase();
    return DIVIDEND_TYPES.find(t => t.value === normalizedType)?.label || type;
  };

  const getFrequencyLabel = (frequency: string) => {
    // Normalize to lowercase for comparison
    const normalizedFrequency = frequency.toLowerCase();
    return FREQUENCIES.find(f => f.value === normalizedFrequency)?.label || frequency;
  };

  // Calculate real stats from dividends data
  const filteredDividends = dividends.filter(d => {
    if (selectedPeriod === '3M') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return new Date(d.payment_date) >= threeMonthsAgo;
    } else if (selectedPeriod === '6M') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return new Date(d.payment_date) >= sixMonthsAgo;
    } else if (selectedPeriod === '1A') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return new Date(d.payment_date) >= oneYearAgo;
    } else if (selectedPeriod === '2A') {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return new Date(d.payment_date) >= twoYearsAgo;
    } else if (selectedPeriod === '5A') {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      return new Date(d.payment_date) >= fiveYearsAgo;
    }
    return true;
  });

  const totalDividends = filteredDividends.reduce((sum, d) => sum + (d.net_amount || d.total_amount || 0), 0);
  
  // Debug logs
  console.log('📊 Cálculo de dividendos:', {
    totalDividendos: dividends.length,
    filtradosNoPeriodo: filteredDividends.length,
    periodoSelecionado: selectedPeriod,
    totalCalculado: totalDividends,
    primeirosFiltrados: filteredDividends.slice(0, 3)
  });
  
  // Calculate monthly average based on period
  const monthsInPeriod: { [key: string]: number } = {
    '3M': 3,
    '6M': 6, 
    '1A': 12,
    '2A': 24,
    '5A': 60
  };
  const monthlyAverage = totalDividends / (monthsInPeriod[selectedPeriod] || 12);

  // Calculate growth
  const calculateGrowth = () => {
    if (filteredDividends.length < 2) return 0;
    
    const sortedDividends = [...filteredDividends].sort((a, b) => 
      new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );
    
    const firstHalf = sortedDividends.slice(0, Math.floor(sortedDividends.length / 2));
    const secondHalf = sortedDividends.slice(Math.floor(sortedDividends.length / 2));
    
    const firstHalfTotal = firstHalf.reduce((sum, d) => sum + (d.net_amount || d.total_amount || 0), 0);
    const secondHalfTotal = secondHalf.reduce((sum, d) => sum + (d.net_amount || d.total_amount || 0), 0);
    
    if (firstHalfTotal === 0) return 0;
    return ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
  };

  const dividendGrowth = calculateGrowth();

  // Calculate stats by portfolio when showing all portfolios
  const portfolioStats = selectedPortfolio === 0 ? (() => {
    const portfolioTotals: { [key: string]: { total: number; count: number; name: string } } = {};
    
    filteredDividends.forEach(dividend => {
      const portfolioKey = dividend.portfolio_id.toString();
      const amount = dividend.net_amount || dividend.total_amount || 0;
      const portfolioName = dividend.portfolio?.name || `Portfolio ${dividend.portfolio_id}`;
      
      if (!portfolioTotals[portfolioKey]) {
        portfolioTotals[portfolioKey] = { total: 0, count: 0, name: portfolioName };
      }
      
      portfolioTotals[portfolioKey].total += amount;
      portfolioTotals[portfolioKey].count += 1;
    });
    
    return Object.entries(portfolioTotals)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort((a, b) => b.total - a.total);
  })() : [];

  // Generate real data for charts based on actual dividends
  const generateMonthlyEvolution = () => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData: { [key: string]: { dividends: number; jcp: number; total: number } } = {};
    
    // Initialize all months
    monthNames.forEach(month => {
      monthlyData[month] = { dividends: 0, jcp: 0, total: 0 };
    });
    
    // Group dividends by month
    filteredDividends.forEach(dividend => {
      const date = new Date(dividend.payment_date);
      const monthName = monthNames[date.getMonth()];
      const amount = dividend.net_amount || dividend.total_amount || 0;
      
      if (dividend.dividend_type === 'jcp') {
        monthlyData[monthName].jcp += amount;
      } else {
        monthlyData[monthName].dividends += amount;
      }
      monthlyData[monthName].total += amount;
    });
    
    return monthNames.map(month => ({
      month,
      ...monthlyData[month]
    }));
  };

  const generateAssetDistribution = () => {
    const assetTotals: { [key: string]: number } = {};
    
    // Group dividends by asset
    filteredDividends.forEach(dividend => {
      const assetKey = dividend.asset?.symbol || `Asset ${dividend.asset_id}`;
      const amount = dividend.net_amount || dividend.total_amount || 0;
      assetTotals[assetKey] = (assetTotals[assetKey] || 0) + amount;
    });
    
    // Convert to chart format
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#7c3aed', '#ef4444', '#8b5cf6'];
    return Object.entries(assetTotals)
      .sort(([,a], [,b]) => b - a)
      .map(([name, value], index) => ({
        name,
        value: Math.round(value),
        color: colors[index % colors.length]
      }));
  };

  const monthlyEvolution = generateMonthlyEvolution();
  const assetDistribution = generateAssetDistribution();

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
              Gestão de Dividendos
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Acompanhe seus rendimentos, análise de performance e projeções de renda passiva
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            disabled={selectedPortfolio === 0}
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
            Novo Dividendo
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
                    Total Recebido
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                    R$ {totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
              
              <Divider orientation="vertical" flexItem />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Média Mensal
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                    R$ {monthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ color: theme.palette.warning.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pagamentos
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {filteredDividends.length}
                  </Typography>
                </Box>
              </Box>

              {dividendGrowth !== 0 && (
                <>
                  <Divider orientation="vertical" flexItem />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ 
                      color: dividendGrowth >= 0 ? theme.palette.success.main : theme.palette.error.main 
                    }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Crescimento
                      </Typography>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600,
                        color: dividendGrowth >= 0 ? theme.palette.success.main : theme.palette.error.main
                      }}>
                        {dividendGrowth >= 0 ? '+' : ''}{dividendGrowth.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}

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
                {['3M', '6M', '1A', '2A', '5A'].map((period) => (
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
                  disabled={filteredDividends.length === 0}
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
        </Paper>
      </Box>



      {/* Gráficos Premium */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Evolução Mensal */}
        <Grid item xs={12} lg={8}>
          <Fade in timeout={1100}>
            <Paper
              elevation={0}
              sx={{
                background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderRadius: 3,
                p: 4,
                height: 400,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Evolução de Dividendos
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip 
                    label="Dividendos" 
                    size="small" 
                    sx={{ 
                      background: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main 
                    }} 
                  />
                  <Chip 
                    label="JCP" 
                    size="small" 
                    sx={{ 
                      background: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main 
                    }} 
                  />
                  <Chip 
                    label="Total" 
                    size="small" 
                    sx={{ 
                      background: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main 
                    }} 
                  />
                </Stack>
              </Box>

              <Box sx={{ height: 300, width: '100%' }}>
                <ResponsiveContainer>
                  <AreaChart data={monthlyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                    <YAxis stroke={theme.palette.text.secondary} />
                    <RechartsTooltip 
                      contentStyle={{
                        background: alpha(theme.palette.background.paper, 0.9),
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        borderRadius: 8,
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke={theme.palette.success.main}
                      fill={alpha(theme.palette.success.main, 0.3)}
                      strokeWidth={3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="dividends" 
                      stroke={theme.palette.primary.main}
                      fill={alpha(theme.palette.primary.main, 0.2)}
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="jcp" 
                      stroke={theme.palette.secondary.main}
                      fill={alpha(theme.palette.secondary.main, 0.2)}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Fade>
        </Grid>

        {/* Distribuição por Ativo */}
        <Grid item xs={12} lg={4}>
          <Fade in timeout={1300}>
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
                Distribuição por Ativo
              </Typography>

              <Box sx={{ height: 200, width: '100%', mb: 2 }}>
                <ResponsiveContainer>
                  <RechartsPieChart>
                    <RechartsPieChart data={assetDistribution}>
                      {assetDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsPieChart>
                    <RechartsTooltip 
                      contentStyle={{
                        background: alpha(theme.palette.background.paper, 0.9),
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        borderRadius: 8,
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Box>

              <Stack spacing={1}>
                {assetDistribution.map((asset, index) => (
                  <Stack key={index} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          background: asset.color 
                        }} 
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {asset.name}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {asset.value}%
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Fade>
        </Grid>
      </Grid>

      {/* Estatísticas por Portfólio - Apenas quando mostrando todos */}
      {selectedPortfolio === 0 && portfolioStats.length > 0 && (
        <Fade in timeout={1400}>
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              p: 3,
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              Dividendos por Portfólio
            </Typography>
            
            <Grid container spacing={2}>
              {portfolioStats.slice(0, 4).map((portfolio) => (
                <Grid item xs={12} sm={6} md={3} key={portfolio.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      background: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      {portfolio.name}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 0.5 }}>
                      R$ {portfolio.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {portfolio.count} dividendo{portfolio.count !== 1 ? 's' : ''}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Fade>
      )}

      {/* Lista de Dividendos Premium */}
      <Fade in timeout={1500}>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Histórico de Dividendos
            </Typography>
            <Stack direction="row" spacing={1}>
                                      <Chip 
                          label={`${filteredDividends.length} pagamentos (${selectedPeriod})`}
                          size="small" 
                          sx={{ 
                            background: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main 
                          }} 
                        />
            </Stack>
          </Box>

                {filteredDividends.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                background: `linear-gradient(145deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                borderRadius: 2,
                p: 6,
                textAlign: 'center',
              }}
            >
              <Avatar
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.main, 0.7)})`,
                  width: 80,
                  height: 80,
                  margin: '0 auto 16px',
                }}
              >
                <MonetizationOn sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {selectedPortfolio === 0 
                  ? "Selecione um portfólio" 
                          : (dividends.length === 0 ? "Nenhum dividendo registrado" : "Nenhum dividendo no período selecionado")}
                      </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedPortfolio === 0 
                  ? "Escolha um portfólio para visualizar os dividendos recebidos"
                  : "Comece adicionando seus primeiros dividendos para acompanhar sua renda passiva"}
              </Typography>
              {selectedPortfolio > 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetForm();
                    setOpen(true);
                  }}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                >
                  Adicionar Primeiro Dividendo
                </Button>
              )}
            </Paper>
                              ) : (
                      <Stack spacing={2}>
                        {filteredDividends.map((dividend, index) => (
                <Zoom key={dividend.id} in timeout={300 + index * 100}>
                  <Paper
                    elevation={0}
                    sx={{
                      background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.6)} 0%, ${alpha(theme.palette.background.paper, 0.3)} 100%)`,
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      borderRadius: 2,
                      p: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      },
                    }}
                  >
                    <Grid container spacing={3} alignItems="center">
                      <Grid item xs={12} sm={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.7)})`,
                              width: 48,
                              height: 48,
                              fontWeight: 700,
                            }}
                          >
                                        {dividend.dividend_type === 'dividend' ? 'D' : 
             dividend.dividend_type === 'jcp' ? 'J' : 
             dividend.dividend_type === 'coupon' ? 'C' : 'O'}
                          </Avatar>
                          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {dividend.asset?.symbol || `Asset #${dividend.asset_id}`}
                        </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {dividend.portfolio?.name || `Portfolio ${dividend.portfolio_id}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(dividend.payment_date).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} sm={2} sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {dividend.asset?.symbol || `Asset #${dividend.asset_id}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                          {dividend.portfolio?.name || `Portfolio ${dividend.portfolio_id}`}
                        </Typography>
                        <Chip
                          label={getDividendTypeLabel(dividend.dividend_type)}
                          size="small"
                          sx={{
                            background: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontSize: '0.75rem',
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={2} sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <Typography variant="body2" color="text.secondary">
                          Data Pagamento
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {new Date(dividend.payment_date).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sm={2}>
                        <Typography variant="body2" color="text.secondary">
                          Valor/Ação
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        R$ {dividend.amount_per_share.toFixed(4)}
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sm={2}>
                        <Typography variant="body2" color="text.secondary">
                          Quantidade
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {dividend.shares_quantity.toLocaleString()}
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sm={1}>
                        <Typography variant="body2" color="text.secondary">
                          Total Líquido
                        </Typography>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700,
                          color: theme.palette.success.main 
                        }}>
                          R$ {(dividend.net_amount || dividend.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sm={1}>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(dividend)}
                              sx={{
                                background: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': { background: alpha(theme.palette.primary.main, 0.2) }
                              }}
                        >
                              <EditIcon fontSize="small" />
                        </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(dividend.id)}
                              sx={{
                                background: alpha(theme.palette.error.main, 0.1),
                                '&:hover': { background: alpha(theme.palette.error.main, 0.2) }
                              }}
                        >
                              <DeleteIcon fontSize="small" />
                        </IconButton>
                          </Tooltip>
                        </Stack>
                      </Grid>
                    </Grid>

                    {/* Tags de Frequência */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={getFrequencyLabel(dividend.frequency)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: dividend.is_recurring ? theme.palette.success.main : theme.palette.grey[400],
                          color: dividend.is_recurring ? theme.palette.success.main : theme.palette.text.secondary,
                        }}
                      />
                      {dividend.is_recurring && (
                        <Chip
                          label="Recorrente"
                          size="small"
                          sx={{
                            background: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main,
                            fontSize: '0.7rem',
                          }}
                        />
                      )}
                      {dividend.tax_amount > 0 && (
                        <Chip
                          label={`IR: R$ ${dividend.tax_amount.toFixed(2)}`}
                          size="small"
                          sx={{
                            background: alpha(theme.palette.warning.main, 0.1),
                            color: theme.palette.warning.main,
                            fontSize: '0.7rem',
                          }}
                        />
                      )}
                    </Box>
        </Paper>
                </Zoom>
              ))}
            </Stack>
          )}
        </Paper>
      </Fade>

        {/* Add/Edit Dividend Dialog - Modern UI */}
        <Dialog 
          open={open} 
          onClose={() => setOpen(false)} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              overflow: 'hidden',
              maxHeight: '90vh',
              '@keyframes shake': {
                '0%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-5px)' },
                '50%': { transform: 'translateX(5px)' },
                '75%': { transform: 'translateX(-5px)' },
                '100%': { transform: 'translateX(0)' }
              }
            }
          }}
        >
          {/* Modern Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              p: 3,
              position: 'relative'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  width: 48,
                  height: 48
                }}
              >
                {editingDividend ? <EditIcon /> : <AddIcon />}
              </Avatar>
              <Box flex={1}>
                <Typography variant="h5" fontWeight="600">
                  {editingDividend ? 'Editar Dividendo' : 'Novo Dividendo'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {editingDividend ? 'Atualize as informações do dividendo' : 'Registre um novo dividendo recebido'}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setOpen(false)}
                sx={{ 
                  color: 'white',
                  '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.1) }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Box>

          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 3 }}>
              {/* Step Indicator */}
              <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    icon={<AccountBalance />}
                    label="Seleção"
                    variant={formData.portfolio_id ? "filled" : "outlined"}
                    color={formData.portfolio_id ? "primary" : "default"}
                    size="small"
                  />
                  <Chip
                    icon={<AttachMoney />}
                    label="Valores"
                    variant={formData.amount_per_share > 0 ? "filled" : "outlined"}
                    color={formData.amount_per_share > 0 ? "primary" : "default"}
                    size="small"
                  />
                  <Chip
                    icon={<ScheduleIcon />}
                    label="Datas"
                    variant={formData.payment_date ? "filled" : "outlined"}
                    color={formData.payment_date ? "primary" : "default"}
                    size="small"
                  />
                </Stack>
              </Box>

              <Grid container spacing={3}>
                {/* Section 1: Portfolio & Asset Selection */}
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderRadius: '12px'
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}>
                        <AccountBalance sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="h6" fontWeight="600">
                        Seleção do Ativo
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel>Portfólio *</InputLabel>
                          <Select
                            value={formData.portfolio_id}
                            onChange={(e) => {
                              const portfolioId = Number(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                portfolio_id: portfolioId,
                                asset_id: 0,
                                position_id: 0,
                              }));
                              setSelectedPortfolio(portfolioId);
                            }}
                            label="Portfólio *"
                            sx={{ borderRadius: '8px' }}
                          >
                            {portfolios.map((portfolio) => (
                              <MenuItem key={portfolio.id} value={portfolio.id}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <AccountBalance sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                                  <Typography>{portfolio.name}</Typography>
                                </Stack>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel>Posição *</InputLabel>
                          <Select
                            value={formData.position_id}
                            onChange={(e) => {
                              const position = positions.find(p => p.id === Number(e.target.value));
                              setFormData(prev => ({
                                ...prev,
                                position_id: Number(e.target.value),
                                asset_id: position?.asset_id || 0,
                                shares_quantity: position?.quantity || 0,
                              }));
                            }}
                            label="Posição *"
                            disabled={!formData.portfolio_id}
                            sx={{ borderRadius: '8px' }}
                          >
                            {positions.map((position) => (
                              <MenuItem key={position.id} value={position.id}>
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" width="100%">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: theme.palette.secondary.main }}>
                                      {position.asset?.symbol?.substring(0, 2)}
                                    </Avatar>
                                    <Typography fontWeight="500">{position.asset?.symbol}</Typography>
                                  </Stack>
                                  <Chip
                                    label={`${position.quantity} ações`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                </Stack>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Section 2: Dividend Details */}
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.success.main, 0.03),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                      borderRadius: '12px'
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <Avatar sx={{ bgcolor: theme.palette.success.main, width: 32, height: 32 }}>
                        <AttachMoney sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="h6" fontWeight="600">
                        Detalhes do Dividendo
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel>Tipo de Rendimento *</InputLabel>
                          <Select
                            value={formData.dividend_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, dividend_type: e.target.value }))}
                            label="Tipo de Rendimento *"
                            sx={{ borderRadius: '8px' }}
                          >
                            {DIVIDEND_TYPES.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Receipt sx={{ fontSize: 16, color: theme.palette.success.main }} />
                                  <Typography>{type.label}</Typography>
                                </Stack>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Valor por Ação *"
                          type="number"
                          value={formData.amount_per_share}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount_per_share: Number(e.target.value) }))}
                          inputProps={{ step: "0.0001", min: "0" }}
                          error={formData.amount_per_share < 0}
                          helperText={formData.amount_per_share < 0 ? "Valor deve ser positivo" : "Valor pago por cada ação"}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: '8px',
                              '&.Mui-error': {
                                animation: 'shake 0.5s ease-in-out'
                              }
                            }
                          }}
                          InputProps={{
                            startAdornment: (
                              <Typography sx={{ mr: 1, color: theme.palette.text.secondary }}>
                                R$
                              </Typography>
                            )
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Quantidade de Ações *"
                          type="number"
                          value={formData.shares_quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, shares_quantity: Number(e.target.value) }))}
                          inputProps={{ step: "1", min: "0" }}
                          error={formData.shares_quantity <= 0}
                          helperText={formData.shares_quantity <= 0 ? "Quantidade deve ser maior que zero" : "Número de ações elegíveis"}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: '8px',
                              '&.Mui-error': {
                                animation: 'shake 0.5s ease-in-out'
                              }
                            }
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Section 3: Dates */}
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.info.main, 0.03),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                      borderRadius: '12px'
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <Avatar sx={{ bgcolor: theme.palette.info.main, width: 32, height: 32 }}>
                        <CalendarIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="h6" fontWeight="600">
                        Datas Importantes
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Tooltip title="Data em que o dividendo foi ou será creditado" arrow>
                          <TextField
                            fullWidth
                            label="Data de Pagamento *"
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            error={!formData.payment_date}
                            helperText={!formData.payment_date ? "Data de pagamento é obrigatória" : "Data do crédito do dividendo"}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { 
                                borderRadius: '8px',
                                '&.Mui-error': {
                                  animation: 'shake 0.5s ease-in-out'
                                }
                              }
                            }}
                          />
                        </Tooltip>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Tooltip title="Data a partir da qual as ações negociadas não têm direito ao dividendo" arrow>
                          <TextField
                            fullWidth
                            label="Data Ex-Dividendo"
                            type="date"
                            value={formData.ex_dividend_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, ex_dividend_date: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            helperText="Data ex-dividendo (opcional)"
                            sx={{ 
                              '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                            }}
                          />
                        </Tooltip>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Tooltip title="Data de registro dos acionistas elegíveis" arrow>
                          <TextField
                            fullWidth
                            label="Data de Registro"
                            type="date"
                            value={formData.record_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, record_date: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            helperText="Data de registro (opcional)"
                            sx={{ 
                              '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                            }}
                          />
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Section 4: Additional Settings */}
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.secondary.main, 0.03),
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                      borderRadius: '12px'
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 32, height: 32 }}>
                        <ScheduleIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="h6" fontWeight="600">
                        Configurações Adicionais
                      </Typography>
                    </Stack>

                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Imposto Retido"
                          type="number"
                          value={formData.tax_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: Number(e.target.value) }))}
                          inputProps={{ step: "0.01", min: "0" }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                          }}
                          InputProps={{
                            startAdornment: (
                              <Typography sx={{ mr: 1, color: theme.palette.text.secondary }}>
                                R$
                              </Typography>
                            )
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel>Frequência</InputLabel>
                          <Select
                            value={formData.frequency}
                            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                            label="Frequência"
                            sx={{ borderRadius: '8px' }}
                          >
                            {FREQUENCIES.map((freq) => (
                              <MenuItem key={freq.value} value={freq.value}>
                                <Typography>{freq.label}</Typography>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.is_recurring}
                              onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                              color="primary"
                            />
                          }
                          label="Pagamento Recorrente"
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Observações"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                          }}
                          placeholder="Observações opcionais"
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Calculation Preview */}
                {formData.amount_per_share > 0 && formData.shares_quantity > 0 && (
                  <Grid item xs={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                        borderRadius: '12px'
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: theme.palette.warning.main, width: 32, height: 32 }}>
                          <CalculateIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Typography variant="h6" fontWeight="600">
                          Resumo do Cálculo
                        </Typography>
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary">
                              Valor por Ação
                            </Typography>
                            <Typography variant="h6" fontWeight="600" color="primary.main">
                              R$ {formData.amount_per_share.toFixed(4)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary">
                              Quantidade
                            </Typography>
                            <Typography variant="h6" fontWeight="600" color="info.main">
                              {formData.shares_quantity} ações
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary">
                              Total Bruto
                            </Typography>
                            <Typography variant="h6" fontWeight="600" color="success.main">
                              R$ {(formData.amount_per_share * formData.shares_quantity).toFixed(2)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary">
                              Total Líquido
                            </Typography>
                            <Typography variant="h6" fontWeight="600" color="success.dark">
                              R$ {(formData.amount_per_share * formData.shares_quantity - formData.tax_amount).toFixed(2)}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          </DialogContent>

          {/* Modern Footer */}
          <Box
            sx={{
              p: 3,
              bgcolor: alpha(theme.palette.grey[100], 0.5),
              borderTop: `1px solid ${theme.palette.divider}`
            }}
          >
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => setOpen(false)}
                sx={{
                  borderRadius: '8px',
                  px: 3
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.portfolio_id || !formData.position_id || formData.amount_per_share <= 0 || !formData.payment_date}
                sx={{
                  borderRadius: '8px',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  background: !formData.portfolio_id || !formData.position_id || formData.amount_per_share <= 0 || !formData.payment_date
                    ? theme.palette.grey[300]
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  '&:hover': {
                    background: !formData.portfolio_id || !formData.position_id || formData.amount_per_share <= 0 || !formData.payment_date
                      ? theme.palette.grey[300]
                      : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[4]
                  },
                  '&:disabled': {
                    color: theme.palette.text.disabled
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                startIcon={editingDividend ? <EditIcon /> : <AddIcon />}
              >
                {editingDividend ? 'Atualizar Dividendo' : 'Adicionar Dividendo'}
              </Button>
            </Stack>
          </Box>
        </Dialog>
    </Container>
  );
};

export default Dividends;
