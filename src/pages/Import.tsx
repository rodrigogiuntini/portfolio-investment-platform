import { useState, useCallback } from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Link,
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  Preview,
  Check,
  Error,
  Download,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Portfolio {
  id: number;
  name: string;
  currency: string;
}

interface ImportData {
  headers: string[];
  rows: any[][];
  fileName: string;
}

interface ColumnMapping {
  [key: string]: string;
}

const requiredFields = [
  { key: 'date', label: 'Data', required: true },
  { key: 'symbol', label: 'Símbolo/Código', required: true },
  { key: 'type', label: 'Tipo de Transação', required: true },
  { key: 'quantity', label: 'Quantidade', required: true },
  { key: 'price', label: 'Preço', required: true },
  { key: 'total', label: 'Valor Total', required: false },
  { key: 'fees', label: 'Taxas', required: false },
  { key: 'taxes', label: 'Impostos', required: false },
];

const transactionTypes = [
  { value: 'buy', label: 'Compra' },
  { value: 'sell', label: 'Venda' },
  { value: 'dividend', label: 'Dividendo' },
  { value: 'interest', label: 'Juros' },
  { value: 'deposit', label: 'Depósito' },
  { value: 'withdraw', label: 'Saque' },
];

export default function Import() {
  const [activeStep, setActiveStep] = useState(0);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [selectedPortfolio, setSelectedPortfolio] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await api.get('/api/portfolios/');
      return response.data;
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLastFile(file); // Store the original file

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo deve ter pelo menos cabeçalho e uma linha de dados');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.trim().replace(/"/g, ''))
      );

      setImportData({
        headers,
        rows: rows.slice(0, 10), // Show only first 10 rows for preview
        fileName: file.name,
      });
      setActiveStep(1);
      
      // Auto-map common column names
      const autoMapping: ColumnMapping = {};
      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('data') || lowerHeader.includes('date')) {
          autoMapping['date'] = header;
        } else if (lowerHeader.includes('symbol') || lowerHeader.includes('código') || lowerHeader.includes('ativo')) {
          autoMapping['symbol'] = header;
        } else if (lowerHeader.includes('tipo') || lowerHeader.includes('type')) {
          autoMapping['type'] = header;
        } else if (lowerHeader.includes('quantidade') || lowerHeader.includes('qtd') || lowerHeader.includes('quantity')) {
          autoMapping['quantity'] = header;
        } else if (lowerHeader.includes('preço') || lowerHeader.includes('price')) {
          autoMapping['price'] = header;
        } else if (lowerHeader.includes('total') || lowerHeader.includes('valor')) {
          autoMapping['total'] = header;
        }
      });
      setColumnMapping(autoMapping);
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  const handleColumnMappingChange = (field: string, column: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: column,
    }));
  };

  const validateMapping = () => {
    const requiredMapped = requiredFields
      .filter(field => field.required)
      .every(field => columnMapping[field.key]);
    
    return requiredMapped && selectedPortfolio;
  };

  const handleImport = async () => {
    if (!importData || !validateMapping() || !lastFile) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsProcessing(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('portfolio_id', selectedPortfolio.toString());
      formData.append('file', lastFile);

      const response = await api.post('/api/import/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(`${response.data.imported_count} transações importadas com sucesso!`);
      setActiveStep(3);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao importar dados');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setActiveStep(0);
    setImportData(null);
    setColumnMapping({});
    setSelectedPortfolio('');
    setLastFile(null);
  };

  const steps = ['Upload do Arquivo', 'Mapeamento de Colunas', 'Revisão e Importação', 'Concluído'];

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper
                {...getRootProps()}
                sx={{
                  p: 4,
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  textAlign: 'center',
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive
                    ? 'Solte o arquivo aqui...'
                    : 'Arraste um arquivo CSV/Excel ou clique para selecionar'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Formatos suportados: .csv, .xls, .xlsx
                </Typography>
                <Button variant="contained" sx={{ mt: 2 }}>
                  Selecionar Arquivo
                </Button>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Formato Esperado (CSV)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Exemplo de estrutura do arquivo:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
{`data,symbol,type,quantity,price,total
2024-01-15,PETR4,buy,100,35.50,3550.00
2024-01-20,VALE3,buy,50,70.25,3512.50`}
                  </Box>
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    <strong>Campos obrigatórios:</strong> data, símbolo, tipo, quantidade, preço
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Mapeamento de Colunas
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Configure como cada coluna do seu arquivo corresponde aos campos do sistema:
              </Typography>
              
              {!importData && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Dados não carregados. Volte ao passo anterior.
                </Alert>
              )}
              
              {importData && importData.headers.length === 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Nenhuma coluna detectada no arquivo.
                </Alert>
              )}
              
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth required>
                  <InputLabel id="portfolio-label">Portfólio de Destino</InputLabel>
                  <Select
                    labelId="portfolio-label"
                    label="Portfólio de Destino"
                    value={selectedPortfolio}
                    onChange={(e) => setSelectedPortfolio(e.target.value as number)}
                  >
                    {portfolios.length === 0 ? (
                      <MenuItem disabled>
                        <em>Nenhum portfólio encontrado</em>
                      </MenuItem>
                    ) : (
                      portfolios.map((portfolio) => (
                        <MenuItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name} ({portfolio.currency})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                
                {portfolios.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Você precisa criar um portfólio antes de importar dados.{' '}
                    <Link href="/portfolios" color="primary">
                      Criar Portfólio
                    </Link>
                  </Alert>
                )}
              </Box>

              {importData && importData.headers.length > 0 && requiredFields.map((field) => (
                <FormControl key={field.key} fullWidth sx={{ mb: 2 }} required={field.required}>
                  <InputLabel id={`${field.key}-label`}>{field.label} {field.required && '*'}</InputLabel>
                  <Select
                    labelId={`${field.key}-label`}
                    label={`${field.label} ${field.required ? '*' : ''}`}
                    value={columnMapping[field.key] || ''}
                    onChange={(e) => handleColumnMappingChange(field.key, e.target.value as string)}
                    disabled={!importData || importData.headers.length === 0}
                  >
                    <MenuItem value="">
                      <em>Não mapear</em>
                    </MenuItem>
                    {importData.headers.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Preview dos Dados
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Arquivo: {importData?.fileName}
              </Typography>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {importData?.headers.map((header) => (
                        <TableCell key={header}>
                          <strong>{header}</strong>
                          {Object.values(columnMapping).includes(header) && (
                            <Chip
                              size="small"
                              label="Mapeado"
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importData?.rows.map((row, index) => (
                      <TableRow key={index}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Revisão da Importação
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Revise as configurações antes de prosseguir com a importação.
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Arquivo:</Typography>
                <Typography variant="body1">{importData?.fileName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Registros:</Typography>
                <Typography variant="body1">{importData?.rows.length} transações</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Portfólio:</Typography>
                <Typography variant="body1">
                  {portfolios.find(p => p.id === selectedPortfolio)?.name || 'N/A'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Mapeamento de Colunas:
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(columnMapping).map(([field, column]) => (
                <Grid item xs={6} sm={4} key={field}>
                  <Chip
                    label={`${requiredFields.find(f => f.key === field)?.label}: ${column}`}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box textAlign="center">
            <Check sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Importação Concluída!
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Seus dados foram importados com sucesso. Você pode visualizá-los no Dashboard ou na página de Transações.
            </Typography>
            <Button variant="contained" onClick={resetImport}>
              Nova Importação
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Importar Dados
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Importe suas transações através de arquivos CSV, Excel ou extratos de corretoras.
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {isProcessing && <LinearProgress sx={{ mb: 2 }} />}

      {renderStepContent()}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          disabled={activeStep === 0 || isProcessing}
          onClick={() => setActiveStep(prev => prev - 1)}
        >
          Voltar
        </Button>
        
        <Box>
          {activeStep === 1 && (
            <Button
              variant="contained"
              disabled={!validateMapping()}
              onClick={() => setActiveStep(2)}
            >
              Próximo
            </Button>
          )}
          {activeStep === 2 && (
            <Button
              variant="contained"
              disabled={isProcessing}
              onClick={handleImport}
            >
              {isProcessing ? 'Importando...' : 'Importar Dados'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
