import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip,
  Tooltip,
  useTheme,
  alpha,
  Fade,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  AccountBalance,
  SwapHoriz,
  TrendingUp,
  FileUpload,
  Assessment,
  Functions,
  MonetizationOn,
  Settings,
  Notifications,
  Logout,
  Person,
  ChevronLeft,
  ChevronRight,
  ShowChart,
  PieChart,
  BarChart,
  Timeline,
  TrendingDown,
  AccountBalanceWallet,
  CreditCard,
  Savings,
  Analytics,
  Speed,
  Star,
  FiberNew,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const drawerWidth = 260;

const menuSections = [
  {
    title: 'Visão Geral',
    items: [
      { 
        text: 'Dashboard', 
        icon: <Speed />, 
        path: '/dashboard',
        description: 'Visão geral dos investimentos',
        badge: null,
        color: '#2196F3'
      },
    ]
  },
  {
    title: 'Gestão de Portfólio',
    items: [
      { 
        text: 'Portfólios', 
        icon: <AccountBalanceWallet />, 
        path: '/portfolios',
        description: 'Gerenciar carteiras de investimento',
        badge: null,
        color: '#4CAF50'
      },
      { 
        text: 'Transações', 
        icon: <SwapHoriz />, 
        path: '/transactions',
        description: 'Histórico de compras e vendas',
        badge: null,
        color: '#FF9800'
      },
      { 
        text: 'Ativos', 
        icon: <ShowChart />, 
        path: '/assets',
        description: 'Ações, FIIs e investimentos',
        badge: null,
        color: '#E91E63'
      },
    ]
  },
  {
    title: 'Rendimentos',
    items: [
      { 
        text: 'Dividendos', 
        icon: <MonetizationOn />, 
        path: '/dividends',
        description: 'Renda passiva e proventos',
        badge: { text: 'NOVO', color: 'success' },
        color: '#8BC34A'
      },
    ]
  },
  {
    title: 'Análises',
    items: [
      { 
        text: 'Relatórios', 
        icon: <Assessment />, 
        path: '/reports',
        description: 'Análises e métricas detalhadas',
        badge: null,
        color: '#9C27B0'
      },
      { 
        text: 'Otimização', 
        icon: <Functions />, 
        path: '/optimization',
        description: 'Markowitz e Monte Carlo',
        badge: 'PRO',
        color: '#FF5722'
      },
    ]
  },
  {
    title: 'Ferramentas',
    items: [
      { 
        text: 'Importar Dados', 
        icon: <FileUpload />, 
        path: '/import',
        description: 'Importar planilhas e dados',
        badge: null,
        color: '#607D8B',
        disabled: true
      },
      { 
        text: 'Configurações', 
        icon: <Settings />, 
        path: '/settings',
        description: 'Preferências e configurações',
        badge: null,
        color: '#795548'
      },
    ]
  }
];

export default function Layout() {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, logout } = useAuthStore();

  // Buscar notificações
  const { data: notificationsSummary } = useQuery({
    queryKey: ['notifications-summary'],
    queryFn: async () => {
      const response = await api.get('/api/notifications/summary');
      return response.data;
    },
    refetchInterval: 60000, // Atualizar a cada minuto
    retry: 1,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/api/notifications?limit=10');
      return response.data;
    },
    refetchInterval: 60000, // Atualizar a cada minuto
    retry: 1,
  });

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleNotificationItemClick = (notification: any) => {
    if (notification.action_url) {
      navigate(notification.action_url);
    }
    handleNotificationClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.98)} 0%, 
            ${alpha(theme.palette.background.default, 0.96)} 50%,
            ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
          backdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 1px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, 
              ${alpha(theme.palette.primary.main, 0.02)} 0%, 
              ${alpha(theme.palette.secondary.main, 0.015)} 50%, 
              ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            pointerEvents: 'none',
          },
          transition: theme.transitions.create(['width', 'margin', 'box-shadow'], {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.standard,
            }),
          ...(open && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: theme.transitions.create(['width', 'margin', 'box-shadow'], {
                easing: theme.transitions.easing.easeInOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }),
        }}
      >
        <Toolbar sx={{ px: 3 }}>
          <IconButton
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{
              mr: 3,
              width: 44,
              height: 44,
              color: theme.palette.text.primary,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              backdropFilter: 'blur(12px)',
              boxShadow: `0 2px 16px ${alpha(theme.palette.primary.main, 0.08)}`,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                borderColor: alpha(theme.palette.primary.main, 0.2),
                transform: 'translateY(-1px) scale(1.02)',
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
              },
              '&:active': {
                transform: 'translateY(0) scale(0.98)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: 2.5,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(45deg, 
                  ${alpha(theme.palette.primary.main, 0.03)} 0%, 
                  transparent 100%)`,
                pointerEvents: 'none',
              },
            }}
          >
            {open ? 
              <ChevronLeft sx={{ fontSize: '1.3rem', color: theme.palette.text.primary }} /> : 
              <MenuIcon sx={{ fontSize: '1.3rem', color: theme.palette.text.primary }} />
            }
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.6),
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              backdropFilter: 'blur(8px)',
            }}>
              <Typography 
                variant="h6" 
                noWrap 
                component="div" 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.text.primary} 30%, ${theme.palette.primary.main} 90%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.3px',
                  fontSize: '1.1rem'
                }}
              >
                Portfolio Manager
              </Typography>
              <Chip 
                label="PRO"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: theme.palette.primary.main,
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  height: 22,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  '& .MuiChip-label': { px: 1.2 }
                }}
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title="Notificações" arrow placement="bottom">
              <IconButton 
                onClick={handleNotificationClick}
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                  backdropFilter: 'blur(8px)',
                  boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.06)}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.12)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 2.5,
                }}
              >
                <Badge 
                  badgeContent={notificationsSummary?.unread_count || 0}
                  color={notificationsSummary?.has_critical ? "error" : notificationsSummary?.has_high ? "warning" : "primary"}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      minWidth: 18,
                      height: 18,
                      boxShadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.4)}`,
                    }
                  }}
                >
                  <Notifications sx={{ 
                    fontSize: '1.2rem', 
                    color: theme.palette.text.primary 
                  }} />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Perfil do usuário" arrow placement="bottom">
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                  backdropFilter: 'blur(8px)',
                  boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.06)}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    transform: 'scale(1.05)',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.12)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 2.5,
                  p: 0.3,
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 34, 
                    height: 34,
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main,
                    fontWeight: 700,
                    fontSize: '1rem',
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1.5,
                borderRadius: 3,
                minWidth: 220,
                bgcolor: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                '& .MuiMenuItem-root': {
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                },
              }
            }}
          >
            <MenuItem 
              disabled
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                '&.Mui-disabled': {
                  opacity: 1,
                },
              }}
            >
              <ListItemIcon>
                <Avatar sx={{ 
                  width: 24, 
                  height: 24, 
                  bgcolor: theme.palette.primary.main,
                  fontSize: '0.8rem'
                }}>
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemIcon>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem 
              onClick={() => navigate('/settings')}
              sx={{
                '&:hover .MuiListItemIcon-root': {
                  color: theme.palette.primary.main,
                },
              }}
            >
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Configurações
              </Typography>
            </MenuItem>
            <MenuItem 
              onClick={handleLogout}
              sx={{
                color: theme.palette.error.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                },
                '&:hover .MuiListItemIcon-root': {
                  color: theme.palette.error.main,
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <Logout fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Sair
              </Typography>
            </MenuItem>
          </Menu>

          {/* Menu de Notificações */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 380,
                maxWidth: 420,
                maxHeight: 500,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
              }
            }}
          >
            {/* Header do Menu */}
            <Box sx={{ 
              p: 2, 
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notificações
              </Typography>
              <Chip 
                label={notificationsSummary?.total || 0}
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* Lista de Notificações */}
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {notifications.length > 0 ? (
                notifications.map((notification: any, index: number) => (
                  <MenuItem
                    key={notification.id || index}
                    onClick={() => handleNotificationItemClick(notification)}
                    sx={{
                      p: 2,
                      borderBottom: index < notifications.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.05)}` : 'none',
                      alignItems: 'flex-start',
                      minHeight: 'auto',
                      '&:hover': {
                        bgcolor: alpha(notification.color || theme.palette.primary.main, 0.05),
                      }
                    }}
                  >
                    <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: alpha(notification.color || theme.palette.primary.main, 0.1),
                          color: notification.color || theme.palette.primary.main,
                          fontSize: '0.9rem'
                        }}
                      >
                        {notification.icon === 'TrendingUp' && '📈'}
                        {notification.icon === 'TrendingDown' && '📉'}
                        {notification.icon === 'MonetizationOn' && '💰'}
                        {notification.icon === 'PieChart' && '🎯'}
                        {notification.icon === 'Star' && '⭐'}
                        {notification.icon === 'Tune' && '⚖️'}
                        {notification.icon === 'EmojiEvents' && '🎉'}
                        {notification.icon === 'Diversity3' && '🎯'}
                        {!['TrendingUp', 'TrendingDown', 'MonetizationOn', 'PieChart', 'Star', 'Tune', 'EmojiEvents', 'Diversity3'].includes(notification.icon) && '🔔'}
                      </Avatar>
                    </ListItemIcon>
                    <Box sx={{ flex: 1, ml: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          mb: 0.5,
                          lineHeight: 1.3
                        }}
                      >
                        {notification.title}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: 'block',
                          lineHeight: 1.4
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Chip
                          label={notification.priority}
                          size="small"
                          color={
                            notification.priority === 'CRITICAL' ? 'error' :
                            notification.priority === 'HIGH' ? 'warning' :
                            notification.priority === 'MEDIUM' ? 'info' : 'default'
                          }
                          sx={{ 
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Agora
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))
              ) : (
                <Box sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  color: 'text.secondary'
                }}>
                  <Notifications sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Nenhuma notificação
                  </Typography>
                  <Typography variant="caption">
                    Você está em dia com tudo!
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Footer do Menu */}
            {notifications.length > 0 && (
              <Box sx={{ 
                p: 1.5, 
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                textAlign: 'center'
              }}>
                <Button
                  size="small"
                  onClick={() => {
                    // TODO: Implementar "ver todas"
                    handleNotificationClose();
                  }}
                  sx={{ fontWeight: 600 }}
                >
                  Ver todas as notificações
                </Button>
              </Box>
            )}
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : 72,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 72,
            boxSizing: 'border-box',
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.standard,
              }),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Toolbar sx={{ minHeight: '40px !important', height: '40px' }} />
        
        {/* Header da Sidebar */}
        <Box sx={{ 
          p: open ? '0.5rem 1.5rem 1.2rem' : '0.4rem 1rem 1rem', 
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: open ? 'flex-start' : 'center',
          flexShrink: 0,
          minHeight: 'auto',
        }}>
          <Fade in={open} timeout={300}>
            <Box sx={{ display: open ? 'block' : 'none' }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.3,
                  fontSize: '1rem',
                  lineHeight: 1.2,
                }}
              >
                Portfolio Pro
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  lineHeight: 1.1,
                }}
              >
                Gestão Inteligente de Investimentos
              </Typography>
            </Box>
          </Fade>
          
          {!open && (
            <Box sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#fff',
              boxShadow: theme.shadows[2],
            }}>
              P
            </Box>
          )}
        </Box>

                <Box sx={{ 
          flex: 1, 
          py: 0.3,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(theme.palette.primary.main, 0.3),
            borderRadius: '2px',
          },
        }}>
          {menuSections.map((section, sectionIndex) => (
            <Box key={section.title} sx={{ mb: 0.3 }}>
              {open && (
                <Typography 
                  variant="overline" 
                  sx={{ 
                    px: 2,
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                    fontSize: '0.55rem',
                    letterSpacing: '0.6px',
                    display: 'block',
                    mb: 0.2,
                    mt: sectionIndex === 0 ? 0 : 0.3,
                  }}
                >
                  {section.title}
                </Typography>
              )}
              
              <List sx={{ py: 0 }}>
                {section.items.map((item) => {
                  const isSelected = location.pathname === item.path;
                  const isHovered = hoveredItem === item.path;
                  
                  return (
                    <Tooltip 
                      key={item.text}
                      title={!open ? `${item.text} - ${item.description}` : ''}
                      placement="right"
                      arrow
                    >
                      <ListItem 
                        disablePadding 
                        sx={{ 
                          px: open ? 0.8 : 0.3,
                          mb: 0.1,
                        }}
                      >
                        <ListItemButton
                          selected={isSelected}
                          disabled={item.disabled}
                          onClick={() => !item.disabled && navigate(item.path)}
                          onMouseEnter={() => !item.disabled && setHoveredItem(item.path)}
                          onMouseLeave={() => setHoveredItem(null)}
                          sx={{
                            minHeight: 36,
                            borderRadius: 1.5,
                            px: open ? 1 : 0.7,
                            mx: 0.1,
                            justifyContent: open ? 'flex-start' : 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            bgcolor: item.disabled
                              ? alpha(theme.palette.action.disabled, 0.05)
                              : isSelected 
                                ? alpha(item.color, 0.15)
                                : isHovered 
                                  ? alpha(item.color, 0.08)
                                  : 'transparent',
                            border: item.disabled
                              ? `1px solid ${alpha(theme.palette.action.disabled, 0.1)}`
                              : isSelected 
                                ? `1px solid ${alpha(item.color, 0.3)}`
                                : `1px solid transparent`,
                            '&:hover': item.disabled ? {} : {
                              bgcolor: alpha(item.color, 0.12),
                              transform: 'translateY(-1px)',
                              boxShadow: `0 4px 20px ${alpha(item.color, 0.25)}`,
                            },
                            '&.Mui-disabled': {
                              opacity: 0.5,
                              cursor: 'not-allowed',
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: 3,
                              height: '100%',
                              bgcolor: isSelected ? item.color : 'transparent',
                              transition: 'all 0.2s ease',
                            },
                            transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                              mr: open ? 1.2 : 0,
                      justifyContent: 'center',
                              color: isSelected 
                                ? item.color 
                                : isHovered 
                                  ? item.color
                                  : theme.palette.text.primary,
                              '& svg': {
                                fontSize: '1.1rem',
                                filter: isSelected 
                                  ? `drop-shadow(0 2px 4px ${alpha(item.color, 0.3)})`
                                  : 'none',
                              },
                              transition: 'all 0.2s ease',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                          
                          <Fade in={open} timeout={200}>
                            <Box sx={{ display: open ? 'flex' : 'none', flex: 1, alignItems: 'center' }}>
                              <Box sx={{ flex: 1 }}>
                  <ListItemText 
                    primary={item.text} 
                                  secondary={item.description}
                                  primaryTypographyProps={{
                                    fontWeight: isSelected ? 600 : 500,
                                    color: isSelected ? item.color : theme.palette.text.primary,
                                    fontSize: '0.8rem',
                                    lineHeight: 1.1,
                                  }}
                                  secondaryTypographyProps={{
                                    fontSize: '0.65rem',
                                    color: theme.palette.text.secondary,
                                    sx: { 
                                      mt: 0,
                                      opacity: isSelected ? 0.8 : 0.6,
                                      lineHeight: 1,
                                    }
                                  }}
                                />
                              </Box>
                              
                              {item.badge && (
                                <Chip
                                  label={item.badge.text}
                                  size="small"
                                  color={item.badge.color as any}
                                  sx={{
                                    height: 16,
                                    fontSize: '0.55rem',
                                    fontWeight: 600,
                                    '& .MuiChip-label': {
                                      px: 0.6,
                                    },
                                  }}
                                />
                              )}
                              
                              {isSelected && (
                                <ChevronRight 
                                  sx={{ 
                                    color: item.color,
                                    fontSize: '1rem',
                                    ml: 1,
                                  }} 
                                />
                              )}
                            </Box>
                          </Fade>
                </ListItemButton>
              </ListItem>
                    </Tooltip>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Footer da Sidebar */}
        <Box sx={{ 
          p: open ? 0.8 : 0.6, 
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: alpha(theme.palette.primary.main, 0.02),
          flexShrink: 0,
        }}>
          {open ? (
            <Box sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              borderRadius: 1.5,
              p: 0.8,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.2, fontSize: '0.7rem' }}>
                🚀 Performance
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Portfolio
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.success.main, fontWeight: 600, fontSize: '0.7rem' }}>
                  +2.34%
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
            }}>
              <TrendingUp sx={{ color: theme.palette.success.main, fontSize: '0.9rem' }} />
            </Box>
          )}
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          pt: 1,
          width: `calc(100% - ${open ? drawerWidth : 60}px)`,
          ml: open ? 0 : `60px`,
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important' }} />
        <Box sx={{ pt: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
