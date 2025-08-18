import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  ButtonGroup,
  IconButton,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Avatar,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Download,
  FilterList,
  Refresh,
  Search,
  AttachMoney,
  CalendarToday as CalendarIcon,
  AccountBalanceWallet,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import TransactionModal from '../components/TransactionModal';

// Types
interface Transaction {
  id: number;
  transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT' | 'BONUS';
  asset_id: number;
  portfolio_id: number;
  quantity: number;
  price: number;
  total_amount: number;
  date: string;
  notes?: string;
  fees?: number;
  taxes?: number;
  currency?: string;
  exchange_rate?: number;
  created_at?: string;
  asset?: {
    id: number;
    symbol: string;
    name: string;
    asset_type: string;
    sector?: string;
  };
  portfolio?: {
    id: number;
    name: string;
  };
}

interface Portfolio {
  id: number;
  name: string;
}

const TRANSACTION_TYPES = [
  { value: 'BUY', label: 'Compra', icon: TrendingUp, color: '#10b981' },
  { value: 'SELL', label: 'Venda', icon: TrendingDown, color: '#ef4444' },
  { value: 'DIVIDEND', label: 'Dividendo', icon: AttachMoney, color: '#3b82f6' },
  { value: 'SPLIT', label: 'Desdobramento', icon: SwapHoriz, color: '#8b5cf6' },
  { value: 'BONUS', label: 'Bonificação', icon: AccountBalanceWallet, color: '#f59e0b' },
];

export default function Transactions() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  
  // States
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const [selectedPortfolio, setSelectedPortfolio] = useState(0);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: () => api.get('/api/portfolios/').then(res => res.data),
  });

  // Fetch transactions
  const { data: transactions = [], isLoading, error } = useQuery<Transaction[]>({
    queryKey: ['transactions', selectedPortfolio, selectedPeriod, selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPortfolio > 0) params.append('portfolio_id', selectedPortfolio.toString());
      if (selectedType !== 'ALL') params.append('transaction_type', selectedType);
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedPeriod) {
        case '1M': startDate.setMonth(startDate.getMonth() - 1); break;
        case '3M': startDate.setMonth(startDate.getMonth() - 3); break;
        case '6M': startDate.setMonth(startDate.getMonth() - 6); break;
        case '1A': startDate.setFullYear(startDate.getFullYear() - 1); break;
        case '2A': startDate.setFullYear(startDate.getFullYear() - 2); break;
        case 'ALL': startDate.setFullYear(startDate.getFullYear() - 10); break;
      }
      
      params.append('start_date', startDate.toISOString().split('T')[0]);
      params.append('end_date', endDate.toISOString().split('T')[0]);
      
      console.log('🔍 Transactions - Buscando transações:', params.toString());
      
      // Fetch transactions and portfolios in parallel
      const [transactionsResponse, portfoliosResponse] = await Promise.all([
        api.get(`/api/transactions/?${params.toString()}`),
        api.get('/api/portfolios/')
      ]);
      
      const transactionsData = transactionsResponse.data;
      const portfoliosData = portfoliosResponse.data;
      
      console.log('📊 Transactions - Dados recebidos:', {
        transactions: transactionsData.length,
        portfolios: portfoliosData.length
      });
      
      // Enrich transactions with portfolio data
      const enrichedTransactions = transactionsData.map((transaction: Transaction) => ({
        ...transaction,
        portfolio: portfoliosData.find((p: Portfolio) => p.id === transaction.portfolio_id)
      }));
      
      console.log('✅ Transactions - Dados enriquecidos:', enrichedTransactions);
      return enrichedTransactions;
    },
    enabled: !!portfolios.length, // Only fetch when portfolios are loaded
  });

  // Filter transactions by search term
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.asset?.symbol?.toLowerCase().includes(searchLower) ||
      transaction.asset?.name?.toLowerCase().includes(searchLower) ||
      transaction.portfolio?.name?.toLowerCase().includes(searchLower) ||
      transaction.notes?.toLowerCase().includes(searchLower)
    );
  });

  // Paginated transactions
  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Calculate statistics
  const totalVolume = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const buyTransactions = filteredTransactions.filter(t => t.transaction_type === 'BUY').length;
  const sellTransactions = filteredTransactions.filter(t => t.transaction_type === 'SELL').length;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (transactionId: number) => api.delete(`/api/transactions/${transactionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['portfolios'] });
  };

  const handleNewTransaction = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteMutation.mutate(transactionToDelete.id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleExport = () => {
    // Export transactions as CSV
    const exportData = filteredTransactions.map(transaction => ({
      'Data': transaction.date ? new Date(transaction.date).toLocaleDateString('pt-BR') : 'Data inválida',
      'Tipo': TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type)?.label || transaction.transaction_type,
      'Ativo': transaction.asset?.symbol || 'N/A',
      'Nome do Ativo': transaction.asset?.name || 'Ativo não encontrado',
      'Portfólio': transaction.portfolio?.name || 'Portfólio não encontrado',
      'Quantidade': transaction.quantity || 0,
      'Preço': (transaction.price || 0).toFixed(2),
      'Valor Total': (transaction.total_amount || 0).toFixed(2),
      'Observações': transaction.notes || ''
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${(row as any)[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${selectedPeriod}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTransactionTypeInfo = (type: string) => {
    return TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[0];
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Premium - Consistente com outras páginas */}
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
              Histórico de Transações
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Acompanhe todas as suas operações com filtros avançados e análises detalhadas
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleNewTransaction}
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
            Nova Transação
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
                <SwapHoriz sx={{ color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Volume
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                    R$ {totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
              
              <Divider orientation="vertical" flexItem />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp sx={{ color: theme.palette.success.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Compras
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                    {buyTransactions}
                  </Typography>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingDown sx={{ color: theme.palette.error.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Vendas
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                    {sellTransactions}
                  </Typography>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ color: theme.palette.warning.main }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Transações
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {filteredTransactions.length}
                  </Typography>
                </Box>
              </Box>

              {/* Seletores */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Portfólio</InputLabel>
                <Select
                  value={selectedPortfolio || ''}
                  onChange={(e) => setSelectedPortfolio(Number(e.target.value) || 0)}
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

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="ALL">Todos os Tipos</MenuItem>
                  {TRANSACTION_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <ButtonGroup variant="outlined" size="small">
                {['1M', '3M', '6M', '1A', '2A', 'ALL'].map((period) => (
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
              <TextField
                size="small"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
              
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
                <span>
                  <IconButton 
                    size="small"
                    onClick={handleExport}
                    disabled={filteredTransactions.length === 0}
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
                </span>
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

      {/* Tabela de Transações Premium */}
      <Fade in timeout={800}>
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Transações Recentes - {selectedPeriod}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
              {searchTerm && ` para "${searchTerm}"`}
            </Typography>
          </Box>

          {isLoading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SwapHoriz sx={{ fontSize: 80, color: theme.palette.text.disabled, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Carregando transações...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aguarde enquanto buscamos suas transações
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SwapHoriz sx={{ fontSize: 80, color: theme.palette.error.main, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: theme.palette.error.main }}>
                Erro ao carregar transações
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Não foi possível carregar as transações. Tente novamente.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }}
              >
                Tentar Novamente
              </Button>
            </Box>
          ) : filteredTransactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SwapHoriz sx={{ fontSize: 80, color: theme.palette.text.disabled, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {selectedPortfolio === 0 ? 'Nenhuma transação encontrada' : 'Portfólio sem transações'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm 
                  ? `Nenhuma transação corresponde ao termo "${searchTerm}"`
                  : selectedPortfolio === 0 
                    ? 'Selecione um portfólio ou ajuste os filtros para ver as transações'
                    : 'Este portfólio ainda não possui transações registradas'
                }
              </Typography>
              {selectedPortfolio > 0 && !searchTerm && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleNewTransaction}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                >
                  Adicionar Primeira Transação
                </Button>
              )}
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ativo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Portfólio</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Quantidade</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Preço</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTransactions.map((transaction, index) => {
                      const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
                      const IconComponent = typeInfo.icon;
                      
                      return (
                        <Zoom key={transaction.id} in timeout={300 + index * 50}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar
                                  sx={{
                                    background: `linear-gradient(45deg, ${typeInfo.color}, ${alpha(typeInfo.color, 0.7)})`,
                                    width: 32,
                                    height: 32,
                                  }}
                                >
                                  <IconComponent sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {typeInfo.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {transaction.transaction_type}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {transaction.asset?.symbol || 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {transaction.asset?.name || 'Ativo não encontrado'}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Chip
                                label={transaction.portfolio?.name || 'Portfólio não encontrado'}
                                size="small"
                                sx={{
                                  background: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            
                            <TableCell align="right">
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {(transaction.quantity || 0).toLocaleString('pt-BR')}
                              </Typography>
                            </TableCell>
                            
                            <TableCell align="right">
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                R$ {(transaction.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                            
                            <TableCell align="right">
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  fontWeight: 700,
                                  color: transaction.transaction_type === 'BUY' 
                                    ? theme.palette.error.main 
                                    : transaction.transaction_type === 'SELL'
                                    ? theme.palette.success.main
                                    : theme.palette.text.primary
                                }}
                              >
                                {transaction.transaction_type === 'BUY' ? '-' : transaction.transaction_type === 'SELL' ? '+' : ''}
                                R$ {(transaction.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {transaction.date ? new Date(transaction.date).toLocaleDateString('pt-BR') : 'Data inválida'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {transaction.created_at ? new Date(transaction.created_at).toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) : ''}
                              </Typography>
                            </TableCell>
                            
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title="Editar">
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleEditTransaction(transaction)}
                                    sx={{
                                      color: theme.palette.info.main,
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                                      },
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                
                                <Tooltip title="Excluir">
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleDeleteTransaction(transaction)}
                                    sx={{
                                      color: theme.palette.error.main,
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                      },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        </Zoom>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredTransactions.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Transações por página:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                }
                sx={{
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  '& .MuiTablePagination-toolbar': {
                    px: 3,
                  },
                }}
              />
            </>
          )}
        </Paper>
      </Fade>

      {/* Transaction Modal */}
      <TransactionModal
        open={isModalOpen}
        onClose={handleModalClose}
        transaction={editingTransaction}
        portfolioId={selectedPortfolio || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          color: theme.palette.error.main 
        }}>
          <Warning />
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita e 
            irá afetar os cálculos do seu portfólio.
          </DialogContentText>
          {transactionToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Transação: {TRANSACTION_TYPES.find(t => t.value === transactionToDelete.transaction_type)?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {transactionToDelete.asset?.symbol} - R$ {transactionToDelete.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            sx={{ borderRadius: 2 }}
          >
            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
