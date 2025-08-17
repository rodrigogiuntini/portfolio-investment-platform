import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  LinearProgress,
  Tooltip,
  Fade,
  Avatar,
  Divider,
  Container,
  useTheme,
  alpha,
  Stack,
  Paper,
  Zoom,
  Slide,
  Menu,
  MenuItem as MenuItemMUI,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  TrendingUp,
  TrendingDown,
  Refresh,
  AccessTime,
  AccountBalanceWallet,
  ShowChart,
  TrendingFlat,
  Launch,
  Analytics,
  Star,
  StarBorder,
  MoreVert,
  FilterList,
  GridView,
  ViewList,
  Visibility,
  FileCopy,
  GetApp,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Portfolio {
  id: number;
  name: string;
  description?: string;
  currency: string;
  benchmark: string;
  created_at: string;
  total_value?: number;
  total_invested?: number;
  total_return?: number;
  total_return_percentage?: number;
}

interface PortfolioForm {
  name: string;
  description: string;
  currency: string;
  benchmark: string;
}

const currencies = [
  { value: 'BRL', label: 'Real (BRL)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

const benchmarks = [
  { value: 'CDI', label: 'CDI' },
  { value: 'IBOV', label: 'Ibovespa' },
  { value: 'SP500', label: 'S&P 500' },
  { value: 'NASDAQ', label: 'NASDAQ' },
];

function formatCurrency(value: number, currency: string): string {
  const currencyMap: { [key: string]: string } = {
    BRL: 'pt-BR',
    USD: 'en-US',
    EUR: 'de-DE',
  };

  return new Intl.NumberFormat(currencyMap[currency] || 'pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

export default function Portfolios() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favoritePortfolios, setFavoritePortfolios] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'return' | 'date'>('date');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [openFiltersModal, setOpenFiltersModal] = useState(false);
  const [openSortModal, setOpenSortModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();

  // Adicionar CSS para animação
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spin-animation {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const { control, handleSubmit, reset, setValue } = useForm<PortfolioForm>({
    defaultValues: {
      name: '',
      description: '',
      currency: 'BRL',
      benchmark: 'CDI',
    },
  });

  // Query com polling automático para dados em tempo real
  const { data: portfolios, isLoading, isFetching } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await api.get('/api/portfolios/');
      return response.data;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    refetchIntervalInBackground: true, // Continua atualizando mesmo em background
    staleTime: 25000, // Considera dados obsoletos após 25 segundos
  });

  const createMutation = useMutation({
    mutationFn: async (data: PortfolioForm) => {
      return api.post('/api/portfolios/', data);
    },
    // Optimistic Update - mostra o portfólio imediatamente
    onMutate: async (newPortfolio) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: ['portfolios'] });
      
      // Salva snapshot anterior
      const previousPortfolios = queryClient.getQueryData(['portfolios']);
      
      // Atualização otimística
      const optimisticPortfolio: Portfolio = {
        id: Date.now(), // ID temporário
        name: newPortfolio.name,
        description: newPortfolio.description,
        currency: newPortfolio.currency,
        benchmark: newPortfolio.benchmark,
        created_at: new Date().toISOString(),
        total_value: 0,
        total_invested: 0,
        total_return: 0,
        total_return_percentage: 0,
      };
      
      queryClient.setQueryData(['portfolios'], (old: Portfolio[] = []) => [
        ...old,
        optimisticPortfolio
      ]);
      
      return { previousPortfolios };
    },
    onError: (_err, _newPortfolio, context) => {
      // Reverte em caso de erro
      queryClient.setQueryData(['portfolios'], context?.previousPortfolios);
      toast.error('Erro ao criar portfólio');
    },
    onSuccess: () => {
      // Força atualização dos dados
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success('Portfólio criado com sucesso! Dados em tempo real ativados.');
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PortfolioForm }) => {
      return api.put(`/api/portfolios/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success('Portfólio atualizado com sucesso!');
      handleCloseDialog();
    },
    onError: () => {
      toast.error('Erro ao atualizar portfólio');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/api/portfolios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success('Portfólio excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir portfólio');
    },
  });

  const handleOpenDialog = (portfolio?: Portfolio) => {
    if (portfolio) {
      setEditingPortfolio(portfolio);
      setValue('name', portfolio.name);
      setValue('description', portfolio.description || '');
      setValue('currency', portfolio.currency);
      setValue('benchmark', portfolio.benchmark);
    } else {
      setEditingPortfolio(null);
      reset();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPortfolio(null);
    reset();
  };

  const onSubmit = (data: PortfolioForm) => {
    if (editingPortfolio) {
      updateMutation.mutate({ id: editingPortfolio.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este portfólio?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <LinearProgress />;
  }

  const toggleFavorite = (portfolioId: number) => {
    setFavoritePortfolios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(portfolioId)) {
        newSet.delete(portfolioId);
      } else {
        newSet.add(portfolioId);
      }
      return newSet;
    });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, portfolioId: number) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedPortfolioId(portfolioId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPortfolioId(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedPortfolioId) return;
    
    const portfolio = portfolios?.find(p => p.id === selectedPortfolioId);
    if (!portfolio) return;

    switch (action) {
      case 'view':
        navigate(`/portfolios/${selectedPortfolioId}`);
        break;
      case 'edit':
        handleOpenDialog(portfolio);
        break;
      case 'delete':
        handleDelete(selectedPortfolioId);
        break;
      case 'favorite':
        toggleFavorite(selectedPortfolioId);
        break;
      case 'duplicate':
        // Implementação futura para duplicar portfólio
        toast.success('Função em desenvolvimento!');
        break;
      case 'export':
        // Implementação futura para exportar dados
        toast.success('Função em desenvolvimento!');
        break;
    }
    
    handleMenuClose();
  };

  const sortedPortfolios = portfolios?.slice().sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'value':
        return (b.total_value || 0) - (a.total_value || 0);
      case 'return':
        return (b.total_return || 0) - (a.total_return || 0);
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const filteredPortfolios = sortedPortfolios?.filter(portfolio => {
    if (filterBy === 'favorites') return favoritePortfolios.has(portfolio.id);
    if (filterBy === 'positive') return (portfolio.total_return || 0) > 0;
    if (filterBy === 'negative') return (portfolio.total_return || 0) < 0;
    return true;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Moderno */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2
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
              Meus Portfólios
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body1" color="text.secondary">
                Gerencie seus investimentos com inteligência
              </Typography>
              
              {/* Status em Tempo Real */}
              <Tooltip title="Dados atualizados em tempo real" arrow>
              <Chip
                  icon={isFetching ? <Refresh className="spin-animation" /> : <AccessTime />}
                  label={isFetching ? "Atualizando..." : "Tempo Real"}
                size="small"
                color="success"
                variant="outlined"
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    fontWeight: 600,
                  }}
              />
          </Tooltip>
            </Box>
        </Box>
        
        <Button
          variant="contained"
            size="large"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
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
          Novo Portfólio
        </Button>
        </Box>

        {/* Barra de Controles */}
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
            {/* Estatísticas Rápidas */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWallet sx={{ color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total de Portfólios
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {portfolios?.length || 0}
                  </Typography>
                </Box>
              </Box>
              
              <Divider orientation="vertical" flexItem />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShowChart sx={{ color: theme.palette.success.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Valor Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                    {portfolios?.reduce((sum, p) => sum + (p.total_value || 0), 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Controles */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Filtros Avançados" arrow>
                <IconButton 
                  size="small"
                  onClick={() => setOpenFiltersModal(true)}
                  sx={{
                    bgcolor: filterBy !== 'all' 
                      ? alpha(theme.palette.primary.main, 0.1) 
                      : alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${filterBy !== 'all' 
                      ? theme.palette.primary.main 
                      : alpha(theme.palette.divider, 0.2)}`,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      borderColor: theme.palette.primary.main,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FilterList fontSize="small" color={filterBy !== 'all' ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Ordenar portfólios" arrow>
                <IconButton 
                  size="small"
                  onClick={() => setOpenSortModal(true)}
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
                  <Analytics fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title={viewMode === 'grid' ? 'Visualização em lista' : 'Visualização em grade'} arrow>
                <IconButton 
                  size="small"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      borderColor: theme.palette.primary.main,
                    }
                  }}
                >
                  {viewMode === 'grid' ? <ViewList fontSize="small" /> : <GridView fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      </Box>

      {viewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredPortfolios?.map((portfolio, index) => {
          const isPositive = (portfolio.total_return || 0) >= 0;
          const isFavorite = favoritePortfolios.has(portfolio.id);
          const returnIcon = isPositive ? TrendingUp : (portfolio.total_return || 0) === 0 ? TrendingFlat : TrendingDown;
          const returnColor = isPositive ? theme.palette.success.main : (portfolio.total_return || 0) === 0 ? theme.palette.text.secondary : theme.palette.error.main;
          
          return (
            <Grid item xs={12} sm={6} lg={4} key={portfolio.id}>
              <Zoom in timeout={300 + index * 100}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    },
                    transition: 'all 0.3s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    }
                  }}
                  onClick={() => navigate(`/portfolios/${portfolio.id}`)}
                >
                  <CardContent sx={{ flex: 1, p: 3 }}>
                    {/* Header do Card */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 600,
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              fontSize: '0.9rem',
                              fontWeight: 600,
                            }}
                          >
                            {portfolio.name.charAt(0).toUpperCase()}
                          </Avatar>
                    {portfolio.name}
                  </Typography>
                  
                  {portfolio.description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              mb: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                      {portfolio.description}
                    </Typography>
                  )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(portfolio.id);
                          }}
                          sx={{
                            color: isFavorite ? theme.palette.warning.main : theme.palette.text.secondary,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.warning.main, 0.1),
                            }
                          }}
                        >
                          {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                        </IconButton>
                        
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, portfolio.id)}
                          sx={{
                            color: theme.palette.text.secondary,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.text.secondary, 0.1),
                            }
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Métricas Principais */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        mb: 2
                      }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Valor Total
                    </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {portfolio.total_value
                        ? formatCurrency(portfolio.total_value, portfolio.currency)
                        : '-'}
                    </Typography>
                  </Box>

                        <Avatar
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            width: 48,
                            height: 48,
                          }}
                        >
                          <AccountBalanceWallet />
                        </Avatar>
                  </Box>

                      {/* Retorno */}
                  {portfolio.total_return !== undefined && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          p: 2,
                          bgcolor: alpha(returnColor, 0.05),
                          borderRadius: 2,
                          border: `1px solid ${alpha(returnColor, 0.1)}`,
                        }}>
                      <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Retorno
                        </Typography>
                        <Typography
                              variant="h6"
                              sx={{ 
                                color: returnColor,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}
                        >
                          {formatCurrency(portfolio.total_return, portfolio.currency)}
                              {portfolio.total_return_percentage !== undefined && (
                                <Chip
                                  label={`${portfolio.total_return_percentage >= 0 ? '+' : ''}${portfolio.total_return_percentage.toFixed(2)}%`}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(returnColor, 0.1),
                                    color: returnColor,
                                    fontWeight: 600,
                                    height: 20,
                                    fontSize: '0.7rem',
                                  }}
                                />
                              )}
                            </Typography>
                          </Box>
                          
                          <Avatar
                            sx={{
                              bgcolor: alpha(returnColor, 0.1),
                              color: returnColor,
                              width: 40,
                              height: 40,
                            }}
                          >
                            {React.createElement(returnIcon, { fontSize: "small" })}
                          </Avatar>
                        </Box>
                      )}
                    </Box>

                    {/* Informações Adicionais */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={portfolio.currency}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                        <Chip
                          label={portfolio.benchmark}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        {new Date(portfolio.created_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>
                </CardContent>

                  {/* Ações do Card */}
                  <CardActions sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                    justifyContent: 'space-between'
                  }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Visualizar detalhes" arrow>
                  <IconButton
                    size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/portfolios/${portfolio.id}`);
                          }}
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.2),
                              transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Launch fontSize="small" />
                  </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Editar portfólio" arrow>
                  <IconButton
                    size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(portfolio);
                          }}
                          sx={{
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: theme.palette.info.main,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.info.main, 0.2),
                              transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Edit fontSize="small" />
                  </IconButton>
                      </Tooltip>
                    </Box>

                    <Tooltip title="Excluir portfólio" arrow>
                  <IconButton
                    size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(portfolio.id);
                        }}
                        sx={{
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          color: theme.palette.error.main,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.2),
                            transform: 'scale(1.1)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Delete fontSize="small" />
                  </IconButton>
                    </Tooltip>
                </CardActions>
              </Card>
              </Zoom>
            </Grid>
          );
        })}

                  {(!portfolios || portfolios.length === 0) && (
            <Grid item xs={12}>
              <Fade in timeout={600}>
                <Paper
                  elevation={0}
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    px: 4,
                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(20px)',
                    border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -50,
                      right: -50,
                      width: 100,
                      height: 100,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: '50%',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: -30,
                      width: 80,
                      height: 80,
                      bgcolor: alpha(theme.palette.secondary.main, 0.05),
                      borderRadius: '50%',
                    }}
                  />
                  
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      mx: 'auto',
                      mb: 3,
                      fontSize: '2rem',
                    }}
                  >
                    <AccountBalanceWallet fontSize="large" />
                  </Avatar>
                  
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      mb: 2,
                      background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Bem-vindo ao seu Portfolio!
                  </Typography>
                  
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    Você ainda não tem portfólios
                  </Typography>
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                    Comece criando seu primeiro portfólio para organizar e gerenciar seus investimentos de forma inteligente. 
                    Acompanhe performance, dividendos e muito mais!
                  </Typography>
                  
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
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
                    Criar Primeiro Portfólio
                  </Button>
                </Paper>
              </Fade>
            </Grid>
          )}
        </Grid>
      ) : (
        // Modo Lista
        <Stack spacing={2}>
          {filteredPortfolios?.map((portfolio, index) => {
            const isPositive = (portfolio.total_return || 0) >= 0;
            const isFavorite = favoritePortfolios.has(portfolio.id);
            const returnColor = isPositive ? theme.palette.success.main : (portfolio.total_return || 0) === 0 ? theme.palette.text.secondary : theme.palette.error.main;
            
            return (
              <Slide in direction="left" timeout={300 + index * 50} key={portfolio.id}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    },
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => navigate(`/portfolios/${portfolio.id}`)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontSize: '1.2rem',
                            fontWeight: 600,
                          }}
                        >
                          {portfolio.name.charAt(0).toUpperCase()}
                        </Avatar>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {portfolio.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {portfolio.description || 'Sem descrição'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                              label={portfolio.currency}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            <Chip
                              label={portfolio.benchmark}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, textAlign: 'right' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Valor Total
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {portfolio.total_value
                              ? formatCurrency(portfolio.total_value, portfolio.currency)
                              : '-'}
                          </Typography>
                        </Box>
                        
                        {portfolio.total_return !== undefined && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Retorno
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{ 
                                color: returnColor,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                justifyContent: 'flex-end'
                              }}
                            >
                              {formatCurrency(portfolio.total_return, portfolio.currency)}
                              {portfolio.total_return_percentage !== undefined && (
                                <Chip
                                  label={`${portfolio.total_return_percentage >= 0 ? '+' : ''}${portfolio.total_return_percentage.toFixed(2)}%`}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(returnColor, 0.1),
                                    color: returnColor,
                                    fontWeight: 600,
                                    height: 20,
                                    fontSize: '0.7rem',
                                  }}
                                />
                              )}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(portfolio.id);
                            }}
                            sx={{
                              color: isFavorite ? theme.palette.warning.main : theme.palette.text.secondary,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                              }
                            }}
                          >
                            {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/portfolios/${portfolio.id}`);
                            }}
                            sx={{
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                              }
                            }}
                          >
                            <Launch fontSize="small" />
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, portfolio.id)}
                            sx={{
                              bgcolor: alpha(theme.palette.text.secondary, 0.1),
                              color: theme.palette.text.secondary,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.text.secondary, 0.2),
                              }
                            }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Slide>
            );
          })}

          {(!portfolios || portfolios.length === 0) && (
            <Fade in timeout={600}>
              <Paper
                elevation={0}
                sx={{
                  textAlign: 'center',
                  py: 8,
                  px: 4,
                  bgcolor: alpha(theme.palette.background.paper, 0.6),
                  backdropFilter: 'blur(20px)',
                  border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mx: 'auto',
                    mb: 3,
                    fontSize: '2rem',
                  }}
                >
                  <AccountBalanceWallet fontSize="large" />
                </Avatar>
                
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    mb: 2,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Bem-vindo ao seu Portfolio!
                </Typography>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
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
                  Criar Primeiro Portfólio
                </Button>
              </Paper>
            </Fade>
          )}
        </Stack>
      )}

      {/* Modal de Filtros */}
      <Dialog 
        open={openFiltersModal} 
        onClose={() => setOpenFiltersModal(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                width: 40,
                height: 40,
              }}
            >
              <FilterList />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Filtros Avançados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filtre seus portfólios por categoria
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            {[
              { value: 'all', label: 'Todos os Portfólios', icon: '📊' },
              { value: 'favorites', label: 'Favoritos', icon: '⭐' },
              { value: 'positive', label: 'Retorno Positivo', icon: '📈' },
              { value: 'negative', label: 'Retorno Negativo', icon: '📉' },
            ].map((filter) => (
              <Paper
                key={filter.value}
                elevation={0}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: `2px solid ${filterBy === filter.value ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                  bgcolor: filterBy === filter.value ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  setFilterBy(filter.value);
                  setOpenFiltersModal(false);
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontSize: '1.5rem' }}>{filter.icon}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {filter.label}
                  </Typography>
                  {filterBy === filter.value && (
                    <Chip
                      label="Ativo"
                      size="small"
                      color="primary"
                      sx={{ ml: 'auto' }}
                    />
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Modal de Ordenação */}
      <Dialog 
        open={openSortModal} 
        onClose={() => setOpenSortModal(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                width: 40,
                height: 40,
              }}
            >
              <Analytics />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Ordenar Portfólios
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Escolha como organizar a visualização
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            {[
              { value: 'date', label: 'Data de Criação', icon: '📅', desc: 'Mais recentes primeiro' },
              { value: 'name', label: 'Nome (A-Z)', icon: '🔤', desc: 'Ordem alfabética' },
              { value: 'value', label: 'Valor Total', icon: '💰', desc: 'Maior valor primeiro' },
              { value: 'return', label: 'Retorno', icon: '📊', desc: 'Melhor performance primeiro' },
            ].map((sort) => (
              <Paper
                key={sort.value}
                elevation={0}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: `2px solid ${sortBy === sort.value ? theme.palette.info.main : alpha(theme.palette.divider, 0.1)}`,
                  bgcolor: sortBy === sort.value ? alpha(theme.palette.info.main, 0.05) : 'transparent',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: theme.palette.info.main,
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                  },
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  setSortBy(sort.value as any);
                  setOpenSortModal(false);
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontSize: '1.5rem' }}>{sort.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {sort.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sort.desc}
                    </Typography>
                  </Box>
                  {sortBy === sort.value && (
                    <Chip
                      label="Ativo"
                      size="small"
                      color="info"
                    />
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Menu Dropdown para Ações do Portfólio */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
            mt: 1,
            minWidth: 200,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItemMUI 
          onClick={() => handleMenuAction('view')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Visibility fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Visualizar Detalhes" 
            secondary="Abrir página do portfólio"
            primaryTypographyProps={{ fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItemMUI>

        <MenuItemMUI 
          onClick={() => handleMenuAction('edit')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.info.main, 0.1),
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Edit fontSize="small" color="info" />
          </ListItemIcon>
          <ListItemText 
            primary="Editar Portfólio" 
            secondary="Alterar nome e configurações"
            primaryTypographyProps={{ fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItemMUI>

        <MenuItemMUI 
          onClick={() => handleMenuAction('favorite')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.warning.main, 0.1),
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {selectedPortfolioId && favoritePortfolios.has(selectedPortfolioId) ? (
              <Star fontSize="small" sx={{ color: theme.palette.warning.main }} />
            ) : (
              <StarBorder fontSize="small" sx={{ color: theme.palette.warning.main }} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary={selectedPortfolioId && favoritePortfolios.has(selectedPortfolioId) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            secondary="Marcar como destaque"
            primaryTypographyProps={{ fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItemMUI>

        <Divider sx={{ my: 1 }} />

        <MenuItemMUI 
          onClick={() => handleMenuAction('duplicate')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.success.main, 0.1),
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <FileCopy fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText 
            primary="Duplicar Portfólio" 
            secondary="Criar cópia com mesmas configurações"
            primaryTypographyProps={{ fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItemMUI>

        <MenuItemMUI 
          onClick={() => handleMenuAction('export')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.success.main, 0.1),
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <GetApp fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText 
            primary="Exportar Dados" 
            secondary="Baixar relatório em PDF/Excel"
            primaryTypographyProps={{ fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItemMUI>

        <Divider sx={{ my: 1 }} />

        <MenuItemMUI 
          onClick={() => handleMenuAction('delete')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.1),
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText 
            primary="Excluir Portfólio" 
            secondary="Remover permanentemente"
            primaryTypographyProps={{ fontWeight: 600, color: theme.palette.error.main }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItemMUI>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }
        }}
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ 
            pb: 1,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 48,
                  height: 48,
                }}
              >
                {editingPortfolio ? <Edit /> : <Add />}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {editingPortfolio ? 'Editar Portfólio' : 'Novo Portfólio'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {editingPortfolio 
                    ? 'Atualize as informações do seu portfólio' 
                    : 'Configure seu novo portfólio de investimentos'
                  }
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Nome é obrigatório' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Nome do Portfólio"
                  fullWidth
                  margin="normal"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descrição (opcional)"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                />
              )}
            />

            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Moeda"
                  fullWidth
                  margin="normal"
                >
                  {currencies.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="benchmark"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Índice de Referência"
                  fullWidth
                  margin="normal"
                >
                  {benchmarks.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 3, 
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            gap: 2,
          }}>
            <Button 
              onClick={handleCloseDialog}
              variant="outlined"
              size="large"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Cancelar
            </Button>
            
            <Button 
              type="submit" 
              variant="contained"
              size="large"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
                transition: 'all 0.2s ease',
              }}
            >
              {editingPortfolio ? 'Salvar Alterações' : 'Criar Portfólio'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
