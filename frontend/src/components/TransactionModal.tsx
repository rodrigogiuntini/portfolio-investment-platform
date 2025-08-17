import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Chip,
  Alert,
  InputAdornment,
  Switch,
  FormControlLabel,
  CircularProgress,
  Avatar,
  alpha,
  useTheme,
  Divider,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  SwapHoriz,
  AccountBalanceWallet,
  Close as CloseIcon,
  CalendarToday,
  Calculate,
  Info,
  ExpandMore,
  ExpandLess,
  Search,
} from '@mui/icons-material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';

interface Asset {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  sector?: string;
  currency?: string;
}

interface Portfolio {
  id: number;
  name: string;
  currency?: string;
}

interface TransactionForm {
  portfolio_id: number;
  asset_id?: number;
  transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT' | 'BONUS' | 'DEPOSIT' | 'WITHDRAW';
  date: Date;
  quantity?: number;
  price?: number;
  total_amount: number;
  fees: number;
  taxes: number;
  currency: string;
  exchange_rate: number;
  notes?: string;
}

interface Transaction {
  id: number;
  portfolio_id: number;
  asset_id?: number;
  transaction_type: string;
  date: string;
  quantity?: number;
  price?: number;
  total_amount: number;
  fees: number;
  taxes: number;
  currency: string;
  exchange_rate: number;
  notes?: string;
  asset?: Asset;
}

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  portfolioId?: number;
}

const TRANSACTION_TYPES = [
  { value: 'BUY', label: 'Compra', icon: TrendingUp, color: '#10b981', description: 'Compra de ativos' },
  { value: 'SELL', label: 'Venda', icon: TrendingDown, color: '#ef4444', description: 'Venda de ativos' },
  { value: 'DIVIDEND', label: 'Dividendo', icon: AttachMoney, color: '#3b82f6', description: 'Recebimento de dividendos' },
  { value: 'SPLIT', label: 'Desdobramento', icon: SwapHoriz, color: '#8b5cf6', description: 'Desdobramento de ações' },
  { value: 'BONUS', label: 'Bonificação', icon: AccountBalanceWallet, color: '#f59e0b', description: 'Bonificação em ações' },
  { value: 'DEPOSIT', label: 'Depósito', icon: AccountBalanceWallet, color: '#10b981', description: 'Depósito em conta' },
  { value: 'WITHDRAW', label: 'Saque', icon: SwapHoriz, color: '#f59e0b', description: 'Saque da conta' },
];

const CURRENCIES = [
  { value: 'BRL', label: 'Real (R$)', symbol: 'R$' },
  { value: 'USD', label: 'Dólar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
];

export default function TransactionModal({ open, onClose, transaction, portfolioId }: TransactionModalProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  
  // Form states
  const [formData, setFormData] = useState<TransactionForm>({
    portfolio_id: portfolioId || 0,
    transaction_type: 'BUY',
    date: new Date(),
    total_amount: 0,
    fees: 0,
    taxes: 0,
    currency: 'BRL',
    exchange_rate: 1.0,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load data when editing
  useEffect(() => {
    if (transaction && open) {
      setFormData({
        portfolio_id: transaction.portfolio_id,
        asset_id: transaction.asset_id,
        transaction_type: transaction.transaction_type as any,
        date: new Date(transaction.date),
        quantity: transaction.quantity,
        price: transaction.price,
        total_amount: transaction.total_amount,
        fees: transaction.fees,
        taxes: transaction.taxes,
        currency: transaction.currency,
        exchange_rate: transaction.exchange_rate,
        notes: transaction.notes,
      });
      setSelectedAsset(transaction.asset || null);
    } else if (!transaction && open) {
      // Reset form for new transaction
      setFormData({
        portfolio_id: portfolioId || 0,
        transaction_type: 'BUY',
        date: new Date(),
        total_amount: 0,
        fees: 0,
        taxes: 0,
        currency: 'BRL',
        exchange_rate: 1.0,
      });
      setSelectedAsset(null);
    }
    setErrors({});
  }, [transaction, open, portfolioId]);

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: () => api.get('/api/portfolios/').then(res => res.data),
  });

  // Fetch assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => api.get('/api/assets/').then(res => res.data),
  });

  // Asset search function
  const searchAssets = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search both local assets and external API
      const [localResults, externalResults] = await Promise.all([
        api.get(`/api/assets/?search=${encodeURIComponent(query)}&limit=10`),
        api.get(`/api/assets/search?q=${encodeURIComponent(query)}`)
      ]);

      // Combine results, prioritizing local assets
      const combined = [...localResults.data];
      externalResults.data.forEach((external: Asset) => {
        if (!combined.find(local => local.symbol === external.symbol)) {
          combined.push(external);
        }
      });

      setSearchResults(combined.slice(0, 10));
    } catch (error) {
      console.error('Error searching assets:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle asset search input
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (assetSearchTerm) {
        searchAssets(assetSearchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [assetSearchTerm]);

  // Auto-calculate total amount
  useEffect(() => {
    if (autoCalculate && formData.quantity && formData.price) {
      const subtotal = formData.quantity * formData.price;
      const total = subtotal + formData.fees + formData.taxes;
      setFormData(prev => ({ ...prev, total_amount: total }));
    }
  }, [formData.quantity, formData.price, formData.fees, formData.taxes, autoCalculate]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      let assetId = data.asset_id;
      
      // If we have a selected asset but no asset_id, we need to create the asset first
      if (selectedAsset && !selectedAsset.id && ['BUY', 'SELL', 'SPLIT', 'BONUS'].includes(data.transaction_type)) {
        try {
          const assetPayload = {
            symbol: selectedAsset.symbol,
            name: selectedAsset.name,
            asset_type: selectedAsset.asset_type,
            currency: selectedAsset.currency || 'BRL',
            sector: selectedAsset.sector,
            exchange: selectedAsset.exchange,
          };
          
          const assetResponse = await api.post('/api/assets/', assetPayload);
          assetId = assetResponse.data.id;
        } catch (error: any) {
          // If asset creation fails, show error
          throw new Error('Falha ao criar ativo: ' + (error.response?.data?.detail || error.message));
        }
      }
      
      const payload = {
        ...data,
        asset_id: assetId,
        date: data.date.toISOString().split('T')[0],
      };
      
      if (transaction) {
        return api.put(`/api/transactions/${transaction.id}`, payload);
      } else {
        return api.post('/api/transactions/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Error saving transaction:', error);
      if (error.response?.data?.detail) {
        setErrors({ submit: error.response.data.detail });
      } else {
        setErrors({ submit: error.message || 'Erro ao salvar transação' });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.portfolio_id) {
      newErrors.portfolio_id = 'Portfólio é obrigatório';
    }
    
    if (!formData.transaction_type) {
      newErrors.transaction_type = 'Tipo de transação é obrigatório';
    }
    
    if (['BUY', 'SELL', 'SPLIT', 'BONUS'].includes(formData.transaction_type) && !selectedAsset) {
      newErrors.asset_id = 'Ativo é obrigatório para compras, vendas, desdobramentos e bonificações';
    }
    
    if (['BUY', 'SELL', 'SPLIT', 'BONUS'].includes(formData.transaction_type) && (!formData.quantity || formData.quantity <= 0)) {
      newErrors.quantity = 'Quantidade deve ser maior que zero';
    }
    
    if (['BUY', 'SELL'].includes(formData.transaction_type) && (!formData.price || formData.price <= 0)) {
      newErrors.price = 'Preço deve ser maior que zero';
    }
    
    if (!formData.total_amount || formData.total_amount <= 0) {
      newErrors.total_amount = 'Valor total deve ser maior que zero';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      saveMutation.mutate(formData);
    }
  };

  const handleFieldChange = (field: keyof TransactionForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAssetSelect = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    setSelectedAsset(asset || null);
    handleFieldChange('asset_id', assetId);
  };

  const selectedTransactionType = TRANSACTION_TYPES.find(t => t.value === formData.transaction_type);
  const selectedCurrency = CURRENCIES.find(c => c.value === formData.currency);
  const needsAsset = ['BUY', 'SELL', 'SPLIT', 'BONUS'].includes(formData.transaction_type);
  const needsQuantityPrice = ['BUY', 'SELL', 'SPLIT', 'BONUS'].includes(formData.transaction_type);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 3, 
          pb: 2,
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
          color: 'white',
          position: 'relative'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedTransactionType && (
              <Avatar sx={{
                bgcolor: alpha(selectedTransactionType.color, 0.2),
                color: selectedTransactionType.color,
                border: `2px solid ${alpha(selectedTransactionType.color, 0.3)}`,
              }}>
                <selectedTransactionType.icon />
              </Avatar>
            )}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {transaction ? 'Editar Transação' : 'Nova Transação'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {selectedTransactionType?.description || 'Configure os detalhes da transação'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              color: 'white',
              bgcolor: alpha('#ffffff', 0.1),
              '&:hover': { bgcolor: alpha('#ffffff', 0.2) },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ p: 3 }}>
            {errors.submit && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errors.submit}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  📋 Informações Básicas
                </Typography>
              </Grid>

              {/* Portfolio Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.portfolio_id}>
                  <InputLabel>Portfólio</InputLabel>
                  <Select
                    value={formData.portfolio_id || ''}
                    onChange={(e) => handleFieldChange('portfolio_id', Number(e.target.value))}
                    label="Portfólio"
                  >
                    {portfolios.map((portfolio) => (
                      <MenuItem key={portfolio.id} value={portfolio.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountBalanceWallet fontSize="small" />
                          {portfolio.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.portfolio_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {errors.portfolio_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Transaction Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.transaction_type}>
                  <InputLabel>Tipo de Transação</InputLabel>
                  <Select
                    value={formData.transaction_type}
                    onChange={(e) => handleFieldChange('transaction_type', e.target.value)}
                    label="Tipo de Transação"
                  >
                    {TRANSACTION_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: alpha(type.color, 0.1),
                              color: type.color,
                            }}
                          >
                            <type.icon sx={{ fontSize: 16 }} />
                          </Avatar>
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.transaction_type && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {errors.transaction_type}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Asset Selection (only for BUY/SELL) */}
              {needsAsset && (
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Buscar Ativo
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Digite o símbolo ou nome do ativo..."
                      value={assetSearchTerm}
                      onChange={(e) => setAssetSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                        endAdornment: isSearching && (
                          <InputAdornment position="end">
                            <CircularProgress size={20} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />

                    {/* Selected Asset Display */}
                    {selectedAsset && (
                      <Paper 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.success.main,
                              color: 'white',
                              width: 40,
                              height: 40,
                            }}
                          >
                            {selectedAsset.symbol?.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {selectedAsset.symbol}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedAsset.name}
                            </Typography>
                          </Box>
                          <Chip
                            label={selectedAsset.asset_type}
                            sx={{
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedAsset(null);
                              setFormData(prev => ({ ...prev, asset_id: undefined }));
                              setAssetSearchTerm('');
                            }}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      </Paper>
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedAsset && (
                      <Paper 
                        sx={{ 
                          maxHeight: 300, 
                          overflow: 'auto',
                          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        }}
                      >
                        {searchResults.map((asset, index) => (
                          <Box
                            key={asset.id || `external-${index}`}
                            onClick={() => {
                              setSelectedAsset(asset);
                              setFormData(prev => ({ ...prev, asset_id: asset.id }));
                              setAssetSearchTerm('');
                              setSearchResults([]);
                            }}
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              borderBottom: index < searchResults.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: asset.id ? theme.palette.primary.main : alpha(theme.palette.warning.main, 0.7),
                                  color: 'white',
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                {asset.symbol?.charAt(0)}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {asset.symbol}
                                  {!asset.id && (
                                    <Chip
                                      label="Novo"
                                      size="small"
                                      sx={{ 
                                        ml: 1, 
                                        bgcolor: alpha(theme.palette.warning.main, 0.2),
                                        color: theme.palette.warning.main,
                                        fontSize: '0.7rem',
                                        height: 20,
                                      }}
                                    />
                                  )}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {asset.name}
                                </Typography>
                              </Box>
                              <Chip
                                label={asset.asset_type}
                                size="small"
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Paper>
                    )}

                    {errors.asset_id && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.asset_id}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}

              {/* Date */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Data da Transação"
                  value={formData.date}
                  onChange={(date) => handleFieldChange('date', date || new Date())}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday />
                          </InputAdornment>
                        ),
                      },
                    },
                  }}
                />
              </Grid>

              {/* Currency */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Moeda</InputLabel>
                  <Select
                    value={formData.currency}
                    onChange={(e) => handleFieldChange('currency', e.target.value)}
                    label="Moeda"
                  >
                    {CURRENCIES.map((currency) => (
                      <MenuItem key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Quantity and Price (only for BUY/SELL) */}
              {needsQuantityPrice && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      💰 Detalhes Financeiros
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Quantidade"
                      type="number"
                      value={formData.quantity || ''}
                      onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)}
                      error={!!errors.quantity}
                      helperText={errors.quantity}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Calculate />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Preço Unitário"
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
                      error={!!errors.price}
                      helperText={errors.price}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {selectedCurrency?.symbol || 'R$'}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={autoCalculate}
                            onChange={(e) => setAutoCalculate(e.target.checked)}
                            size="small"
                          />
                        }
                        label="Auto-calcular"
                        sx={{ m: 0 }}
                      />
                    </Box>
                    <TextField
                      fullWidth
                      label="Valor Total"
                      type="number"
                      value={formData.total_amount || ''}
                      onChange={(e) => handleFieldChange('total_amount', parseFloat(e.target.value) || 0)}
                      error={!!errors.total_amount}
                      helperText={errors.total_amount}
                      disabled={autoCalculate}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {selectedCurrency?.symbol || 'R$'}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </>
              )}

              {/* Total Amount (for non-BUY/SELL transactions) */}
              {!needsQuantityPrice && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Valor Total"
                    type="number"
                    value={formData.total_amount || ''}
                    onChange={(e) => handleFieldChange('total_amount', parseFloat(e.target.value) || 0)}
                    error={!!errors.total_amount}
                    helperText={errors.total_amount}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {selectedCurrency?.symbol || 'R$'}
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}

              {/* Advanced Options */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 2,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                  }}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                    ⚙️ Opções Avançadas
                  </Typography>
                  {showAdvanced ? <ExpandLess /> : <ExpandMore />}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Collapse in={showAdvanced}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Taxas"
                        type="number"
                        value={formData.fees || ''}
                        onChange={(e) => handleFieldChange('fees', parseFloat(e.target.value) || 0)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {selectedCurrency?.symbol || 'R$'}
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Impostos"
                        type="number"
                        value={formData.taxes || ''}
                        onChange={(e) => handleFieldChange('taxes', parseFloat(e.target.value) || 0)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {selectedCurrency?.symbol || 'R$'}
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {formData.currency !== 'BRL' && (
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Taxa de Câmbio"
                          type="number"
                          value={formData.exchange_rate || ''}
                          onChange={(e) => handleFieldChange('exchange_rate', parseFloat(e.target.value) || 1)}
                          helperText={`1 ${formData.currency} = ${formData.exchange_rate} BRL`}
                        />
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Observações"
                        multiline
                        rows={2}
                        value={formData.notes || ''}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        placeholder="Adicione observações sobre esta transação..."
                      />
                    </Grid>
                  </Grid>
                </Collapse>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={onClose} 
              variant="outlined"
              size="large"
              sx={{ borderRadius: 2 }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={saveMutation.isPending}
              sx={{
                borderRadius: 2,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                minWidth: 120,
              }}
            >
              {saveMutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                transaction ? 'Atualizar' : 'Criar Transação'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}
