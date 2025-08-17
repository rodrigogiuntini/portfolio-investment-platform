import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Avatar,
  Skeleton,

  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  useTheme,
  alpha,
  Fade,
  Zoom,
  ButtonGroup,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  Refresh,
  MoreVert,
  Edit,
  Delete,
  ShowChart,
  Update,
  History,
  Visibility,
  VisibilityOff,
  CloudSync,
  Star,
  StarBorder,
  GridView,
  ViewList,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface Asset {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  sector?: string;
  exchange?: string;
  currency: string;
  current_price?: number;
  market_cap?: number;
  industry?: string;
  created_at: string;
}

interface AssetPosition {
  id: number;
  asset_id: number;
  portfolio_id: number;
  quantity: number;
  average_price: number;
  current_price?: number;
  current_value?: number;
  total_invested?: number;
  asset: Asset;
  portfolio: {
    id: number;
    name: string;
  };
}

const ASSET_TYPES = [
  { value: 'STOCK', label: 'Ações', color: '#1976d2', icon: '📈' },
  { value: 'BOND', label: 'Títulos', color: '#388e3c', icon: '🏛️' },
  { value: 'FUND', label: 'Fundos', color: '#f57c00', icon: '🎯' },
  { value: 'ETF', label: 'ETFs', color: '#7b1fa2', icon: '📊' },
  { value: 'REIT', label: 'REITs', color: '#d32f2f', icon: '🏢' },
  { value: 'CRYPTO', label: 'Cripto', color: '#795548', icon: '₿' },
  { value: 'COMMODITY', label: 'Commodities', color: '#455a64', icon: '🥇' },
];

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function Assets() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  
  // Estados principais
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'symbol' | 'name' | 'price' | 'type'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showValues, setShowValues] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Estados para modais
  const [selectedPosition, setSelectedPosition] = useState<AssetPosition | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  
  // Estados para dados do histórico
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assetTransactions, setAssetTransactions] = useState<any[]>([]);
  const [assetDividends, setAssetDividends] = useState<any[]>([]);

  // Query para buscar todos os portfolios e suas posições
  const { data: portfolios = [], isLoading: portfoliosLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await api.get('/api/portfolios/');
      return response.data;
    },
  });

  // Query para buscar todas as posições de todos os portfolios
  const { data: allPositions = [], isLoading: positionsLoading, error } = useQuery({
    queryKey: ['all-positions', searchTerm, filterType],
    queryFn: async () => {
      // Buscar posições de todos os portfolios
      const allPositions: AssetPosition[] = [];
      
      for (const portfolio of portfolios) {
        try {
          const response = await api.get(`/api/portfolios/${portfolio.id}/positions`);
          const positions = response.data.map((pos: any) => {
            // Ensure current_price is available from position or asset
            const currentPrice = pos.current_price || pos.asset?.current_price || pos.average_price || 0;
            const position = {
              ...pos,
              current_price: currentPrice,
              portfolio: {
                id: portfolio.id,
                name: portfolio.name
              }
            };
            
            // Ensure asset has current_price
            if (position.asset) {
              position.asset.current_price = currentPrice;
            }
            
            return position;
          });
          allPositions.push(...positions);
        } catch (error) {
          console.warn(`Error fetching positions for portfolio ${portfolio.id}:`, error);
        }
      }
      
      return allPositions;
    },
    enabled: portfolios.length > 0,
    refetchInterval: 60000,
  });

  const isLoading = portfoliosLoading || positionsLoading;



  // Mutation para atualizar preços em lote
  const batchUpdateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/assets/batch-update-prices');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsRefreshing(false);
    },
  });

  // Filtrar e ordenar posições
  const filteredAndSortedPositions = allPositions
    .filter((position: AssetPosition) => {
      const asset = position.asset;
      const matchesSearch = !searchTerm || 
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.portfolio.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || asset.asset_type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a: AssetPosition, b: AssetPosition) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'symbol':
          aValue = a.asset.symbol;
          bValue = b.asset.symbol;
          break;
        case 'name':
          aValue = a.asset.name;
          bValue = b.asset.name;
          break;
        case 'price':
          aValue = a.current_price || 0;
          bValue = b.current_price || 0;
          break;
        case 'type':
          aValue = a.asset.asset_type;
          bValue = b.asset.asset_type;
          break;
        case 'portfolio':
          aValue = a.portfolio.name;
          bValue = b.portfolio.name;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Funções de handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    batchUpdateMutation.mutate();
  };



  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, position: AssetPosition) => {
    setMenuAnchor(event.currentTarget);
    setSelectedPosition(position);
  };

  const handleViewHistory = async () => {
    if (!selectedPosition) return;
    
    setOpenHistoryModal(true);
    setMenuAnchor(null);
    setHistoryLoading(true);

    try {
      // Buscar transações do ativo neste portfólio específico
      const transactionsResponse = await api.get(
        `/api/transactions/?asset_id=${selectedPosition.asset_id}&portfolio_id=${selectedPosition.portfolio_id}`
      );
      setAssetTransactions(transactionsResponse.data || []);

      // Buscar dividendos do ativo neste portfólio específico
      const dividendsResponse = await api.get(
        `/api/dividends/?asset_id=${selectedPosition.asset_id}&portfolio_id=${selectedPosition.portfolio_id}`
      );
      setAssetDividends(dividendsResponse.data || []);

    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      setAssetTransactions([]);
      setAssetDividends([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedPosition) return;
    
    try {
      await api.post(`/api/assets/${selectedPosition.asset_id}/update-price`);
      queryClient.invalidateQueries({ queryKey: ['all-positions'] });
      setMenuAnchor(null);
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const handleEditAsset = () => {
    // Implementar edição do ativo
    console.log('Edit asset:', selectedPosition?.asset);
    setMenuAnchor(null);
  };

  const handleDeletePosition = async () => {
    if (!selectedPosition) return;
    
    if (window.confirm(`Tem certeza que deseja excluir a posição de ${selectedPosition.asset.symbol} do portfólio ${selectedPosition.portfolio.name}?`)) {
      try {
        await api.delete(`/api/portfolios/${selectedPosition.portfolio_id}/positions/${selectedPosition.id}`);
        queryClient.invalidateQueries({ queryKey: ['all-positions'] });
        setMenuAnchor(null);
      } catch (error) {
        console.error('Error deleting position:', error);
      }
    }
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedPosition(null);
  };

  const toggleFavorite = (assetId: number) => {
    setFavorites(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const getAssetTypeInfo = (type: string) => {
    return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[0];
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={200} height={60} sx={{ mb: 2 }} />
          <Skeleton variant="text" width={400} height={24} />
        </Box>
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card elevation={0}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" height={24} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="100%" height={32} />
                  <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2, borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              py: 8,
              px: 4,
              bgcolor: alpha(theme.palette.error.main, 0.05),
              backdropFilter: 'blur(20px)',
              border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
              borderRadius: 4,
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                mx: 'auto',
                mb: 3,
                fontSize: '2rem',
              }}
            >
              ⚠️
            </Avatar>
            
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: theme.palette.error.main }}>
              Erro ao Carregar Ativos
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Não foi possível carregar a lista de ativos. Verifique sua conexão e tente novamente.
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
              }}
            >
              Tentar Novamente
            </Button>
          </Paper>
        </Fade>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Premium */}
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
              Ativos
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body1" color="text.secondary">
                Gerencie e monitore suas posições por portfólio
              </Typography>
              
              <Chip
                icon={<ShowChart />}
                label={`${filteredAndSortedPositions.length} posição${filteredAndSortedPositions.length !== 1 ? 'ões' : ''}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tooltip title={showValues ? 'Ocultar valores' : 'Mostrar valores'} arrow>
              <IconButton 
                onClick={() => setShowValues(!showValues)}
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  backdropFilter: 'blur(8px)',
                  '&:hover': { 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderColor: theme.palette.primary.main,
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[4]
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {showValues ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Atualizar cotações" arrow>
              <IconButton 
                onClick={handleRefresh}
                disabled={isRefreshing}
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  backdropFilter: 'blur(8px)',
                  '&:hover': { 
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    borderColor: theme.palette.success.main,
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[4]
                  },
                  transition: 'all 0.2s ease',
                  '&:disabled': {
                    opacity: 0.6,
                    transform: 'none'
                  }
                }}
              >
                <CloudSync 
                  sx={{ 
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} 
                />
              </IconButton>
            </Tooltip>

          </Box>
        </Box>

        {/* Controles e Filtros */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <TextField
                placeholder="Buscar por símbolo ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {ASSET_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ButtonGroup size="small">
                <Button
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('grid')}
                  sx={{ minWidth: 40 }}
                >
                  <GridView fontSize="small" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('list')}
                  sx={{ minWidth: 40 }}
                >
                  <ViewList fontSize="small" />
                </Button>
              </ButtonGroup>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy as any);
                    setSortOrder(newSortOrder as any);
                  }}
                  displayEmpty
                >
                  <MenuItem value="symbol-asc">A-Z</MenuItem>
                  <MenuItem value="symbol-desc">Z-A</MenuItem>
                  <MenuItem value="price-desc">Maior Preço</MenuItem>
                  <MenuItem value="price-asc">Menor Preço</MenuItem>
                  <MenuItem value="type-asc">Tipo</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Lista de Ativos */}
      {viewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredAndSortedPositions.map((position: AssetPosition, index: number) => {
            const asset = position.asset;
            const typeInfo = getAssetTypeInfo(asset.asset_type);
            const isFavorite = favorites.includes(asset.id);
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={`${position.portfolio_id}-${asset.id}`}>
                <Zoom in timeout={300 + index * 50}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      bgcolor: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      borderRadius: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 40px ${alpha(typeInfo.color, 0.2)}`,
                        borderColor: alpha(typeInfo.color, 0.3),
                      },
                      transition: 'all 0.3s ease',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${typeInfo.color} 0%, ${alpha(typeInfo.color, 0.6)} 100%)`,
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3, pb: '16px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {asset.symbol}
                            </Typography>
                            <Chip
                              label={typeInfo.label}
                              size="small"
                              sx={{
                                bgcolor: alpha(typeInfo.color, 0.1),
                                color: typeInfo.color,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {asset.name}
                          </Typography>
                          {asset.sector && (
                            <Typography variant="caption" color="text.secondary">
                              {asset.sector}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(asset.id);
                            }}
                            sx={{ color: isFavorite ? theme.palette.warning.main : 'inherit' }}
                          >
                            {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, position)}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 700,
                            color: typeInfo.color,
                            mb: 1
                          }}
                        >
                          {showValues 
                            ? (position.current_price || asset.current_price)
                              ? formatCurrency(position.current_price || asset.current_price || 0)
                              : 'N/A'
                            : '••••••'
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Preço Atual
                        </Typography>
                      </Box>

                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pt: 2,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          {asset.currency}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {typeInfo.icon}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        // List View
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 3,
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ativo</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Portfólio</TableCell>
                  <TableCell>Setor</TableCell>
                  <TableCell align="right">Preço</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedPositions.map((position: AssetPosition) => {
                  const asset = position.asset;
                  const typeInfo = getAssetTypeInfo(asset.asset_type);
                  const isFavorite = favorites.includes(asset.id);
                  
                  return (
                    <TableRow 
                      key={`${position.portfolio_id}-${asset.id}`}
                      sx={{
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.02),
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: alpha(typeInfo.color, 0.1),
                              color: typeInfo.color,
                              width: 40,
                              height: 40,
                              fontWeight: 700,
                            }}
                          >
                            {typeInfo.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {asset.symbol}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {asset.name}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeInfo.label}
                          size="small"
                          sx={{
                            bgcolor: alpha(typeInfo.color, 0.1),
                            color: typeInfo.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={position.portfolio.name}
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                            color: theme.palette.secondary.main,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {asset.sector || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" sx={{ fontWeight: 700, color: typeInfo.color }}>
                          {showValues 
                            ? (position.current_price || asset.current_price)
                              ? formatCurrency(position.current_price || asset.current_price || 0)
                              : 'N/A'
                            : '••••••'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleFavorite(asset.id)}
                            sx={{ color: isFavorite ? theme.palette.warning.main : 'inherit' }}
                          >
                            {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, position)}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Empty State */}
      {filteredAndSortedPositions.length === 0 && !isLoading && (
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
              <ShowChart fontSize="large" />
            </Avatar>
            
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              {searchTerm || filterType ? 'Nenhum ativo encontrado' : 'Nenhum ativo cadastrado'}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {searchTerm || filterType 
                ? 'Tente ajustar os filtros ou termos de busca'
                : 'Adicione seu primeiro ativo para começar a gerenciar seus investimentos'
              }
            </Typography>

          </Paper>
        </Fade>
      )}

      {/* Menu de Ações */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
            mt: 1,
            minWidth: 200,
          }
        }}
      >
        <MenuItem onClick={handleUpdatePrice}>
          <Update sx={{ mr: 2 }} fontSize="small" />
          Atualizar Cotação
        </MenuItem>
        <MenuItem onClick={handleViewHistory}>
          <History sx={{ mr: 2 }} fontSize="small" />
          Ver Histórico
        </MenuItem>
        <MenuItem onClick={handleEditAsset}>
          <Edit sx={{ mr: 2 }} fontSize="small" />
          Editar
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeletePosition} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 2 }} fontSize="small" />
          Excluir Posição
        </MenuItem>
      </Menu>

      {/* Modal de Histórico */}
      <Dialog
        open={openHistoryModal}
        onClose={() => setOpenHistoryModal(false)}
        maxWidth="lg"
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
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          <ShowChart />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Histórico Completo
            </Typography>
            {selectedPosition && (
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {selectedPosition.asset.symbol} - {selectedPosition.asset.name} • {selectedPosition.portfolio.name}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {historyLoading ? (
            <Box sx={{ py: 4 }}>
              <LinearProgress sx={{ mb: 2 }} />
              <Typography align="center" color="text.secondary">
                Carregando histórico...
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Resumo da Posição */}
              {selectedPosition && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    mb: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    borderRadius: 2,
                  }}
                >
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">QUANTIDADE TOTAL</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {selectedPosition.quantity?.toLocaleString('pt-BR')}
                      </Typography>
                      <Typography variant="caption">unidades</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">PREÇO MÉDIO</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'orange' }}>
                        {formatCurrency(selectedPosition.average_price)}
                      </Typography>
                      <Typography variant="caption">por unidade</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">VALOR ATUAL</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'green' }}>
                        {formatCurrency(selectedPosition.current_value || 0)}
                      </Typography>
                      <Typography variant="caption">total investido</Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">RETORNO TOTAL</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: (selectedPosition.current_value || 0) >= (selectedPosition.total_invested || 0) ? 'green' : 'red' }}>
                        {((selectedPosition.current_value || 0) - (selectedPosition.total_invested || 0)) >= 0 ? '+' : ''}
                        {formatCurrency((selectedPosition.current_value || 0) - (selectedPosition.total_invested || 0))}
                      </Typography>
                      <Typography variant="caption">
                        {(((selectedPosition.current_value || 0) - (selectedPosition.total_invested || 0)) / (selectedPosition.total_invested || 1) * 100).toFixed(2)}%
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Histórico de Transações */}
              <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <ShowChart sx={{ color: theme.palette.info.main }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Histórico de Transações ({assetTransactions.length})
                  </Typography>
                </Box>
                
                {assetTransactions.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell align="right">Quantidade</TableCell>
                          <TableCell align="right">Preço</TableCell>
                          <TableCell align="right">Valor Total</TableCell>
                          <TableCell>Observações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assetTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={transaction.transaction_type}
                                size="small"
                                color={transaction.transaction_type === 'BUY' ? 'success' : 'error'}
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {transaction.quantity?.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(transaction.price)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(transaction.total_amount)}
                            </TableCell>
                            <TableCell>
                              {transaction.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <ShowChart sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Nenhuma transação encontrada
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Este ativo não possui transações registradas neste portfólio.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Histórico de Dividendos */}
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Typography sx={{ fontSize: '1.2rem' }}>💰</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Histórico de Dividendos ({assetDividends.length})
                  </Typography>
                </Box>
                
                {assetDividends.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Data Pagamento</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell align="right">Valor por Ação</TableCell>
                          <TableCell align="right">Quantidade</TableCell>
                          <TableCell align="right">Valor Total</TableCell>
                          <TableCell>Observações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assetDividends.map((dividend) => (
                          <TableRow key={dividend.id}>
                            <TableCell>
                              {new Date(dividend.payment_date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={dividend.dividend_type}
                                size="small"
                                color="success"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(dividend.amount_per_share)}
                            </TableCell>
                            <TableCell align="right">
                              {dividend.shares_quantity?.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(dividend.total_amount)}
                            </TableCell>
                            <TableCell>
                              {dividend.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '3rem', mb: 2 }}>💰</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Nenhum dividendo encontrado
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Este ativo não possui dividendos registrados neste portfólio.
      </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenHistoryModal(false)} sx={{ textTransform: 'none' }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}
