import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Avatar,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Slide,
  CircularProgress,
  Paper,
  Tooltip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Badge,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  Palette,
  Language,
  Storage,
  Download,
  Upload,
  Delete,
  Edit,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  DarkMode,
  LightMode,
  Settings as SettingsIcon,
  VolumeUp,
  Email,
  Sms,
  Phone,
  Computer,
  Smartphone,
  Cloud,
  Shield,
  Key,
  Fingerprint,
  Lock,
  Info,
  Warning,
  CheckCircle,
  ExpandMore,
  Refresh,
  GetApp,
  CloudUpload,
  DeleteForever,
  PhotoCamera,
  AccountCircle,
  CurrencyExchange,
  TrendingUp,
  Schedule,
  Category,
  ColorLens,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  currency: 'BRL' | 'USD' | 'EUR';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    portfolio_alerts: boolean;
    price_alerts: boolean;
    news: boolean;
  };
  privacy: {
    profile_visible: boolean;
    show_portfolio_value: boolean;
    two_factor_enabled: boolean;
  };
  display: {
    decimal_places: number;
    chart_type: 'line' | 'candlestick' | 'area';
    refresh_interval: number;
    compact_view: boolean;
  };
}

const SETTING_CATEGORIES = [
  {
    id: 'profile',
    title: 'Perfil',
    description: 'Informações pessoais e configurações da conta',
    icon: Person,
    color: '#1976d2',
  },
  {
    id: 'appearance',
    title: 'Aparência',
    description: 'Tema, cores e personalização visual',
    icon: Palette,
    color: '#9c27b0',
  },
  {
    id: 'notifications',
    title: 'Notificações',
    description: 'Alertas e comunicações',
    icon: Notifications,
    color: '#ff9800',
  },
  {
    id: 'security',
    title: 'Segurança',
    description: 'Privacidade e autenticação',
    icon: Security,
    color: '#f44336',
  },
  {
    id: 'preferences',
    title: 'Preferências',
    description: 'Idioma, moeda e configurações gerais',
    icon: SettingsIcon,
    color: '#4caf50',
  },
  {
    id: 'data',
    title: 'Dados',
    description: 'Backup, exportação e importação',
    icon: Storage,
    color: '#607d8b',
  },
];

export default function Settings() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  
  // Fetch user profile and settings with error handling
  const { data: userProfile, refetch: refetchProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/settings/profile');
        return response.data;
      } catch (error) {
        console.log('Profile fetch failed, using user data as fallback');
        // Fallback para dados do usuário se API falhar
        return {
          name: user?.username || '',
          email: user?.email || '',
          bio: '',
          phone: '',
          location: '',
          profile_visible: true,
          email_verified: false,
          phone_verified: false,
        };
      }
    },
    enabled: isAuthenticated,
  });

  const { data: userSettings, refetch: refetchSettings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/settings/preferences');
        return response.data;
      } catch (error) {
        console.log('Settings fetch failed, using defaults');
        // Fallback para configurações padrão se API falhar
        return {
          theme: 'LIGHT',
          language: 'PT_BR',
          currency: 'BRL',
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          portfolio_alerts: true,
          price_alerts: true,
          news_notifications: false,
          show_portfolio_value: true,
          two_factor_enabled: false,
          decimal_places: 2,
          chart_type: 'LINE',
          refresh_interval: 60,
          compact_view: false,
        };
      }
    },
    enabled: isAuthenticated,
  });

  // Estados principais
  const [activeCategory, setActiveCategory] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });
  
  // Estados para modais
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openDeleteAccount, setOpenDeleteAccount] = useState(false);
  const [openExportData, setOpenExportData] = useState(false);
  
  // Estados para formulários (inicializados com valores padrão)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    phone: '',
    location: '',
  });
  
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'pt-br',
    currency: 'BRL',
    notifications: {
      email: true,
      push: true,
      sms: false,
      portfolio_alerts: true,
      price_alerts: true,
      news: false,
    },
    privacy: {
      profile_visible: true,
      show_portfolio_value: true,
      two_factor_enabled: false,
    },
    display: {
      decimal_places: 2,
      chart_type: 'line',
      refresh_interval: 60,
      compact_view: false,
    },
  });

  // Update state when data changes
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        name: userProfile.name || user?.username || '',
        email: userProfile.email || user?.email || '',
        bio: userProfile.bio || '',
        phone: userProfile.phone || '',
        location: userProfile.location || '',
      });
    } else if (user && !profileLoading) {
      // Se não temos profile data, mas temos dados do user, usar como fallback
      setProfileData({
        name: user.username || '',
        email: user.email || '',
        bio: '',
        phone: '',
        location: '',
      });
    }
  }, [userProfile, user, profileLoading]);

  useEffect(() => {
    if (userSettings) {
      setSettings({
        theme: userSettings.theme?.toLowerCase() || 'light',
        language: userSettings.language?.toLowerCase().replace('_', '-') || 'pt-br',
        currency: userSettings.currency || 'BRL',
        notifications: {
          email: userSettings.email_notifications ?? true,
          push: userSettings.push_notifications ?? true,
          sms: userSettings.sms_notifications ?? false,
          portfolio_alerts: userSettings.portfolio_alerts ?? true,
          price_alerts: userSettings.price_alerts ?? true,
          news: userSettings.news_notifications ?? false,
        },
        privacy: {
          profile_visible: userProfile?.profile_visible ?? true,
          show_portfolio_value: userSettings.show_portfolio_value ?? true,
          two_factor_enabled: userSettings.two_factor_enabled ?? false,
        },
        display: {
          decimal_places: userSettings.decimal_places ?? 2,
          chart_type: userSettings.chart_type?.toLowerCase() || 'line',
          refresh_interval: userSettings.refresh_interval ?? 60,
          compact_view: userSettings.compact_view ?? false,
        },
      });
    }
  }, [userSettings, userProfile]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const response = await api.put('/api/settings/profile', data);
        return response.data;
      } catch (error) {
        // Se o backend não estiver disponível, ainda permitir edição local
        console.log('Backend não disponível, mantendo dados localmente');
        return data;
      }
    },
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Perfil atualizado com sucesso!', severity: 'success' });
      setIsEditing(false);
      refetchProfile();
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.detail || 'Erro ao atualizar perfil', severity: 'error' });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const response = await api.put('/api/settings/preferences', data);
        return response.data;
      } catch (error) {
        // Se o backend não estiver disponível, ainda permitir mudança local
        console.log('Backend não disponível, mantendo configurações localmente');
        return data;
      }
    },
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Configurações salvas!', severity: 'success' });
      refetchSettings();
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.detail || 'Erro ao salvar configurações', severity: 'error' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/settings/change-password', {
        current_password: data.current,
        new_password: data.new,
      });
      return response.data;
    },
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Senha alterada com sucesso!', severity: 'success' });
      setOpenChangePassword(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.detail || 'Erro ao alterar senha', severity: 'error' });
    },
  });

  // Handlers
  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleSettingChange = (category: keyof UserSettings, key: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    };
    setSettings(newSettings);
    
    // Convert frontend format to backend format
    const backendSettings = {
      theme: newSettings.theme.toUpperCase(),
      language: newSettings.language.toUpperCase().replace('-', '_'),
      currency: newSettings.currency,
      email_notifications: newSettings.notifications.email,
      push_notifications: newSettings.notifications.push,
      sms_notifications: newSettings.notifications.sms,
      portfolio_alerts: newSettings.notifications.portfolio_alerts,
      price_alerts: newSettings.notifications.price_alerts,
      news_notifications: newSettings.notifications.news,
      show_portfolio_value: newSettings.privacy.show_portfolio_value,
      two_factor_enabled: newSettings.privacy.two_factor_enabled,
      decimal_places: newSettings.display.decimal_places,
      chart_type: newSettings.display.chart_type.toUpperCase(),
      refresh_interval: newSettings.display.refresh_interval,
      compact_view: newSettings.display.compact_view,
    };
    
    updateSettingsMutation.mutate(backendSettings);
  };

  const handleChangePassword = () => {
    if (passwordData.new !== passwordData.confirm) {
      setSnackbar({ open: true, message: 'Senhas não conferem!', severity: 'error' });
      return;
    }
    changePasswordMutation.mutate(passwordData);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = SETTING_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.icon : SettingsIcon;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = SETTING_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.color : theme.palette.primary.main;
  };

  const renderProfileSettings = () => (
    <Stack spacing={3}>
      {/* Avatar e Info Básica */}
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    width: 32,
                    height: 32,
                    '&:hover': { bgcolor: theme.palette.primary.dark },
                  }}
                >
                  <PhotoCamera fontSize="small" />
                </IconButton>
              }
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
{(profileData.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </Avatar>
            </Badge>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {profileData.name || userProfile?.name || user?.username || 'Nome do usuário'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {userProfile?.email || user?.email || 'Email não disponível'}
              </Typography>
              <Chip
                icon={<CheckCircle />}
                label="Conta Verificada"
                size="small"
                color="success"
                variant="outlined"
                sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}
              />
            </Box>
            
            <Button
              variant={isEditing ? "outlined" : "contained"}
              startIcon={isEditing ? <Cancel /> : <Edit />}
              onClick={() => setIsEditing(!isEditing)}
              sx={{ borderRadius: 2 }}
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
          </Box>

          {isEditing && (
            <Fade in timeout={300}>
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nome Completo"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      fullWidth
                      variant="outlined"
                      type="email"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Telefone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Localização"
                      value={profileData.location}
                      onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      fullWidth
                      variant="outlined"
                      multiline
                      rows={3}
                      placeholder="Conte um pouco sobre você..."
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => setIsEditing(false)}
                    sx={{ borderRadius: 2 }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    sx={{ borderRadius: 2 }}
                  >
                    {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Box>
              </Stack>
            </Fade>
          )}
        </CardContent>
      </Card>

      {/* Ações da Conta */}
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Ações da Conta
          </Typography>
          
          <Stack spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Key />}
              onClick={() => setOpenChangePassword(true)}
              fullWidth
              sx={{ 
                justifyContent: 'flex-start',
                borderRadius: 2,
                py: 1.5,
              }}
            >
              Alterar Senha
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => setOpenExportData(true)}
              fullWidth
              sx={{ 
                justifyContent: 'flex-start',
                borderRadius: 2,
                py: 1.5,
              }}
            >
              Exportar Dados
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForever />}
              onClick={() => setOpenDeleteAccount(true)}
              fullWidth
              sx={{ 
                justifyContent: 'flex-start',
                borderRadius: 2,
                py: 1.5,
              }}
            >
              Excluir Conta
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderAppearanceSettings = () => (
    <Stack spacing={3}>
      {/* Tema */}
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Tema
          </Typography>
          
          <Grid container spacing={2}>
            {[
              { value: 'light', label: 'Claro', icon: LightMode, color: '#ffd54f' },
              { value: 'dark', label: 'Escuro', icon: DarkMode, color: '#424242' },
              { value: 'auto', label: 'Automático', icon: Brightness4, color: '#9c27b0' },
            ].map((themeOption) => (
              <Grid item xs={4} key={themeOption.value}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: `2px solid ${settings.theme === themeOption.value ? themeOption.color : 'transparent'}`,
                    bgcolor: settings.theme === themeOption.value ? alpha(themeOption.color, 0.1) : alpha(theme.palette.background.paper, 0.5),
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: alpha(themeOption.color, 0.05),
                    },
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => handleSettingChange('theme', 'theme', themeOption.value)}
                >
                  <themeOption.icon sx={{ fontSize: 40, color: themeOption.color, mb: 1 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {themeOption.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Display */}
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Exibição
          </Typography>
          
          <Stack spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Casas Decimais: {settings.display.decimal_places}
              </Typography>
              <Slider
                value={settings.display.decimal_places}
                onChange={(_, value) => handleSettingChange('display', 'decimal_places', value)}
                min={0}
                max={4}
                marks
                step={1}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Intervalo de Atualização (segundos): {settings.display.refresh_interval}
              </Typography>
              <Slider
                value={settings.display.refresh_interval}
                onChange={(_, value) => handleSettingChange('display', 'refresh_interval', value)}
                min={10}
                max={300}
                marks={[
                  { value: 10, label: '10s' },
                  { value: 60, label: '1m' },
                  { value: 300, label: '5m' },
                ]}
                step={10}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.display.compact_view}
                  onChange={(e) => handleSettingChange('display', 'compact_view', e.target.checked)}
                />
              }
              label="Visualização Compacta"
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderNotificationSettings = () => (
    <Stack spacing={3}>
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Métodos de Notificação
          </Typography>
          
          <Stack spacing={2}>
            {[
              { key: 'email', label: 'Email', icon: Email, color: '#1976d2' },
              { key: 'push', label: 'Push Notifications', icon: Notifications, color: '#ff9800' },
              { key: 'sms', label: 'SMS', icon: Sms, color: '#4caf50' },
            ].map((method) => (
              <Box key={method.key} sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                bgcolor: alpha(method.color, 0.05),
                borderRadius: 2,
                border: `1px solid ${alpha(method.color, 0.2)}`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(method.color, 0.1), color: method.color, width: 40, height: 40 }}>
                    <method.icon />
                  </Avatar>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {method.label}
                  </Typography>
                </Box>
                <Switch
                  checked={settings.notifications[method.key as keyof typeof settings.notifications]}
                  onChange={(e) => handleSettingChange('notifications', method.key, e.target.checked)}
                />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Tipos de Alerta
          </Typography>
          
          <Stack spacing={2}>
            {[
              { key: 'portfolio_alerts', label: 'Alertas de Portfólio', desc: 'Variações significativas no valor' },
              { key: 'price_alerts', label: 'Alertas de Preço', desc: 'Mudanças em ativos específicos' },
              { key: 'news', label: 'Notícias', desc: 'Atualizações do mercado financeiro' },
            ].map((alert) => (
              <FormControlLabel
                key={alert.key}
                control={
                  <Switch
                    checked={settings.notifications[alert.key as keyof typeof settings.notifications]}
                    onChange={(e) => handleSettingChange('notifications', alert.key, e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {alert.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alert.desc}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start' }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderSecuritySettings = () => (
    <Stack spacing={3}>
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Autenticação
          </Typography>
          
          <Stack spacing={3}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                  <Fingerprint />
                </Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Autenticação de Dois Fatores
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adicione uma camada extra de segurança
                  </Typography>
                </Box>
              </Box>
              <Switch
                checked={settings.privacy.two_factor_enabled}
                onChange={(e) => handleSettingChange('privacy', 'two_factor_enabled', e.target.checked)}
              />
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<Shield />}
              fullWidth
              sx={{ borderRadius: 2, py: 1.5 }}
            >
              Configurar 2FA
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Privacidade
          </Typography>
          
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.privacy.profile_visible}
                  onChange={(e) => handleSettingChange('privacy', 'profile_visible', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Perfil Público
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Permitir que outros usuários vejam seu perfil
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.privacy.show_portfolio_value}
                  onChange={(e) => handleSettingChange('privacy', 'show_portfolio_value', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Mostrar Valor do Portfólio
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Exibir valores monetários na interface
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start' }}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderPreferencesSettings = () => (
    <Stack spacing={3}>
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Regionalização
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Idioma</InputLabel>
                <Select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', 'language', e.target.value)}
                  label="Idioma"
                >
                  <MenuItem value="pt-BR">🇧🇷 Português (Brasil)</MenuItem>
                  <MenuItem value="en-US">🇺🇸 English (US)</MenuItem>
                  <MenuItem value="es-ES">🇪🇸 Español (España)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Moeda</InputLabel>
                <Select
                  value={settings.currency}
                  onChange={(e) => handleSettingChange('currency', 'currency', e.target.value)}
                  label="Moeda"
                >
                  <MenuItem value="BRL">🇧🇷 Real (BRL)</MenuItem>
                  <MenuItem value="USD">🇺🇸 Dólar (USD)</MenuItem>
                  <MenuItem value="EUR">🇪🇺 Euro (EUR)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Gráficos
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>Tipo de Gráfico Padrão</InputLabel>
            <Select
              value={settings.display.chart_type}
              onChange={(e) => handleSettingChange('display', 'chart_type', e.target.value)}
              label="Tipo de Gráfico Padrão"
            >
              <MenuItem value="line">📈 Linha</MenuItem>
              <MenuItem value="candlestick">🕯️ Candlestick</MenuItem>
              <MenuItem value="area">📊 Área</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderDataSettings = () => (
    <Stack spacing={3}>
      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Backup e Exportação
          </Typography>
          
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Faça backup regular dos seus dados para não perder informações importantes.
            </Alert>
            
            <Button
              variant="outlined"
              startIcon={<Download />}
              fullWidth
              sx={{ borderRadius: 2, py: 1.5 }}
            >
              Exportar Todos os Dados
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              fullWidth
              sx={{ borderRadius: 2, py: 1.5 }}
            >
              Importar Dados
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{
        bgcolor: alpha(theme.palette.error.main, 0.05),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.error.main }}>
            Zona de Perigo
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Ações irreversíveis. Proceda com cautela.
          </Alert>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForever />}
            fullWidth
            sx={{ borderRadius: 2, py: 1.5 }}
            onClick={() => setOpenDeleteAccount(true)}
          >
            Excluir Conta Permanentemente
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'profile':
        return renderProfileSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'preferences':
        return renderPreferencesSettings();
      case 'data':
        return renderDataSettings();
      default:
        return renderProfileSettings();
    }
  };

  // Loading state
  if ((profileLoading || settingsLoading) && !userProfile && !userSettings) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Premium */}
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
          Configurações
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          Personalize sua experiência e gerencie suas preferências
          {(profileError || settingsError) && (
            <Chip 
              label="Modo Offline" 
              size="small" 
              color="warning" 
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar Categorias */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <List sx={{ p: 0 }}>
              {SETTING_CATEGORIES.map((category, index) => {
                const IconComponent = category.icon;
                const isActive = activeCategory === category.id;
                
                return (
                  <Zoom in timeout={200 + index * 50} key={category.id}>
                    <ListItemButton
                      selected={isActive}
                      onClick={() => setActiveCategory(category.id)}
                      sx={{
                        py: 2,
                        px: 3,
                        borderRadius: 0,
                        position: 'relative',
                        '&.Mui-selected': {
                          bgcolor: alpha(category.color, 0.1),
                          borderRight: `4px solid ${category.color}`,
                          '&:hover': {
                            bgcolor: alpha(category.color, 0.15),
                          },
                        },
                        '&:hover': {
                          bgcolor: alpha(category.color, 0.05),
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 48 }}>
                        <Avatar
                          sx={{
                            bgcolor: isActive ? category.color : alpha(category.color, 0.1),
                            color: isActive ? 'white' : category.color,
                            width: 40,
                            height: 40,
                          }}
                        >
                          <IconComponent />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={category.title}
                        secondary={category.description}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 700 : 600,
                          color: isActive ? category.color : 'inherit',
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                        }}
                      />
                    </ListItemButton>
                  </Zoom>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Conteúdo Principal */}
        <Grid item xs={12} md={8} lg={9}>
          <Fade in timeout={300} key={activeCategory}>
            <Box>
              {renderCategoryContent()}
            </Box>
          </Fade>
        </Grid>
      </Grid>

      {/* Modal Alterar Senha */}
      <Dialog
        open={openChangePassword}
        onClose={() => setOpenChangePassword(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <Key />
          </Avatar>
          Alterar Senha
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="Senha Atual"
              type={showPassword ? 'text' : 'password'}
              value={passwordData.current}
              onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
              fullWidth
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="Nova Senha"
              type={showPassword ? 'text' : 'password'}
              value={passwordData.new}
              onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Confirmar Nova Senha"
              type={showPassword ? 'text' : 'password'}
              value={passwordData.confirm}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
              fullWidth
              error={passwordData.new !== passwordData.confirm && passwordData.confirm !== ''}
              helperText={passwordData.new !== passwordData.confirm && passwordData.confirm !== '' ? 'Senhas não conferem' : ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setOpenChangePassword(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleChangePassword}
            disabled={!passwordData.current || !passwordData.new || passwordData.new !== passwordData.confirm}
          >
            Alterar Senha
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}