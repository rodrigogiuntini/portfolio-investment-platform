import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Avatar,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,

  TextField,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Autocomplete,
  InputAdornment,
  Divider,
  Alert,
  Slide,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  FormHelperText,
  Checkbox,
  Select,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Timeline,
  Assessment,
  Refresh,
  GetApp,
  Edit,
  Visibility,
  VisibilityOff,
  Star,
  StarBorder,
  MoreVert,
  Add,
  FilterList,
  Search,
  Close,
  CheckCircle,

  CalendarToday,
  AttachMoney,
  TrendingFlat,

  Calculate,
  MonetizationOn,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,

  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import api from '../services/api';

interface Portfolio {
  id: number;
  name: string;
  description?: string;
  currency: string;
  benchmark: string;
  created_at: string;
  total_value: number;
  total_invested: number;
  total_return: number;
  total_return_percentage: number;
}

interface Position {
  id: number;
  portfolio_id: number;
  asset_id: number;
  quantity: number;
  average_price: number;
  current_price: number;
  total_invested: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  dividends_received: number;
  last_updated: string;
  asset: {
    id: number;
    symbol: string;
    name: string;
    asset_type: string;
    sector: string;
    exchange: string;
    currency: string;
    current_price: number;
  };
}

interface PerformanceData {
  date: string;
  portfolio_value: number;
  benchmark_value: number;
  daily_return: number;
}

interface Asset {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  sector: string;
  exchange: string;
  currency: string;
  current_price: number;
}

interface NewPositionForm {
  asset: Asset | null;
  transactionType: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  date: string;
  fees: number;
  taxes: number;
  notes: string;
  useCurrentPrice: boolean;
  // Rendimento (novo campo)
  yield: {
    enabled: boolean;
    type: string;
    amountPerShare: number;
    paymentDate: string;
    frequency: string;
    isRecurring: boolean;
    notes: string;
  };
}

const TRANSACTION_TYPES = [
  { value: 'BUY', label: 'Compra', icon: TrendingUp, color: 'success' },
  { value: 'SELL', label: 'Venda', icon: TrendingDown, color: 'error' },
];

const YIELD_TYPES = [
  { value: 'dividend', label: 'Dividendo' },
  { value: 'jcp', label: 'Juros sobre Capital Próprio (JCP)' },
  { value: 'coupon', label: 'Cupom' },
  { value: 'rent', label: 'Aluguel de Ação' },
  { value: 'bonus', label: 'Bonificação' },
  { value: 'other', label: 'Outro' },
];

const YIELD_FREQUENCIES = [
  { value: 'eventual', label: 'Eventual' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#00796b'];

function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

const Transition = React.forwardRef(function Transition(props: any, ref: any) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function PortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [showHiddenValues, setShowHiddenValues] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados do modal de nova posição
  const [openNewPosition, setOpenNewPosition] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<NewPositionForm>({
    asset: null,
    transactionType: 'BUY',
    quantity: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    fees: 0,
    taxes: 0,
    notes: '',
    useCurrentPrice: true,
    yield: {
      enabled: false,
      type: 'dividend',
      amountPerShare: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      frequency: 'eventual',
      isRecurring: false,
      notes: '',
    },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados do modal de venda
  const [openSellModal, setOpenSellModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [sellFormData, setSellFormData] = useState({
    quantity: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    fees: 0,
    taxes: 0,
    notes: '',
  });
  const [isSellSubmitting, setIsSellSubmitting] = useState(false);

  // Estados do modal de histórico
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [selectedAssetHistory, setSelectedAssetHistory] = useState<any>(null);
  const [assetTransactions, setAssetTransactions] = useState<any[]>([]);
  const [assetDividends, setAssetDividends] = useState<any[]>([]);
  const [assetPrices, setAssetPrices] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [openFilters, setOpenFilters] = useState(false);
  const [filters, setFilters] = useState({
    sector: '',
    assetType: '',
    performance: '', // 'profit', 'loss', 'all'
    minValue: '',
    maxValue: '',
    sortBy: 'symbol', // 'symbol', 'value', 'return', 'allocation'
    sortOrder: 'asc' // 'asc', 'desc'
  });

  // Estado para controle do período do gráfico
  const [selectedPeriod, setSelectedPeriod] = useState('6M');

  // Funções de manipulação do formulário
  const handleOpenNewPosition = () => {
    setOpenNewPosition(true);
    setActiveStep(0);
    setFormData({
      asset: null,
      transactionType: 'BUY',
      quantity: 0,
      price: 0,
      date: new Date().toISOString().split('T')[0],
      fees: 0,
      taxes: 0,
      notes: '',
      useCurrentPrice: true,
      yield: {
        enabled: false,
        type: 'dividend',
        amountPerShare: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        frequency: 'eventual',
        isRecurring: false,
        notes: '',
      },
    });
    setFormErrors({});
  };

  const handleCloseNewPosition = () => {
    setOpenNewPosition(false);
    setActiveStep(0);
    setIsSubmitting(false);
  };

  const updateFormData = (field: keyof NewPositionForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-atualizar preço quando asset é selecionado e useCurrentPrice está ativo
    if (field === 'asset' && value && formData.useCurrentPrice) {
      setFormData(prev => ({ ...prev, price: value.current_price }));
    }
    
    // Limpar erro do campo quando alterado
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateYieldData = (field: keyof NewPositionForm['yield'], value: any) => {
    setFormData(prev => ({
      ...prev,
      yield: { ...prev.yield, [field]: value }
    }));
    
    // Limpar erro do campo quando alterado
    if (formErrors[`yield.${field}`]) {
      setFormErrors(prev => ({ ...prev, [`yield.${field}`]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Seleção do ativo
        if (!formData.asset) {
          errors.asset = 'Selecione um ativo';
        }
        break;
      
      case 1: // Detalhes da transação
        if (formData.quantity <= 0) {
          errors.quantity = 'Quantidade deve ser maior que 0';
        }
        if (formData.price <= 0) {
          errors.price = 'Preço deve ser maior que 0';
        }
        if (!formData.date) {
          errors.date = 'Data é obrigatória';
        }
        if (formData.fees < 0) {
          errors.fees = 'Taxas não podem ser negativas';
        }
        if (formData.taxes < 0) {
          errors.taxes = 'Impostos não podem ser negativos';
        }
        
        // Validação dos campos de rendimento se habilitado
        if (formData.yield.enabled) {
          if (formData.yield.amountPerShare <= 0) {
            errors['yield.amountPerShare'] = 'Valor por ação deve ser maior que 0';
          }
          if (!formData.yield.paymentDate) {
            errors['yield.paymentDate'] = 'Data de pagamento é obrigatória';
          }
          if (!formData.yield.type) {
            errors['yield.type'] = 'Tipo de rendimento é obrigatório';
          }
        }
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const calculateTotalValue = () => {
    return formData.quantity * formData.price + formData.fees + formData.taxes;
  };

  // Função para determinar o tipo de ativo baseado no símbolo
  const determineAssetType = (symbol: string) => {
    if (!symbol) return 'STOCK';
    
    const upperSymbol = symbol.toUpperCase();
    
    // FIIs brasileiros terminam em 11
    if (upperSymbol.endsWith('11')) {
      return 'FUND';
    }
    
    // Ações brasileiras terminam em 3, 4, 5, 6, 7, 8
    if (upperSymbol.match(/[3-8]$/) && upperSymbol.length >= 5) {
      return 'STOCK';
    }
    
    // ETFs brasileiros
    if (upperSymbol.includes('ETF') || upperSymbol.startsWith('B3SA')) {
      return 'ETF';
    }
    
    // Tesouro direto
    if (upperSymbol.includes('TESOURO') || upperSymbol.includes('LFT') || upperSymbol.includes('NTN')) {
      return 'BOND';
    }
    
    // Criptomoedas
    if (['BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'DOT', 'MATIC'].includes(upperSymbol)) {
      return 'CRYPTO';
    }
    
    // Default para stock
    return 'STOCK';
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    setIsSubmitting(true);
    
    try {
      // Primeiro, criar o ativo se não existir
      let assetId = null;
      
      // Buscar se o ativo já existe no backend
      try {
        const existingAssetsResponse = await api.get('/api/assets/', {
          params: { search: formData.asset?.symbol }
        });
        
        const existingAsset = existingAssetsResponse.data.find(
          (asset: any) => asset.symbol === formData.asset?.symbol
        );
        
        if (existingAsset) {
          assetId = existingAsset.id;
          console.log('Asset já existe:', existingAsset);
        } else {
          // Criar novo ativo
          const detectedType = determineAssetType(formData.asset?.symbol || '');
          console.log('🔍 Símbolo:', formData.asset?.symbol);
          console.log('🎯 Tipo detectado:', detectedType);
          
          const assetData = {
            symbol: formData.asset?.symbol,
            name: formData.asset?.name,
            asset_type: detectedType, // Tipo detectado automaticamente
            sector: formData.asset?.sector,
            exchange: formData.asset?.exchange,
            currency: formData.asset?.currency || 'USD',
          };
          
          console.log('📊 Dados completos do asset:', assetData);
          const assetResponse = await api.post('/api/assets/', assetData);
          assetId = assetResponse.data.id;
          console.log('Asset criado:', assetResponse.data);
        }
        
        // Validar se temos um assetId válido
        if (!assetId) {
          throw new Error('Não foi possível obter ID do ativo');
        }
        
      } catch (assetError: any) {
        console.error('Erro ao criar/buscar ativo:', assetError);
        console.error('Detalhes do erro:', {
          status: assetError.response?.status,
          statusText: assetError.response?.statusText,
          data: assetError.response?.data,
          message: assetError.message
        });
        
        let assetErrorMessage = 'Erro desconhecido';
        if (assetError.response?.data?.detail) {
          if (Array.isArray(assetError.response.data.detail)) {
            assetErrorMessage = assetError.response.data.detail.map((err: any) => 
              `${err.loc?.slice(-1)[0] || 'campo'}: ${err.msg}`
            ).join(', ');
          } else {
            assetErrorMessage = assetError.response.data.detail;
          }
        } else if (assetError.message) {
          assetErrorMessage = assetError.message;
        }
        
        throw new Error('Erro ao processar ativo: ' + assetErrorMessage);
      }

      // Criar transação
      const transactionData = {
        portfolio_id: Number(id),
        asset_id: assetId,
        transaction_type: formData.transactionType, // Keep lowercase (buy/sell)
        date: formData.date,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        total_amount: Number(formData.quantity) * Number(formData.price),
        fees: Number(formData.fees || 0),
        taxes: Number(formData.taxes || 0),
        currency: formData.asset?.currency || 'BRL',
        exchange_rate: 1.0,
        notes: formData.notes || null,
      };

      console.log('Dados da transação sendo enviados:', transactionData);

      const response = await api.post('/api/transactions/', transactionData);
      
      console.log('Transação criada com sucesso:', response.data);
      
      // Se o rendimento está habilitado, criar dividendo
      if (formData.yield.enabled && formData.transactionType === 'BUY') {
        console.log('🎯 Criando dividendo - yield habilitado:', formData.yield);
        try {
          // Buscar a posição criada/atualizada
          console.log('📊 Buscando posições para portfolio:', id);
          const positionsResponse = await api.get(`/api/portfolios/${id}/positions`);
          console.log('📊 Posições encontradas:', positionsResponse.data);
          
          const position = positionsResponse.data.find((pos: any) => pos.asset_id === assetId);
          console.log('🔍 Posição encontrada para asset_id', assetId, ':', position);
          
          if (position) {
            const dividendData = {
              portfolio_id: Number(id),
              asset_id: assetId,
              position_id: position.id,
              dividend_type: formData.yield.type,
              amount_per_share: Number(formData.yield.amountPerShare),
              shares_quantity: Number(formData.quantity),
              payment_date: formData.yield.paymentDate,
              frequency: formData.yield.frequency,
              is_recurring: formData.yield.isRecurring,
              notes: formData.yield.notes || null,
              gross_amount: Number(formData.yield.amountPerShare) * Number(formData.quantity),
              tax_amount: 0, // Por padrão sem imposto, usuário pode editar depois
            };
            
            console.log('💰 Dados do dividendo sendo enviados:', dividendData);
            const dividendResponse = await api.post('/api/dividends/', dividendData);
            console.log('✅ Dividendo criado com sucesso:', dividendResponse.data);
          } else {
            console.error('❌ Posição não encontrada para asset_id:', assetId);
          }
        } catch (dividendError: any) {
          console.error('❌ Erro ao criar dividendo:', dividendError);
          console.error('❌ Detalhes do erro:', {
            message: dividendError.message,
            response: dividendError.response?.data,
            status: dividendError.response?.status
          });
          // Não falhar a operação se o dividendo não for criado
        }
      } else {
        console.log('⚠️ Dividendo não será criado:', {
          yieldEnabled: formData.yield.enabled,
          transactionType: formData.transactionType
        });
      }
      
      handleCloseNewPosition();
      
      // Invalidar queries para atualizar automaticamente todas as seções
      // Como não temos queryClient aqui, vamos usar window.location.reload() temporariamente
      // TODO: Implementar queryClient.invalidateQueries quando disponível
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error: any) {
      console.error('Erro ao criar transação:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Extract more specific error message
      let errorMessage = 'Erro ao criar posição. Tente novamente.';
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Handle validation errors array
          const validationErrors = error.response.data.detail.map((err: any) => {
            const field = err.loc?.slice(-1)[0] || 'campo';
            return `${field}: ${err.msg}`;
          }).join(', ');
          errorMessage = `Erro de validação: ${validationErrors}`;
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('Dados que seriam enviados (com correção de enums):', {
        portfolio_id: Number(id),
        asset_id: 'N/A (erro na criação do asset)',
        transaction_type: formData.transactionType.toUpperCase(),
        date: formData.date,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        total_amount: Number(formData.quantity) * Number(formData.price),
        fees: Number(formData.fees || 0),
        taxes: Number(formData.taxes || 0),
        currency: formData.asset?.currency || 'BRL',
        exchange_rate: 1.0,
        notes: formData.notes || null,
      });
      
      alert(`Erro: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções do modal de venda
  const handleSellClick = (position: any) => {
    setSelectedPosition(position);
    setSellFormData({
      quantity: position.quantity, // Quantidade máxima disponível
      price: position.current_price || position.average_price, // Preço atual ou médio
      date: new Date().toISOString().split('T')[0],
      fees: 0,
      taxes: 0,
      notes: '',
    });
    setOpenSellModal(true);
  };

  const handleCloseSellModal = () => {
    setOpenSellModal(false);
    setSelectedPosition(null);
    setIsSellSubmitting(false);
  };

  const handleSellSubmit = async () => {
    if (!selectedPosition) return;

    setIsSellSubmitting(true);
    
    try {
      const transactionData = {
        portfolio_id: Number(id),
        asset_id: selectedPosition.asset_id,
        transaction_type: 'SELL',
        date: sellFormData.date,
        quantity: Number(sellFormData.quantity),
        price: Number(sellFormData.price),
        total_amount: Number(sellFormData.quantity) * Number(sellFormData.price),
        fees: Number(sellFormData.fees || 0),
        taxes: Number(sellFormData.taxes || 0),
        currency: selectedPosition.asset.currency || 'BRL',
        exchange_rate: 1.0,
        notes: sellFormData.notes || null,
      };

      console.log('Dados da venda sendo enviados:', transactionData);

      const response = await api.post('/api/transactions/', transactionData);
      
      console.log('Venda criada com sucesso:', response.data);
      
      // Recarregar dados
      window.location.reload();
      
      handleCloseSellModal();
    } catch (error: any) {
      console.error('Erro ao processar venda:', error);
      
      let errorMessage = 'Erro inesperado ao processar venda.';
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = `Erro: ${error.response.data.detail}`;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = `Erro de validação: ${error.response.data.detail.map((e: any) => e.msg).join(', ')}`;
        }
      }
      
      alert(`Erro: ${errorMessage}`);
    } finally {
      setIsSellSubmitting(false);
    }
  };

  // Funções do modal de histórico
  const handleAssetClick = async (position: any) => {
    console.log('🔍 Abrindo histórico para posição:', position);
    setSelectedAssetHistory(position);
    setOpenHistoryModal(true);
    setHistoryLoading(true);

    try {
      // Debug completo da posição selecionada
      console.log('🔍 POSIÇÃO COMPLETA:', position);
      console.log('🔍 Asset ID:', position.asset_id);
      console.log('🔍 Portfolio ID:', id);
      
      // URLs que serão chamadas
      const transactionsUrl = `/api/transactions/?asset_id=${position.asset_id}&portfolio_id=${id}`;
      const dividendsUrl = `/api/dividends/?asset_id=${position.asset_id}&portfolio_id=${id}`;
      const pricesUrl = `/api/assets/${position.asset_id}/prices?limit=30`;
      
      console.log('🌐 URLs que serão chamadas:');
      console.log('📊 Transações:', transactionsUrl);
      console.log('💰 Dividendos:', dividendsUrl);
      console.log('📈 Preços:', pricesUrl);

      // Buscar transações do ativo
      console.log('📊 === BUSCANDO TRANSAÇÕES ===');
      console.log('📊 URL:', transactionsUrl);
      
      let transactionsResponse;
      try {
        transactionsResponse = await api.get(transactionsUrl);
        console.log('📊 ✅ Resposta recebida:', transactionsResponse);
        console.log('📊 ✅ Status:', transactionsResponse.status);
        console.log('📊 ✅ Headers:', transactionsResponse.headers);
        console.log('📊 ✅ Data:', transactionsResponse.data);
        console.log('📊 ✅ Quantidade de transações:', transactionsResponse.data?.length || 0);
        setAssetTransactions(transactionsResponse.data || []);
      } catch (transactionError: any) {
        console.error('📊 ❌ ERRO NAS TRANSAÇÕES:', transactionError);
        console.error('📊 ❌ Status:', transactionError?.response?.status);
        console.error('📊 ❌ Data:', transactionError?.response?.data);
        console.error('📊 ❌ Message:', transactionError?.message);
        setAssetTransactions([]);
      }

      // Buscar dividendos do ativo
      console.log('💰 === BUSCANDO DIVIDENDOS ===');
      console.log('💰 URL:', dividendsUrl);
      
      let dividendsResponse;
      try {
        dividendsResponse = await api.get(dividendsUrl);
        console.log('💰 ✅ Resposta recebida:', dividendsResponse);
        console.log('💰 ✅ Status:', dividendsResponse.status);
        console.log('💰 ✅ Data:', dividendsResponse.data);
        console.log('💰 ✅ Quantidade de dividendos:', dividendsResponse.data?.length || 0);
        setAssetDividends(dividendsResponse.data || []);
      } catch (dividendError: any) {
        console.error('💰 ❌ ERRO NOS DIVIDENDOS:', dividendError);
        console.error('💰 ❌ Status:', dividendError?.response?.status);
        console.error('💰 ❌ Data:', dividendError?.response?.data);
        console.error('💰 ❌ Message:', dividendError?.message);
        setAssetDividends([]);
      }

      // Buscar histórico de preços do ativo
      console.log('📈 === BUSCANDO PREÇOS ===');
      console.log('📈 URL:', pricesUrl);
      
      let pricesResponse;
      try {
        pricesResponse = await api.get(pricesUrl);
        console.log('📈 ✅ Resposta recebida:', pricesResponse);
        console.log('📈 ✅ Status:', pricesResponse.status);
        console.log('📈 ✅ Data:', pricesResponse.data);
        console.log('📈 ✅ Quantidade de preços:', pricesResponse.data?.length || 0);
        setAssetPrices(pricesResponse.data || []);
      } catch (priceError: any) {
        console.error('📈 ❌ ERRO NOS PREÇOS:', priceError);
        console.error('📈 ❌ Status:', priceError?.response?.status);
        console.error('📈 ❌ Data:', priceError?.response?.data);
        console.error('📈 ❌ Message:', priceError?.message);
        setAssetPrices([]);
      }

      console.log('🎯 === RESUMO FINAL ===');
      console.log('📊 Transações carregadas:', transactionsResponse?.data?.length || 0);
      console.log('💰 Dividendos carregados:', dividendsResponse?.data?.length || 0);
      console.log('📈 Preços carregados:', pricesResponse?.data?.length || 0);
      
    } catch (error: any) {
      console.error('❌ === ERRO GERAL ===');
      console.error('❌ Erro:', error);
      console.error('❌ Message:', error?.message);
      console.error('❌ Response:', error?.response);
      console.error('❌ Stack:', error?.stack);
      setAssetTransactions([]);
      setAssetDividends([]);
      setAssetPrices([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setOpenHistoryModal(false);
    setSelectedAssetHistory(null);
    setAssetTransactions([]);
    setAssetDividends([]);
    setAssetPrices([]);
    setHistoryLoading(false);
  };

  // Funções de busca e filtros
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (filterKey: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      sector: '',
      assetType: '',
      performance: '',
      minValue: '',
      maxValue: '',
      sortBy: 'symbol',
      sortOrder: 'asc'
    });
    setSearchTerm('');
  };

  // Funções dos ícones de ação
  const handleExportReport = async () => {
    try {
      setIsRefreshing(true);
      
      // Gerar dados do relatório
      const reportData = {
        portfolio: currentPortfolio,
        positions: positions,
        generatedAt: new Date().toISOString(),
        totalValue: positions.reduce((sum, pos) => sum + (pos.current_value || 0), 0),
        totalInvested: positions.reduce((sum, pos) => sum + (pos.total_invested || 0), 0),
        totalReturn: positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0)
      };
      
      // Criar conteúdo do relatório
      const reportContent = `
# RELATÓRIO DE INVESTIMENTOS
**Portfolio:** ${currentPortfolio?.name}
**Data:** ${new Date().toLocaleDateString('pt-BR')}

## RESUMO
- **Valor Total:** ${formatCurrency(reportData.totalValue)}
- **Total Investido:** ${formatCurrency(reportData.totalInvested)}
- **Retorno Total:** ${formatCurrency(reportData.totalReturn)}
- **Rentabilidade:** ${((reportData.totalReturn / reportData.totalInvested) * 100).toFixed(2)}%

## POSIÇÕES
${positions.map(pos => `
### ${pos.asset.symbol} - ${pos.asset.name}
- **Quantidade:** ${pos.quantity}
- **Preço Médio:** ${formatCurrency(pos.average_price)}
- **Valor Atual:** ${formatCurrency(pos.current_value || 0)}
- **Retorno:** ${formatCurrency(pos.unrealized_pnl || 0)}
`).join('')}
      `;
      
      // Criar e baixar arquivo
      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${currentPortfolio?.name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Feedback para o usuário
      alert('✅ Relatório exportado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('❌ Erro ao exportar relatório. Tente novamente.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditPortfolio = () => {
    // Navegar para página de edição ou abrir modal
    const portfolioName = prompt('Digite o novo nome do portfólio:', currentPortfolio?.name);
    if (portfolioName && portfolioName.trim()) {
      // Aqui seria feita a chamada para a API para atualizar o nome
      alert(`✅ Portfólio renomeado para: "${portfolioName.trim()}"`);
      // TODO: Implementar chamada real da API
      // updatePortfolio(id, { name: portfolioName.trim() });
    }
  };

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);
      
      // Simular refresh dos dados
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Forçar reload da página para atualizar todos os dados
      window.location.reload();
      
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      alert('❌ Erro ao atualizar dados. Tente novamente.');
    } finally {
      setIsRefreshing(false);
    }
  };



  // Adicionar CSS para animação
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spin-animation {
        animation: spin 2s linear infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Query para buscar dados do portfólio
  const { data: portfolio, isLoading: portfolioLoading, isFetching: portfolioFetching } = useQuery<Portfolio>({
    queryKey: ['portfolio', id],
    queryFn: async () => {
      const response = await api.get(`/api/portfolios/${id}`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Query para buscar posições do portfólio
  const { data: positions, isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['positions', id],
    queryFn: async () => {
      const response = await api.get(`/api/portfolios/${id}/positions`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  // Mapear período para dias
  const periodToDays: Record<string, number> = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1A': 365
  };

  // Query para buscar dados de performance
  const { data: performanceData, isLoading: performanceLoading } = useQuery<any>({
    queryKey: ['performance', id, selectedPeriod],
    queryFn: async () => {
      const days = periodToDays[selectedPeriod] || 180;
      const response = await api.get(`/api/portfolios/${id}/performance?period_days=${days}`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 60000, // Performance atualiza a cada minuto
  });

  // Query para buscar alocação
  const { data: allocationData, isLoading: allocationLoading } = useQuery<any>({
    queryKey: ['allocation', id],
    queryFn: async () => {
      const response = await api.get(`/api/portfolios/${id}/allocation`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  // Query para buscar ativos apenas via API externa (sem banco de dados)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isFetching: isSearching } = useQuery<Asset[]>({
    queryKey: ['asset-search', debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) return [];
      const response = await api.get(`/api/assets/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
      return response.data;
    },
    enabled: debouncedSearchQuery.length >= 2,
    staleTime: 30000, // 30 seconds
  });

  // Use only API search results - no local database assets
  const combinedAssets = useMemo(() => {
    // If user hasn't typed anything (less than 2 chars), show empty array
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
      return [];
    }
    
    // Return only external API results
    return searchResults || [];
  }, [searchResults, debouncedSearchQuery]);

  const currentPortfolio = portfolio;
  const isPositive = currentPortfolio?.total_return ? currentPortfolio.total_return >= 0 : false;

  // Filtrar e ordenar posições
  const filteredAndSortedPositions = useMemo(() => {
    if (!positions) return [];

    let filtered = positions.filter(position => {
      // Busca por texto
      const matchesSearch = !searchTerm || 
        position.asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (position.asset.sector && position.asset.sector.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por setor
      const matchesSector = !filters.sector || 
        (position.asset.sector && position.asset.sector.toLowerCase() === filters.sector.toLowerCase());

      // Filtro por tipo de ativo
      const matchesAssetType = !filters.assetType || 
        position.asset.asset_type.toLowerCase() === filters.assetType.toLowerCase();

      // Filtro por performance
      const totalReturn = position.unrealized_pnl + position.realized_pnl;
      const matchesPerformance = !filters.performance || 
        (filters.performance === 'profit' && totalReturn >= 0) ||
        (filters.performance === 'loss' && totalReturn < 0) ||
        filters.performance === 'all';

      // Filtro por valor
      const matchesMinValue = !filters.minValue || 
        position.current_value >= parseFloat(filters.minValue);
      
      const matchesMaxValue = !filters.maxValue || 
        position.current_value <= parseFloat(filters.maxValue);

      return matchesSearch && matchesSector && matchesAssetType && 
             matchesPerformance && matchesMinValue && matchesMaxValue;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'symbol':
          aValue = a.asset.symbol;
          bValue = b.asset.symbol;
          break;
        case 'value':
          aValue = a.current_value;
          bValue = b.current_value;
          break;
        case 'return':
          aValue = a.unrealized_pnl + a.realized_pnl;
          bValue = b.unrealized_pnl + b.realized_pnl;
          break;
        case 'allocation':
          aValue = currentPortfolio?.total_value ? (a.current_value / currentPortfolio.total_value) * 100 : 0;
          bValue = currentPortfolio?.total_value ? (b.current_value / currentPortfolio.total_value) * 100 : 0;
          break;
        default:
          aValue = a.asset.symbol;
          bValue = b.asset.symbol;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return filters.sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [positions, searchTerm, filters, currentPortfolio]);

  // Simular loading com useEffect não é mais necessário
  const [isPageLoading, setIsPageLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-redirect when portfolio is not found
  useEffect(() => {
    if (!portfolioLoading && !currentPortfolio && id) {
      console.log('Portfolio not found, redirecting to portfolios list');
      setTimeout(() => {
        navigate('/portfolios', { replace: true });
      }, 1000);
    }
  }, [portfolioLoading, currentPortfolio, id, navigate]);

  if (portfolioLoading || positionsLoading || isPageLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 3 }} />
      </Box>
    );
  }

  if (!currentPortfolio && !portfolioLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
        >
          Portfólio não encontrado. Redirecionando para a lista de portfólios...
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/portfolios', { replace: true })}
          sx={{ mt: 2 }}
        >
          Ir para Portfólios Agora
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header com navegação e ações */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Voltar para Portfólios">
              <IconButton onClick={() => navigate('/portfolios')} sx={{ mr: 1 }}>
                <ArrowBack />
              </IconButton>
            </Tooltip>
            
            <Avatar
              sx={{
                bgcolor: theme.palette.primary.main,
                width: 48,
                height: 48,
                fontSize: '1.2rem',
                fontWeight: 'bold',
              }}
            >
              {currentPortfolio.name.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" fontWeight="bold">
                  {currentPortfolio.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setIsFavorite(!isFavorite)}
                  sx={{ color: isFavorite ? 'warning.main' : 'text.secondary' }}
                >
                  {isFavorite ? <Star /> : <StarBorder />}
                </IconButton>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {currentPortfolio.description}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  size="small"
                  label="Tempo Real"
                  color="success"
                  icon={<Timeline />}
                />
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5,
            alignItems: 'center'
          }}>
            <Tooltip title={showHiddenValues ? 'Ocultar valores' : 'Mostrar valores'} arrow>
              <IconButton 
                onClick={() => setShowHiddenValues(!showHiddenValues)}
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
                {showHiddenValues ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Exportar relatório PDF" arrow>
              <IconButton 
                onClick={handleExportReport}
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
                  transition: 'all 0.2s ease'
                }}
              >
                <GetApp />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Editar portfólio" arrow>
              <IconButton 
                onClick={handleEditPortfolio}
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
                <Edit />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Atualizar dados" arrow>
              <IconButton 
                onClick={handleRefreshData}
                disabled={isRefreshing}
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  backdropFilter: 'blur(8px)',
                  '&:hover': { 
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    borderColor: theme.palette.info.main,
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
                <Refresh 
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
      </Box>

      {/* Métricas principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Zoom in timeout={500}>
            <Card elevation={2} sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                    Valor Total
                  </Typography>
                  <AccountBalance sx={{ opacity: 0.8 }} />
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {showHiddenValues ? formatCurrency(currentPortfolio.total_value, currentPortfolio.currency) : '••••••'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                  Atualizado agora
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Zoom in timeout={700}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Retorno Total
                  </Typography>
                  {isPositive ? (
                    <TrendingUp sx={{ color: 'success.main' }} />
                  ) : (
                    <TrendingDown sx={{ color: 'error.main' }} />
                  )}
                </Box>
                <Typography 
                  variant="h5" 
                  fontWeight="bold"
                  sx={{ color: isPositive ? 'success.main' : 'error.main' }}
                >
                  {showHiddenValues ? formatCurrency(currentPortfolio.total_return, currentPortfolio.currency) : '••••••'}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ color: isPositive ? 'success.main' : 'error.main', mt: 1 }}
                >
                  {showHiddenValues ? formatPercentage(currentPortfolio.total_return_percentage) : '••••'}
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Zoom in timeout={900}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Investimento
                  </Typography>
                  <ShowChart sx={{ color: 'info.main' }} />
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {showHiddenValues ? formatCurrency(currentPortfolio.total_invested, currentPortfolio.currency) : '••••••'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Capital aportado
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Zoom in timeout={1100}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Posições
                  </Typography>
                  <Assessment sx={{ color: 'secondary.main' }} />
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {positions?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Posições ativas
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>
      </Grid>

      {/* Gráficos e análises */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Fade in timeout={1000}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Evolução do Portfólio
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['1M', '3M', '6M', '1A'].map((period) => (
                      <Button 
                        key={period}
                        variant={selectedPeriod === period ? "contained" : "outlined"} 
                        size="small"
                        sx={{ 
                          minWidth: 'auto', 
                          px: 2,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                        onClick={() => setSelectedPeriod(period)}
                        disabled={performanceLoading}
                      >
                        {period}
                    </Button>
                    ))}
                  </Box>
                </Box>
                
{performanceLoading ? (
                  <Box sx={{ position: 'relative', height: 300 }}>
                  <Skeleton variant="rectangular" width="100%" height={300} />
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: alpha(theme.palette.background.paper, 0.8),
                        padding: 2,
                        borderRadius: 2
                      }}
                    >
                      <CircularProgress size={24} />
                      <Typography variant="body2" color="text.secondary">
                        Carregando dados de mercado...
                      </Typography>
                    </Box>
                  </Box>
                ) : performanceData && performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                      <XAxis 
                        dataKey="formatted_date" 
                        stroke={theme.palette.text.secondary}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value || ''}
                      />
                      <YAxis 
                        stroke={theme.palette.text.secondary}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(value, currentPortfolio?.currency || 'BRL')}
                      />
                      <RechartsTooltip 
                        formatter={(value: any) => [
                          formatCurrency(value, currentPortfolio?.currency || 'BRL'),
                          'Valor do Portfólio'
                        ]}
                        labelFormatter={(label) => {
                          // Encontra o item de dados correspondente para obter a data completa
                          const dataItem = performanceData.find((item: any) => item.formatted_date === label);
                          if (dataItem) {
                            const date = new Date(dataItem.date);
                            return `Data: ${date.toLocaleDateString('pt-BR')}`;
                          }
                          return `Data: ${label}`;
                        }}
                        contentStyle={{
                          backgroundColor: alpha(theme.palette.background.paper, 0.95),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          borderRadius: 8,
                          backdropFilter: 'blur(8px)'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={theme.palette.primary.main}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPortfolio)"
                        dot={false}
                        activeDot={{ 
                          r: 6, 
                          fill: theme.palette.primary.main,
                          stroke: theme.palette.background.paper,
                          strokeWidth: 2 
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'text.secondary' }}>
                    <ShowChart sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" gutterBottom>
                      📈 Dados de performance em tempo real!
                    </Typography>
                    <Typography variant="body2" textAlign="center" sx={{ mb: 2 }}>
                      Adicione transações para ver a evolução do seu portfólio com dados reais de mercado.
                    </Typography>
                    <Chip 
                      label="🚀 API Alpha Vantage" 
                      color="primary" 
                      variant="outlined" 
                      size="small"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Fade in timeout={1200}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Alocação por Setor
                </Typography>
                
{allocationLoading ? (
                  <Skeleton variant="rectangular" width="100%" height={300} />
                ) : positions && positions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={positions.map(position => ({
                          name: position.asset.symbol,
                          sector: position.asset.sector,
                          value: position.current_value,
                          percentage: currentPortfolio.total_value > 0 
                            ? (position.current_value / currentPortfolio.total_value) * 100 
                            : 0
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="percentage"
                        label={({ sector, percentage }) => `${sector}: ${percentage.toFixed(1)}%`}
                      >
                        {positions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma posição para mostrar alocação. Adicione transações primeiro.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      </Grid>

      {/* Tabela de posições */}
      <Fade in timeout={1400}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Posições do Portfólio
              </Typography>
              <Box>
                <Button 
                  startIcon={<Add />} 
                  variant="contained" 
                  size="small" 
                  sx={{ mr: 1 }}
                  onClick={handleOpenNewPosition}
                >
                  Nova Posição
                </Button>
                <Tooltip title="Filtros Avançados" arrow>
                  <IconButton 
                    onClick={() => setOpenFilters(true)}
                    sx={{ 
                      bgcolor: Object.values(filters).some(v => v && v !== 'symbol' && v !== 'asc') 
                        ? alpha(theme.palette.primary.main, 0.1) 
                        : alpha(theme.palette.background.paper, 0.8),
                      border: `1px solid ${Object.values(filters).some(v => v && v !== 'symbol' && v !== 'asc') 
                        ? theme.palette.primary.main 
                        : alpha(theme.palette.divider, 0.2)}`,
                      backdropFilter: 'blur(8px)',
                      '&:hover': { 
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        borderColor: theme.palette.primary.main,
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[2]
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FilterList color={Object.values(filters).some(v => v && v !== 'symbol' && v !== 'asc') ? 'primary' : 'inherit'} />
                </IconButton>
                </Tooltip>
                <Tooltip title="Buscar Ativo" arrow>
                  <IconButton 
                    onClick={() => {
                      // Focus no campo de busca se existir
                      const searchField = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
                      if (searchField) {
                        searchField.focus();
                      }
                    }}
                    sx={{ 
                      bgcolor: searchTerm 
                        ? alpha(theme.palette.primary.main, 0.1) 
                        : alpha(theme.palette.background.paper, 0.8),
                      border: `1px solid ${searchTerm 
                        ? theme.palette.primary.main 
                        : alpha(theme.palette.divider, 0.2)}`,
                      backdropFilter: 'blur(8px)',
                      '&:hover': { 
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        borderColor: theme.palette.primary.main,
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[2]
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Search color={searchTerm ? 'primary' : 'inherit'} />
                </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Campo de Busca */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Buscar por símbolo, nome ou setor..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm('')}
                        sx={{ '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  }
                }}
              />
              
              {/* Indicadores de filtros ativos */}
              {(Object.values(filters).some(v => v && v !== 'symbol' && v !== 'asc') || searchTerm) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    Filtros ativos:
                  </Typography>
                  {searchTerm && (
                    <Chip 
                      label={`Busca: "${searchTerm}"`}
                      size="small"
                      onDelete={() => setSearchTerm('')}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {filters.sector && (
                    <Chip 
                      label={`Setor: ${filters.sector}`}
                      size="small"
                      onDelete={() => handleFilterChange('sector', '')}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {filters.performance && (
                    <Chip 
                      label={`Performance: ${filters.performance === 'profit' ? 'Lucro' : filters.performance === 'loss' ? 'Prejuízo' : 'Todos'}`}
                      size="small"
                      onDelete={() => handleFilterChange('performance', '')}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {(Object.values(filters).some(v => v && v !== 'symbol' && v !== 'asc') || searchTerm) && (
                    <Button
                      size="small"
                      onClick={clearFilters}
                      color="error"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    >
                      Limpar Todos
                    </Button>
                  )}
                </Box>
              )}
            </Box>

            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <TableCell><strong>Ativo</strong></TableCell>
                    <TableCell align="right"><strong>Quantidade</strong></TableCell>
                    <TableCell align="right"><strong>Preço Médio</strong></TableCell>
                    <TableCell align="right"><strong>Preço Atual</strong></TableCell>
                    <TableCell align="right"><strong>Valor de Mercado</strong></TableCell>
                    <TableCell align="right"><strong>Retorno</strong></TableCell>
                    <TableCell align="right"><strong>Alocação</strong></TableCell>
                    <TableCell align="right"><strong>24h</strong></TableCell>
                    <TableCell align="center"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                                <TableBody>
                  {filteredAndSortedPositions && filteredAndSortedPositions.length > 0 ? filteredAndSortedPositions.map((position, index) => {
                    const totalReturn = position.unrealized_pnl + position.realized_pnl;
                    const isPositiveReturn = totalReturn >= 0;
                    const allocationPercentage = currentPortfolio.total_value > 0 
                      ? (position.current_value / currentPortfolio.total_value) * 100 
                      : 0;
                    const returnPercentage = position.total_invested > 0 
                      ? (totalReturn / position.total_invested) * 100 
                      : 0;
                    
                    return (
                      <TableRow 
                        key={position.id}
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': { 
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            transform: 'translateY(-1px)',
                            boxShadow: theme.shadows[2]
                          },
                        }}
                        onClick={(e) => {
                          // Evitar clique se for no botão de vender
                          if (!(e.target as HTMLElement).closest('button')) {
                            handleAssetClick(position);
                          }
                        }}
                      >
                        <TableCell>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 2,
                              p: 1,
                              borderRadius: 2,
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: COLORS[index % COLORS.length],
                                width: 32,
                                height: 32,
                                fontSize: '0.8rem',
                              }}
                            >
                              {position.asset.symbol.substring(0, 2)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                {position.asset.symbol}
                              </Typography>
                                <Chip 
                                  label="Ver Histórico" 
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                  sx={{ 
                                    fontSize: '0.65rem',
                                    height: 18,
                                    opacity: 0.7,
                                    '&:hover': { opacity: 1 }
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {position.asset.name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{position.quantity.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          {showHiddenValues ? formatCurrency(position.average_price, position.asset.currency) : '••••'}
                        </TableCell>
                        <TableCell align="right">
                          {showHiddenValues ? formatCurrency(position.current_price, position.asset.currency) : '••••'}
                        </TableCell>
                        <TableCell align="right">
                          {showHiddenValues ? formatCurrency(position.current_value, position.asset.currency) : '••••••'}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ color: isPositiveReturn ? 'success.main' : 'error.main' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {showHiddenValues ? formatCurrency(totalReturn, position.asset.currency) : '••••'}
                            </Typography>
                            <Typography variant="caption">
                              {showHiddenValues ? formatPercentage(returnPercentage) : '••••'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <LinearProgress
                            variant="determinate"
                            value={allocationPercentage}
                            sx={{ width: 60, mr: 1, display: 'inline-block' }}
                          />
                          {allocationPercentage.toFixed(1)}%
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={showHiddenValues ? "N/A" : '••••'}
                            color="default"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<TrendingDown />}
                            onClick={(e) => {
                              e.stopPropagation(); // Impede o clique na linha
                              handleSellClick(position);
                            }}
                            sx={{ 
                              minWidth: 'auto', 
                              px: 1,
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: theme.shadows[4]
                              }
                            }}
                          >
                            Vender
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma posição encontrada. Clique em "Nova Posição" para adicionar sua primeira transação.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Fade>

      {/* Modal Nova Posição */}
      <Dialog
        open={openNewPosition}
        onClose={handleCloseNewPosition}
        TransitionComponent={Transition}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.shadows[24],
          },
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pb: 1,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add />
            <Typography variant="h6" fontWeight="bold">
              Nova Posição
            </Typography>
          </Box>
          <IconButton 
            onClick={handleCloseNewPosition} 
            size="small"
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Step 1: Seleção do Ativo */}
            <Step>
              <StepLabel>
                <Typography variant="h6" fontWeight="bold">
                  Selecionar Ativo
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Escolha o ativo que deseja adicionar ao seu portfólio
                </Typography>

                <Autocomplete
                  options={combinedAssets}
                  getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
                  value={formData.asset}
                  onChange={(_, newValue) => updateFormData('asset', newValue)}
                  onInputChange={(_, newInputValue) => {
                    setSearchQuery(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar Ativo"
                      placeholder="Digite PETR4, VALE3, AAPL, etc..."
                      error={!!formErrors.asset}
                      helperText={formErrors.asset || "🔍 Busque por símbolo ou nome de ações brasileiras e internacionais"}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {isSearching && <CircularProgress color="inherit" size={20} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 40, height: 40 }}>
                        {option.symbol.substring(0, 2)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold">
                          {option.symbol}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.name} • {option.exchange}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.sector}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          {option.current_price ? formatCurrency(option.current_price, option.currency) : 'N/A'}
                        </Typography>
                        <Chip size="small" label={option.asset_type} variant="outlined" />
                        {!option.id && (
                          <Chip size="small" label="Novo" color="success" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </Box>
                    );
                  }}
                  fullWidth
                  sx={{ mb: 3 }}
                  loading={isSearching}
                  noOptionsText={
                    !searchQuery || searchQuery.length < 2
                      ? "Digite pelo menos 2 caracteres para buscar ativos..."
                      : isSearching
                      ? "Buscando..."
                      : "Nenhum ativo encontrado. Tente outro símbolo."
                  }
                  loadingText="Buscando ativos..."
                  filterOptions={(x) => x} // Disable built-in filtering since we're using API search
                />

                {formData.asset && (
                  <Fade in>
                    <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 48, height: 48 }}>
                          {formData.asset.symbol.substring(0, 2)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight="bold">
                            {formData.asset.symbol}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formData.asset.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip size="small" label={formData.asset.exchange} />
                            <Chip size="small" label={formData.asset.sector} variant="outlined" />
                            <Chip size="small" label={formData.asset.asset_type} color="primary" />
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h5" fontWeight="bold" color="primary">
                            {formData.asset.current_price ? formatCurrency(formData.asset.current_price, formData.asset.currency) : 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Preço atual
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Fade>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button 
                    onClick={handleNext}
                    variant="contained"
                    disabled={!formData.asset}
                    endIcon={<TrendingFlat />}
                  >
                    Continuar
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: Detalhes da Transação */}
            <Step>
              <StepLabel>
                <Typography variant="h6" fontWeight="bold">
                  Detalhes da Transação
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure os detalhes da sua transação
                </Typography>

                {/* Tipo de Transação */}
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Tipo de Transação
                  </FormLabel>
                  <RadioGroup
                    row
                    value={formData.transactionType}
                    onChange={(e) => updateFormData('transactionType', e.target.value)}
                  >
                    {TRANSACTION_TYPES.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <FormControlLabel
                          key={type.value}
                          value={type.value}
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconComponent sx={{ color: `${type.color}.main` }} />
                              {type.label}
                            </Box>
                          }
                        />
                      );
                    })}
                  </RadioGroup>
                </FormControl>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {/* Quantidade */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Quantidade"
                      type="number"
                      value={formData.quantity || ''}
                      onChange={(e) => updateFormData('quantity', Number(e.target.value))}
                      error={!!formErrors.quantity}
                      helperText={formErrors.quantity}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Calculate />
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* Data */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Data da Transação"
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateFormData('date', e.target.value)}
                      error={!!formErrors.date}
                      helperText={formErrors.date}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {/* Preço com switch para usar preço atual */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Preço por Unidade
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Usar preço atual
                      </Typography>
                      <Switch
                        checked={formData.useCurrentPrice}
                        onChange={(e) => {
                          const useCurrentPrice = e.target.checked;
                          updateFormData('useCurrentPrice', useCurrentPrice);
                          if (useCurrentPrice && formData.asset) {
                            updateFormData('price', formData.asset.current_price);
                          }
                        }}
                        color="primary"
                      />
                    </Box>
                  </Box>

                  <TextField
                    label="Preço"
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => updateFormData('price', Number(e.target.value))}
                    error={!!formErrors.price}
                    helperText={formErrors.price}
                    disabled={formData.useCurrentPrice}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                    fullWidth
                  />
                </Box>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {/* Taxas */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Taxas e Corretagem"
                      type="number"
                      value={formData.fees || ''}
                      onChange={(e) => updateFormData('fees', Number(e.target.value))}
                      error={!!formErrors.fees}
                      helperText={formErrors.fees}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney />
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* Impostos */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Impostos"
                      type="number"
                      value={formData.taxes || ''}
                      onChange={(e) => updateFormData('taxes', Number(e.target.value))}
                      error={!!formErrors.taxes}
                      helperText={formErrors.taxes}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney />
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {/* Seção de Rendimentos (opcional) */}
                <Card variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MonetizationOn sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight="bold">
                        Rendimento (Opcional)
                      </Typography>
                    </Box>
                    <Switch
                      checked={formData.yield.enabled}
                      onChange={(e) => updateYieldData('enabled', e.target.checked)}
                      color="primary"
                    />
                  </Box>

                  {formData.yield.enabled && (
                    <Fade in={formData.yield.enabled}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Configure os rendimentos esperados para esta posição (dividendos, cupons, etc.)
                        </Typography>

                        <Grid container spacing={3}>
                          {/* Tipo de Rendimento */}
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Tipo de Rendimento</InputLabel>
                              <Select
                                value={formData.yield.type}
                                onChange={(e) => updateYieldData('type', e.target.value)}
                                error={!!formErrors['yield.type']}
                                label="Tipo de Rendimento"
                              >
                                {YIELD_TYPES.map((type) => (
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                              {formErrors['yield.type'] && (
                                <FormHelperText error>{formErrors['yield.type']}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>

                          {/* Valor por Unidade */}
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Valor por Unidade"
                              type="number"
                              value={formData.yield.amountPerShare || ''}
                              onChange={(e) => updateYieldData('amountPerShare', Number(e.target.value))}
                              error={!!formErrors['yield.amountPerShare']}
                              helperText={formErrors['yield.amountPerShare'] || 'Valor do rendimento por ação/cota'}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <AttachMoney />
                                  </InputAdornment>
                                ),
                              }}
                              fullWidth
                            />
                          </Grid>

                          {/* Data de Recebimento */}
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Data de Recebimento"
                              type="date"
                              value={formData.yield.paymentDate}
                              onChange={(e) => updateYieldData('paymentDate', e.target.value)}
                              error={!!formErrors['yield.paymentDate']}
                              helperText={formErrors['yield.paymentDate']}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CalendarToday />
                                  </InputAdornment>
                                ),
                              }}
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                            />
                          </Grid>

                          {/* Frequência */}
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Frequência</InputLabel>
                              <Select
                                value={formData.yield.frequency}
                                onChange={(e) => updateYieldData('frequency', e.target.value)}
                                label="Frequência"
                              >
                                {YIELD_FREQUENCIES.map((freq) => (
                                  <MenuItem key={freq.value} value={freq.value}>
                                    {freq.label}
                                  </MenuItem>
                                ))}
                              </Select>
                              <FormHelperText>Para projeções de renda passiva</FormHelperText>
                            </FormControl>
                          </Grid>

                          {/* Recorrente */}
                          <Grid item xs={12}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={formData.yield.isRecurring}
                                  onChange={(e) => updateYieldData('isRecurring', e.target.checked)}
                                />
                              }
                              label="Este é um rendimento recorrente (para projeções futuras)"
                            />
                          </Grid>

                          {/* Observações do Rendimento */}
                          <Grid item xs={12}>
                            <TextField
                              label="Observações do Rendimento"
                              multiline
                              rows={2}
                              value={formData.yield.notes}
                              onChange={(e) => updateYieldData('notes', e.target.value)}
                              placeholder="Observações sobre o rendimento..."
                              fullWidth
                            />
                          </Grid>
                        </Grid>

                        {/* Resumo do Rendimento */}
                        {formData.yield.amountPerShare > 0 && formData.quantity > 0 && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Valor Total do Rendimento:</strong> {formatCurrency(formData.yield.amountPerShare * formData.quantity)}
                              <br />
                              <strong>Yield on Cost:</strong> {((formData.yield.amountPerShare / formData.price) * 100).toFixed(2)}%
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    </Fade>
                  )}
                </Card>

                {/* Observações */}
                <TextField
                  label="Observações (opcional)"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => updateFormData('notes', e.target.value)}
                  placeholder="Adicione observações sobre esta transação..."
                  fullWidth
                  sx={{ mb: 3 }}
                />

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={handleBack}>
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleNext}
                    variant="contained"
                    disabled={!formData.quantity || !formData.price || !formData.date}
                    endIcon={<TrendingFlat />}
                  >
                    Revisar
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 3: Revisão e Confirmação */}
            <Step>
              <StepLabel>
                <Typography variant="h6" fontWeight="bold">
                  Revisão e Confirmação
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Revise os detalhes da transação antes de confirmar
                </Typography>

                <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Ativo
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                            {formData.asset?.symbol.substring(0, 2)}
                          </Avatar>
                          <Typography variant="body1" fontWeight="bold">
                            {formData.asset?.symbol} - {formData.asset?.name}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Tipo de Transação
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          {formData.transactionType === 'BUY' ? (
                            <TrendingUp sx={{ color: 'success.main' }} />
                          ) : (
                            <TrendingDown sx={{ color: 'error.main' }} />
                          )}
                          <Typography variant="body1" fontWeight="bold">
                            {TRANSACTION_TYPES.find(t => t.value === formData.transactionType)?.label}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Data
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
                          {new Date(formData.date).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Quantidade
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
                          {formData.quantity.toLocaleString()} unidades
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Preço por Unidade
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
                          {formatCurrency(formData.price, formData.asset?.currency)}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Taxas e Impostos
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
                          {formatCurrency(formData.fees + formData.taxes, formData.asset?.currency)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                      Valor Total
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {formatCurrency(calculateTotalValue(), formData.asset?.currency)}
                    </Typography>
                  </Box>

                  {/* Seção de Rendimento na Revisão */}
                  {formData.yield.enabled && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Rendimento Configurado
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              <strong>Tipo:</strong> {YIELD_TYPES.find(t => t.value === formData.yield.type)?.label}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              <strong>Valor por Unidade:</strong> {formatCurrency(formData.yield.amountPerShare)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              <strong>Data:</strong> {new Date(formData.yield.paymentDate).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              <strong>Frequência:</strong> {YIELD_FREQUENCIES.find(f => f.value === formData.yield.frequency)?.label}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Alert severity="success" sx={{ mt: 1 }}>
                              <Typography variant="body2">
                                <strong>Valor Total:</strong> {formatCurrency(formData.yield.amountPerShare * formData.quantity)} | 
                                <strong> Yield on Cost:</strong> {((formData.yield.amountPerShare / formData.price) * 100).toFixed(2)}%
                              </Typography>
                            </Alert>
                          </Grid>
                        </Grid>
                      </Box>
                    </>
                  )}

                  {formData.notes && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Observações
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {formData.notes}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Card>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Após confirmar, esta transação será adicionada ao seu portfólio e afetará suas métricas de performance.
      </Typography>
                </Alert>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={handleBack}>
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : <CheckCircle />}
                    color="success"
                  >
                    {isSubmitting ? 'Processando...' : 'Confirmar Posição'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* Modal de Venda - UX Impecável */}
      <Dialog
        open={openSellModal}
        onClose={handleCloseSellModal}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        {/* Header com gradiente */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            color: 'white',
            p: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha('#fff', 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingDown sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                  Vender Posição
                </Typography>
                {selectedPosition && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={selectedPosition.asset.symbol}
                      sx={{ 
                        bgcolor: alpha('#fff', 0.2), 
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}
                    />
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      {selectedPosition.asset.name}
                    </Typography>
                  </Box>
                )}
              </Box>
              <IconButton
                onClick={handleCloseSellModal}
                sx={{ 
                  color: 'white', 
                  bgcolor: alpha('#fff', 0.1),
                  '&:hover': { bgcolor: alpha('#fff', 0.2) }
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>
        </Box>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedPosition && (
            <>
              {/* Informações da Posição Atual */}
              <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment color="primary" />
                  Posição Atual
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        QUANTIDADE
                      </Typography>
                      <Typography variant="h5" fontWeight="700" color="info.main">
                        {selectedPosition.quantity.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        unidades
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        PREÇO MÉDIO
                      </Typography>
                      <Typography variant="h5" fontWeight="700" color="warning.main">
                        {formatCurrency(selectedPosition.average_price, selectedPosition.asset.currency)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        por unidade
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        PREÇO ATUAL
                      </Typography>
                      <Typography variant="h5" fontWeight="700" color="success.main">
                        {formatCurrency(selectedPosition.current_price, selectedPosition.asset.currency)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        no mercado
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Configuração da Venda */}
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney color="primary" />
                  Configurar Venda
                </Typography>

                {/* Botões de Quantidade Rápida */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Quantidade a Vender
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {[25, 50, 75, 100].map((percentage) => (
                      <Button
                        key={percentage}
                        variant={Math.abs(sellFormData.quantity - (selectedPosition.quantity * percentage / 100)) < 0.01 ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setSellFormData(prev => ({ 
                          ...prev, 
                          quantity: selectedPosition.quantity * percentage / 100 
                        }))}
                        sx={{ 
                          minWidth: 60,
                          borderRadius: 2,
                          fontWeight: 600
                        }}
                      >
                        {percentage}%
                      </Button>
                    ))}
                  </Box>

                  <TextField
                    fullWidth
                    label="Quantidade Exata"
                    type="number"
                    value={sellFormData.quantity}
                    onChange={(e) => setSellFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    inputProps={{ 
                      min: 0, 
                      max: selectedPosition.quantity, 
                      step: 0.01 
                    }}
                    helperText={`Disponível: ${selectedPosition.quantity.toLocaleString()} unidades`}
                    error={sellFormData.quantity > selectedPosition.quantity}
                    sx={{ mb: 3 }}
                    InputProps={{
                      sx: { borderRadius: 2 }
                    }}
                  />
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Preço de Venda"
                      type="number"
                      value={sellFormData.price}
                      onChange={(e) => setSellFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney color="primary" />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Data da Venda"
                      type="date"
                      value={sellFormData.date}
                      onChange={(e) => setSellFormData(prev => ({ ...prev, date: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday color="primary" />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Taxas de Corretagem"
                      type="number"
                      value={sellFormData.fees}
                      onChange={(e) => setSellFormData(prev => ({ ...prev, fees: Number(e.target.value) }))}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {selectedPosition.asset.currency === 'BRL' ? 'R$' : '$'}
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 }
                      }}
                      helperText="Taxa da corretora"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Impostos"
                      type="number"
                      value={sellFormData.taxes}
                      onChange={(e) => setSellFormData(prev => ({ ...prev, taxes: Number(e.target.value) }))}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {selectedPosition.asset.currency === 'BRL' ? 'R$' : '$'}
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 }
                      }}
                      helperText="IR, IOF, etc."
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observações"
                      multiline
                      rows={3}
                      value={sellFormData.notes}
                      onChange={(e) => setSellFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Motivo da venda, estratégia de saída, rebalanceamento..."
                      InputProps={{
                        sx: { borderRadius: 2 }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Resumo Financeiro Avançado */}
              <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calculate color="primary" />
                  Resumo Financeiro
                </Typography>

                {(() => {
                  const totalValue = sellFormData.quantity * sellFormData.price;
                  const totalCosts = sellFormData.fees + sellFormData.taxes;
                  const netValue = totalValue - totalCosts;
                  const investedValue = sellFormData.quantity * selectedPosition.average_price;
                  const profitLoss = netValue - investedValue;
                  const profitLossPercentage = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;
                  const isProfitable = profitLoss >= 0;

                  return (
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Card sx={{ 
                          p: 2, 
                          borderRadius: 3, 
                          bgcolor: alpha(theme.palette.success.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                        }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            VALOR BRUTO DA VENDA
                          </Typography>
                          <Typography variant="h5" fontWeight="700" color="success.main">
                            {formatCurrency(totalValue, selectedPosition.asset.currency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sellFormData.quantity.toLocaleString()} × {formatCurrency(sellFormData.price, selectedPosition.asset.currency)}
                          </Typography>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Card sx={{ 
                          p: 2, 
                          borderRadius: 3, 
                          bgcolor: alpha(theme.palette.warning.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                        }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            CUSTOS TOTAIS
                          </Typography>
                          <Typography variant="h5" fontWeight="700" color="warning.main">
                            {formatCurrency(totalCosts, selectedPosition.asset.currency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Taxas + Impostos
                          </Typography>
                        </Card>
                      </Grid>

                      <Grid item xs={12}>
                        <Card sx={{ 
                          p: 3, 
                          borderRadius: 3, 
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight="600">
                              VALOR LÍQUIDO
                            </Typography>
                            <Typography variant="h4" fontWeight="700" color="primary.main">
                              {formatCurrency(netValue, selectedPosition.asset.currency)}
                            </Typography>
                          </Box>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                RESULTADO DA OPERAÇÃO
                              </Typography>
                              <Typography 
                                variant="h6" 
                                fontWeight="700" 
                                color={isProfitable ? "success.main" : "error.main"}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                              >
                                {isProfitable ? <TrendingUp /> : <TrendingDown />}
                                {formatCurrency(Math.abs(profitLoss), selectedPosition.asset.currency)}
                                <Chip
                                  label={`${profitLossPercentage >= 0 ? '+' : ''}${profitLossPercentage.toFixed(2)}%`}
                                  color={isProfitable ? "success" : "error"}
                                  size="small"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" color="text.secondary">
                                {isProfitable ? 'LUCRO' : 'PREJUÍZO'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Investido: {formatCurrency(investedValue, selectedPosition.asset.currency)}
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>
                  );
                })()}
              </Box>
            </>
          )}
        </DialogContent>

        {/* Footer com ações */}
        <Box
          sx={{
            p: 3,
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={handleCloseSellModal}
            variant="outlined"
            size="large"
            sx={{ 
              borderRadius: 2,
              px: 4,
              fontWeight: 600
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSellSubmit}
            variant="contained"
            color="error"
            size="large"
            disabled={isSellSubmitting || !selectedPosition || sellFormData.quantity <= 0 || sellFormData.quantity > selectedPosition?.quantity}
            startIcon={isSellSubmitting ? <CircularProgress size={20} color="inherit" /> : <TrendingDown />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              fontWeight: 600,
              minWidth: 180,
              boxShadow: theme.shadows[8],
              '&:hover': {
                boxShadow: theme.shadows[12],
              }
            }}
          >
            {isSellSubmitting ? 'Processando Venda...' : 'Confirmar Venda'}
          </Button>
        </Box>
      </Dialog>

      {/* Modal de Histórico do Ativo */}
      <Dialog
        open={openHistoryModal}
        onClose={handleCloseHistoryModal}
        maxWidth="lg"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
            maxHeight: '90vh',
          }
        }}
      >
        {/* Header do Modal de Histórico */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            p: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha('#fff', 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShowChart sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                  Histórico Completo
                </Typography>
                {selectedAssetHistory && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={selectedAssetHistory.asset.symbol}
                      sx={{ 
                        bgcolor: alpha('#fff', 0.2), 
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}
                    />
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      {selectedAssetHistory.asset.name}
                    </Typography>
                  </Box>
                )}
              </Box>
              <IconButton
                onClick={handleCloseHistoryModal}
                sx={{ 
                  color: 'white', 
                  bgcolor: alpha('#fff', 0.1),
                  '&:hover': { bgcolor: alpha('#fff', 0.2) }
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>
        </Box>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedAssetHistory && (
            <>
              {/* Loading State */}
              {historyLoading && (
                <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary">
                    Carregando histórico completo...
                  </Typography>
                </Box>
              )}

              {!historyLoading && (
                <>
                  {/* Resumo da Posição */}
                  <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Assessment color="primary" />
                      Resumo da Posição
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            QUANTIDADE TOTAL
                          </Typography>
                          <Typography variant="h4" fontWeight="700" color="info.main">
                            {selectedAssetHistory.quantity.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            unidades
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            PREÇO MÉDIO
                          </Typography>
                          <Typography variant="h4" fontWeight="700" color="warning.main">
                            {formatCurrency(selectedAssetHistory.average_price, selectedAssetHistory.asset.currency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            por unidade
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            VALOR ATUAL
                          </Typography>
                          <Typography variant="h4" fontWeight="700" color="success.main">
                            {formatCurrency(selectedAssetHistory.current_value, selectedAssetHistory.asset.currency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            total investido
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          p: 2, 
                          textAlign: 'center', 
                          borderRadius: 3, 
                          bgcolor: alpha(
                            selectedAssetHistory.unrealized_pnl >= 0 ? theme.palette.success.main : theme.palette.error.main, 
                            0.08
                          )
                        }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            RETORNO TOTAL
                          </Typography>
                          <Typography 
                            variant="h4" 
                            fontWeight="700" 
                            color={selectedAssetHistory.unrealized_pnl >= 0 ? "success.main" : "error.main"}
                          >
                            {formatCurrency(selectedAssetHistory.unrealized_pnl + selectedAssetHistory.realized_pnl, selectedAssetHistory.asset.currency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {((selectedAssetHistory.unrealized_pnl + selectedAssetHistory.realized_pnl) / selectedAssetHistory.total_invested * 100).toFixed(2)}%
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Histórico de Preços (Gráfico Simples) */}
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Timeline color="primary" />
                      Evolução de Preços (30 dias)
                    </Typography>
                    
                    {assetPrices.length > 0 ? (
                      <Card sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={assetPrices.map(price => ({
                            date: new Date(price.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
                            price: price.close,
                            fullDate: price.date
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <RechartsTooltip 
                              formatter={(value: any) => [formatCurrency(value, selectedAssetHistory.asset.currency), 'Preço']}
                              labelFormatter={(label) => `Data: ${label}`}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="price" 
                              stroke={theme.palette.primary.main}
                              fill={alpha(theme.palette.primary.main, 0.2)}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Card>
                    ) : (
                      <Alert severity="info">
                        Histórico de preços não disponível para este ativo.
                      </Alert>
                    )}
                  </Box>

                  {/* Histórico de Transações */}
                  <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.2) }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalance color="primary" />
                      Histórico de Transações ({assetTransactions.length})
                    </Typography>
                    
                    {assetTransactions.length > 0 ? (
                      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                              <TableCell><strong>Data</strong></TableCell>
                              <TableCell><strong>Tipo</strong></TableCell>
                              <TableCell align="right"><strong>Quantidade</strong></TableCell>
                              <TableCell align="right"><strong>Preço</strong></TableCell>
                              <TableCell align="right"><strong>Valor Total</strong></TableCell>
                              <TableCell><strong>Observações</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {assetTransactions.map((transaction) => (
                              <TableRow 
                                key={transaction.id}
                                sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) } }}
                              >
                                <TableCell>
                                  {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={transaction.transaction_type}
                                    color={transaction.transaction_type === 'BUY' ? 'success' : 'error'}
                                    size="small"
                                    icon={transaction.transaction_type === 'BUY' ? <TrendingUp /> : <TrendingDown />}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  {transaction.quantity?.toLocaleString() || '-'}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(transaction.price, selectedAssetHistory.asset.currency)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(transaction.total_amount, selectedAssetHistory.asset.currency)}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {transaction.notes || '-'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          textAlign: 'center',
                          bgcolor: alpha(theme.palette.info.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                          borderRadius: 2,
                        }}
                      >
                        <AccountBalance sx={{ fontSize: 48, color: theme.palette.info.main, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Nenhuma transação encontrada
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Este ativo não possui transações registradas neste portfólio ou os dados ainda não foram carregados.
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          mb: 3, 
                          p: 2, 
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                          borderRadius: 1,
                          fontSize: '0.875rem'
                        }}>
                          💡 <strong>Debug:</strong> Abra o Console do Browser (F12) para ver logs detalhados da busca de dados. 
                          Se houver erro de autenticação, faça logout e login novamente.
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Add />}
                          onClick={() => {
                            handleCloseHistoryModal();
                            setOpenNewPosition(true);
                          }}
                          sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            mb: 2,
                          }}
                        >
                          Adicionar Transação
                        </Button>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Asset ID: {selectedAssetHistory?.asset_id} | Portfolio ID: {id}
                        </Typography>
                      </Paper>
                    )}
                  </Box>

                  {/* Histórico de Dividendos */}
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MonetizationOn color="primary" />
                      Histórico de Dividendos ({assetDividends.length})
                    </Typography>
                    
                    {assetDividends.length > 0 ? (
                      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                              <TableCell><strong>Data Pagamento</strong></TableCell>
                              <TableCell><strong>Tipo</strong></TableCell>
                              <TableCell align="right"><strong>Valor por Ação</strong></TableCell>
                              <TableCell align="right"><strong>Quantidade</strong></TableCell>
                              <TableCell align="right"><strong>Total Bruto</strong></TableCell>
                              <TableCell align="right"><strong>Total Líquido</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {assetDividends.map((dividend) => (
                              <TableRow 
                                key={dividend.id}
                                sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) } }}
                              >
                                <TableCell>
                                  {new Date(dividend.payment_date).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={dividend.dividend_type.toUpperCase()}
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(dividend.amount_per_share, selectedAssetHistory.asset.currency)}
                                </TableCell>
                                <TableCell align="right">
                                  {dividend.shares_quantity.toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(dividend.total_amount, selectedAssetHistory.asset.currency)}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="bold" color="success.main">
                                    {formatCurrency(dividend.net_amount || dividend.total_amount, selectedAssetHistory.asset.currency)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          textAlign: 'center',
                          bgcolor: alpha(theme.palette.success.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                          borderRadius: 2,
                        }}
                      >
                        <MonetizationOn sx={{ fontSize: 48, color: theme.palette.success.main, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Nenhum dividendo encontrado
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Este ativo não possui dividendos registrados neste portfólio. Você pode adicionar dividendos através do modal "Nova Posição".
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<MonetizationOn />}
                          onClick={() => {
                            handleCloseHistoryModal();
                            setOpenNewPosition(true);
                          }}
                          sx={{
                            borderColor: theme.palette.success.main,
                            color: theme.palette.success.main,
                            mb: 2,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              borderColor: theme.palette.success.main,
                            },
                          }}
                        >
                          Adicionar Dividendo
                        </Button>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Asset ID: {selectedAssetHistory?.asset_id} | Portfolio ID: {id}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>

        {/* Footer do Modal */}
        <Box
          sx={{
            p: 3,
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={handleCloseHistoryModal}
            variant="outlined"
            size="large"
            sx={{ 
              borderRadius: 2,
              px: 4,
              fontWeight: 600
            }}
          >
            Fechar
          </Button>
        </Box>
      </Dialog>

      {/* Modal de Filtros Avançados */}
      <Dialog
        open={openFilters}
        onClose={() => setOpenFilters(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        {/* Header do Modal de Filtros */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            color: 'white',
            p: 3,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha('#fff', 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FilterList sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                  Filtros Avançados
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Personalize a visualização das suas posições
                </Typography>
              </Box>
              <IconButton
                onClick={() => setOpenFilters(false)}
                sx={{ 
                  color: 'white', 
                  bgcolor: alpha('#fff', 0.1),
                  '&:hover': { bgcolor: alpha('#fff', 0.2) }
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>
        </Box>
        
        <DialogContent sx={{ p: 4 }}>
          <Grid container spacing={4}>
            {/* Filtros de Categoria */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment color="primary" />
                Filtros de Categoria
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Setor</InputLabel>
                  <Select
                    value={filters.sector}
                    label="Setor"
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">Todos os Setores</MenuItem>
                    <MenuItem value="Technology">Tecnologia</MenuItem>
                    <MenuItem value="Finance">Financeiro</MenuItem>
                    <MenuItem value="Healthcare">Saúde</MenuItem>
                    <MenuItem value="Energy">Energia</MenuItem>
                    <MenuItem value="Consumer">Consumo</MenuItem>
                    <MenuItem value="Industrial">Industrial</MenuItem>
                    <MenuItem value="Real Estate">Imobiliário</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Tipo de Ativo</InputLabel>
                  <Select
                    value={filters.assetType}
                    label="Tipo de Ativo"
                    onChange={(e) => handleFilterChange('assetType', e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">Todos os Tipos</MenuItem>
                    <MenuItem value="stock">Ações</MenuItem>
                    <MenuItem value="etf">ETFs</MenuItem>
                    <MenuItem value="bond">Títulos</MenuItem>
                    <MenuItem value="fund">Fundos</MenuItem>
                    <MenuItem value="crypto">Criptomoedas</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Performance</InputLabel>
                  <Select
                    value={filters.performance}
                    label="Performance"
                    onChange={(e) => handleFilterChange('performance', e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="profit">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp color="success" />
                        Apenas Lucros
                      </Box>
                    </MenuItem>
                    <MenuItem value="loss">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingDown color="error" />
                        Apenas Prejuízos
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>

            {/* Filtros de Valor e Ordenação */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney color="primary" />
                Valor e Ordenação
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="Valor Mínimo"
                  type="number"
                  value={filters.minValue}
                  onChange={(e) => handleFilterChange('minValue', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  placeholder="Ex: 1000"
                />

                <TextField
                  fullWidth
                  label="Valor Máximo"
                  type="number"
                  value={filters.maxValue}
                  onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  placeholder="Ex: 10000"
                />

                <FormControl fullWidth>
                  <InputLabel>Ordenar Por</InputLabel>
                  <Select
                    value={filters.sortBy}
                    label="Ordenar Por"
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="symbol">Símbolo (A-Z)</MenuItem>
                    <MenuItem value="value">Valor de Mercado</MenuItem>
                    <MenuItem value="return">Retorno Total</MenuItem>
                    <MenuItem value="allocation">Alocação (%)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Ordem</InputLabel>
                  <Select
                    value={filters.sortOrder}
                    label="Ordem"
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="asc">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp />
                        Crescente
                      </Box>
                    </MenuItem>
                    <MenuItem value="desc">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingDown />
                        Decrescente
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>

            {/* Resumo dos Filtros */}
            <Grid item xs={12}>
              <Card sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Timeline color="info" />
                  Resumo dos Filtros
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {filteredAndSortedPositions.length} de {positions?.length || 0} posições serão exibidas com os filtros atuais.
                </Typography>
                
                {/* Chips dos filtros ativos */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {filters.sector && (
                    <Chip label={`Setor: ${filters.sector}`} size="small" color="info" variant="outlined" />
                  )}
                  {filters.assetType && (
                    <Chip label={`Tipo: ${filters.assetType}`} size="small" color="info" variant="outlined" />
                  )}
                  {filters.performance && (
                    <Chip 
                      label={`Performance: ${filters.performance === 'profit' ? 'Lucros' : 'Prejuízos'}`} 
                      size="small" 
                      color="info" 
                      variant="outlined" 
                    />
                  )}
                  {filters.minValue && (
                    <Chip label={`Min: $${filters.minValue}`} size="small" color="info" variant="outlined" />
                  )}
                  {filters.maxValue && (
                    <Chip label={`Max: $${filters.maxValue}`} size="small" color="info" variant="outlined" />
                  )}
                  <Chip 
                    label={`Ordem: ${filters.sortBy} (${filters.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})`} 
                    size="small" 
                    color="info" 
                    variant="outlined" 
                  />
                </Box>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>

        {/* Footer do Modal de Filtros */}
        <Box
          sx={{
            p: 3,
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: 'flex',
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Button
            onClick={clearFilters}
            variant="outlined"
            color="error"
            size="large"
            sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}
          >
            Limpar Filtros
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={() => setOpenFilters(false)}
              variant="outlined"
              size="large"
              sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setOpenFilters(false)}
              variant="contained"
              size="large"
              sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}
            >
              Aplicar Filtros
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Indicador de atualização em tempo real */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <Tooltip title="Dados atualizados em tempo real">
          <Chip
            icon={<Refresh className="spin-animation" />}
            label="Ao Vivo"
            color="success"
            variant="filled"
            sx={{
              boxShadow: theme.shadows[8],
              '& .spin-animation': {
                animation: 'spin 2s linear infinite',
              },
            }}
          />
        </Tooltip>
      </Box>
    </Box>
  );
}