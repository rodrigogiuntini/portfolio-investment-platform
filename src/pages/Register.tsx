import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Chip,
  Grid,
  Card,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  TrendingUp,
  AccountBalanceWallet,
  Analytics,
  Security,
  AutoAwesome,
  Speed,
  ShowChart,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface RegisterForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const registerUser = useAuthStore((state) => state.register);
  const theme = useTheme();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError('');

    try {
      await registerUser(data.email, data.username, data.password);
      toast.success('Cadastro realizado com sucesso!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar conta');
      toast.error('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
      <Box
        sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.background.default, 0.95)} 0%, 
          ${alpha(theme.palette.background.paper, 0.98)} 35%,
          ${alpha(theme.palette.primary.main, 0.05)} 65%,
          ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60%',
          height: '100%',
          background: `radial-gradient(ellipse at top right, 
            ${alpha(theme.palette.primary.main, 0.1)} 0%, 
            ${alpha(theme.palette.secondary.main, 0.05)} 50%, 
            transparent 70%)`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '40%',
          height: '60%',
          background: `radial-gradient(ellipse at bottom left, 
            ${alpha(theme.palette.secondary.main, 0.08)} 0%, 
            transparent 70%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="xl" sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: { xs: 'flex-start', md: 'center' },
        py: { xs: 2, md: 0 }
      }}>
        <Grid container spacing={{ xs: 0, md: 4, lg: 6 }} sx={{ 
          minHeight: { xs: 'auto', md: '100vh' }, 
          alignItems: { xs: 'flex-start', md: 'center' },
          width: '100%'
        }}>
          {/* Left Side - Register Form */}
          <Grid item xs={12} md={6} lg={5} xl={4}>
            <Box sx={{ 
              px: { xs: 4, sm: 5, md: 4, lg: 5, xl: 6 }, 
              py: { xs: 4, sm: 5, md: 5, lg: 6 },
              maxWidth: { xs: '100%', sm: 520, md: '100%' },
              mx: { xs: 'auto', md: 0 }
            }}>
              {/* Header */}
              <Box sx={{ mb: { xs: 5, sm: 6 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, mb: { xs: 3, sm: 4 } }}>
                  <Box sx={{
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 },
                    borderRadius: 2.5,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}>
                    <TrendingUp sx={{ color: 'white', fontSize: { xs: '1.1rem', sm: '1.3rem' } }} />
                  </Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.text.primary,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
                  }}>
                    Portfolio Pro
                  </Typography>
                </Box>
                
                <Typography sx={{ 
                  fontWeight: 700, 
                  mb: { xs: 1, sm: 1.5 },
                  fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem', lg: '3rem' },
                  lineHeight: { xs: 1.2, sm: 1.167 },
                  background: `linear-gradient(45deg, ${theme.palette.text.primary} 30%, ${theme.palette.primary.main} 90%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Criar conta
            </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ 
                  fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' },
                  lineHeight: 1.6,
                  mb: { xs: 1, sm: 1.5 }
                }}>
                  Comece sua jornada de investimentos
            </Typography>
          </Box>

          {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  }}
                >
              {error}
            </Alert>
          )}

              {/* Register Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ mb: { xs: 3.5, sm: 4 } }}>
                  <Typography variant="body2" sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                    fontSize: { xs: '0.875rem', sm: '0.875rem' }
                  }}>
                    Endereço de e-mail
                  </Typography>
            <TextField
              fullWidth
              id="email"
                    placeholder="Digite seu e-mail"
              autoComplete="email"
              autoFocus
                    variant="outlined"
              {...register('email', {
                required: 'E-mail é obrigatório',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'E-mail inválido',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(10px)',
                        border: `2px solid ${alpha(theme.palette.divider, 0.15)}`,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        minHeight: { xs: 56, sm: 64 },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '& fieldset': {
                          border: 'none',
                        },
                        '&:hover': {
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                        },
                        '&.Mui-focused': {
                          border: `2px solid ${theme.palette.primary.main}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}, 0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
                          transform: 'translateY(-2px)',
                        },
                        '&.Mui-error': {
                          border: `2px solid ${theme.palette.error.main}`,
                          '&:hover': {
                            border: `2px solid ${theme.palette.error.main}`,
                          },
                        },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        '&::placeholder': {
                          color: alpha(theme.palette.text.secondary, 0.6),
                          opacity: 1,
                        },
                      },
                    }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                          <Email sx={{ 
                            color: alpha(theme.palette.text.secondary, 0.7),
                            fontSize: { xs: '1.2rem', sm: '1.3rem' },
                            mr: 0.5
                          }} />
                  </InputAdornment>
                ),
              }}
            />
                </Box>

                <Box sx={{ mb: { xs: 3.5, sm: 4 } }}>
                  <Typography variant="body2" sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                    fontSize: { xs: '0.875rem', sm: '0.875rem' }
                  }}>
                    Nome de usuário
                  </Typography>
            <TextField
              fullWidth
              id="username"
                    placeholder="Digite seu nome de usuário"
              autoComplete="username"
                    variant="outlined"
              {...register('username', {
                required: 'Nome de usuário é obrigatório',
                minLength: {
                  value: 3,
                  message: 'Nome de usuário deve ter no mínimo 3 caracteres',
                },
              })}
              error={!!errors.username}
              helperText={errors.username?.message}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(10px)',
                        border: `2px solid ${alpha(theme.palette.divider, 0.15)}`,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        minHeight: { xs: 56, sm: 64 },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '& fieldset': {
                          border: 'none',
                        },
                        '&:hover': {
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                        },
                        '&.Mui-focused': {
                          border: `2px solid ${theme.palette.primary.main}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}, 0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
                          transform: 'translateY(-2px)',
                        },
                        '&.Mui-error': {
                          border: `2px solid ${theme.palette.error.main}`,
                          '&:hover': {
                            border: `2px solid ${theme.palette.error.main}`,
                          },
                        },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        '&::placeholder': {
                          color: alpha(theme.palette.text.secondary, 0.6),
                          opacity: 1,
                        },
                      },
                    }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                          <Person sx={{ 
                            color: alpha(theme.palette.text.secondary, 0.7),
                            fontSize: { xs: '1.2rem', sm: '1.3rem' },
                            mr: 0.5
                          }} />
                  </InputAdornment>
                ),
              }}
            />
                </Box>

                <Box sx={{ mb: { xs: 3.5, sm: 4 } }}>
                  <Typography variant="body2" sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                    fontSize: { xs: '0.875rem', sm: '0.875rem' }
                  }}>
                    Senha
                  </Typography>
            <TextField
              fullWidth
                    placeholder="Digite sua senha"
              type={showPassword ? 'text' : 'password'}
              id="password"
                    variant="outlined"
              autoComplete="new-password"
              {...register('password', {
                required: 'Senha é obrigatória',
                minLength: {
                  value: 6,
                  message: 'Senha deve ter no mínimo 6 caracteres',
                },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(10px)',
                        border: `2px solid ${alpha(theme.palette.divider, 0.15)}`,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        minHeight: { xs: 56, sm: 64 },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '& fieldset': {
                          border: 'none',
                        },
                        '&:hover': {
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                        },
                        '&.Mui-focused': {
                          border: `2px solid ${theme.palette.primary.main}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}, 0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
                          transform: 'translateY(-2px)',
                        },
                        '&.Mui-error': {
                          border: `2px solid ${theme.palette.error.main}`,
                          '&:hover': {
                            border: `2px solid ${theme.palette.error.main}`,
                          },
                        },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        '&::placeholder': {
                          color: alpha(theme.palette.text.secondary, 0.6),
                          opacity: 1,
                        },
                      },
                    }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                          <Lock sx={{ 
                            color: alpha(theme.palette.text.secondary, 0.7),
                            fontSize: { xs: '1.2rem', sm: '1.3rem' },
                            mr: 0.5
                          }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                            sx={{ 
                              color: alpha(theme.palette.text.secondary, 0.7),
                              p: { xs: 1, sm: 1.5 },
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: theme.palette.primary.main,
                              },
                              transition: 'all 0.2s ease',
                            }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
                </Box>

                <Box sx={{ mb: { xs: 3.5, sm: 4 } }}>
                  <Typography variant="body2" sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                    fontSize: { xs: '0.875rem', sm: '0.875rem' }
                  }}>
                    Confirmar senha
                  </Typography>
            <TextField
              fullWidth
                    placeholder="Digite sua senha novamente"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
                    variant="outlined"
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: 'Confirmação de senha é obrigatória',
                validate: (value) =>
                  value === password || 'As senhas não coincidem',
              })}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(10px)',
                        border: `2px solid ${alpha(theme.palette.divider, 0.15)}`,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        minHeight: { xs: 56, sm: 64 },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '& fieldset': {
                          border: 'none',
                        },
                        '&:hover': {
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                        },
                        '&.Mui-focused': {
                          border: `2px solid ${theme.palette.primary.main}`,
                          bgcolor: alpha(theme.palette.background.paper, 1),
                          boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}, 0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
                          transform: 'translateY(-2px)',
                        },
                        '&.Mui-error': {
                          border: `2px solid ${theme.palette.error.main}`,
                          '&:hover': {
                            border: `2px solid ${theme.palette.error.main}`,
                          },
                        },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        '&::placeholder': {
                          color: alpha(theme.palette.text.secondary, 0.6),
                          opacity: 1,
                        },
                      },
                    }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                          <Lock sx={{ 
                            color: alpha(theme.palette.text.secondary, 0.7),
                            fontSize: { xs: '1.2rem', sm: '1.3rem' },
                            mr: 0.5
                          }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                            sx={{ 
                              color: alpha(theme.palette.text.secondary, 0.7),
                              p: { xs: 1, sm: 1.5 },
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: theme.palette.primary.main,
                              },
                              transition: 'all 0.2s ease',
                            }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
                </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
                  sx={{
                    py: { xs: 1.25, sm: 1.5 },
                    borderRadius: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 600,
                    textTransform: 'none',
                    minHeight: { xs: 48, sm: 56 },
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    '&:hover': {
                      boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      background: theme.palette.grey[300],
                      color: theme.palette.grey[500],
                    },
                    transition: 'all 0.3s ease',
                    mb: { xs: 4, sm: 5 },
                  }}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontSize: { xs: '0.875rem', sm: '0.875rem' }
                  }}>
                Já tem uma conta?{' '}
                    <Link 
                      to="/login" 
                      style={{ 
                        color: theme.palette.primary.main,
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                  Faça login
                </Link>
              </Typography>
            </Box>
          </Box>
            </Box>
          </Grid>

          {/* Right Side - Feature Showcase */}
          <Grid item xs={12} md={6} lg={7} xl={8} sx={{ 
            display: { xs: 'block', md: 'block' }
          }}>
            <Box sx={{ 
              minHeight: { xs: 'auto', md: '100vh' }, 
              display: 'flex', 
              alignItems: { xs: 'flex-start', md: 'center' }, 
              justifyContent: 'center',
              px: { xs: 3, sm: 4, md: 3, lg: 4, xl: 5 },
              py: { xs: 3, sm: 4, md: 4, lg: 5 },
            }}>
              <Box sx={{ 
                maxWidth: { xs: '100%', sm: 540, md: 520, lg: 600, xl: 680 }, 
                width: '100%' 
              }}>
                {/* Feature Cards */}
                <Grid container spacing={{ xs: 2.5, sm: 3, md: 2.5, lg: 3 }}>
                  <Grid item xs={12}>
                    <Typography sx={{ 
                      fontWeight: 700, 
                      mb: { xs: 0.5, sm: 1 },
                      textAlign: 'center',
                      fontSize: { xs: '1.5rem', sm: '2rem', md: '1.75rem', lg: '2.125rem', xl: '2.5rem' },
                      lineHeight: { xs: 1.3, sm: 1.2 },
                      background: `linear-gradient(45deg, ${theme.palette.text.primary} 30%, ${theme.palette.primary.main} 90%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      Comece a investir hoje
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ 
                      textAlign: 'center', 
                      mb: { xs: 3, sm: 4 },
                      fontSize: { xs: '0.95rem', sm: '1.125rem', md: '1rem', lg: '1.125rem' },
                      lineHeight: 1.4
                    }}>
                      Ferramentas profissionais para maximizar seus resultados
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card sx={{
                      p: { xs: 2.5, sm: 3, md: 2.5, lg: 3 },
                      height: { xs: 160, sm: 180, md: 160, lg: 180 },
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderRadius: { xs: 2.5, sm: 3 },
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '40%',
                        height: '100%',
                        background: `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                      },
                    }}>
                      <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Analytics sx={{ 
                          fontSize: { xs: '2rem', sm: '2.5rem', md: '2rem', lg: '2.5rem' }, 
                          color: theme.palette.primary.main,
                          mb: { xs: 1.5, sm: 2 },
                        }} />
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          mb: { xs: 0.75, sm: 1 },
                          fontSize: { xs: '1rem', sm: '1.25rem', md: '1.125rem', lg: '1.25rem' }
                        }}>
                          Análise Avançada
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{
                          fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.8rem', lg: '0.875rem' },
                          lineHeight: { xs: 1.4, sm: 1.43 }
                        }}>
                          Relatórios detalhados e insights para otimizar seus investimentos
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card sx={{
                      p: { xs: 2.5, sm: 3, md: 2.5, lg: 3 },
                      height: { xs: 160, sm: 180, md: 160, lg: 180 },
                      background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                      borderRadius: { xs: 2.5, sm: 3 },
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '40%',
                        height: '100%',
                        background: `radial-gradient(circle at top right, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                      },
                    }}>
                      <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <AccountBalanceWallet sx={{ 
                          fontSize: { xs: '2rem', sm: '2.5rem', md: '2rem', lg: '2.5rem' }, 
                          color: theme.palette.secondary.main,
                          mb: { xs: 1.5, sm: 2 },
                        }} />
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          mb: { xs: 0.75, sm: 1 },
                          fontSize: { xs: '1rem', sm: '1.25rem', md: '1.125rem', lg: '1.25rem' }
                        }}>
                          Múltiplos Portfólios
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{
                          fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.8rem', lg: '0.875rem' },
                          lineHeight: { xs: 1.4, sm: 1.43 }
                        }}>
                          Gerencie diferentes estratégias de investimento simultaneamente
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card sx={{
                      p: { xs: 3, sm: 4, md: 3, lg: 4 },
                      background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      borderRadius: { xs: 2.5, sm: 3 },
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 1.5, sm: 2 }, 
                        mb: { xs: 2.5, sm: 3 }
                      }}>
                        <Speed sx={{ 
                          fontSize: { xs: '1.75rem', sm: '2rem', md: '1.75rem', lg: '2rem' }, 
                          color: theme.palette.success.main,
                          flexShrink: 0,
                        }} />
                        <Box>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 700,
                            fontSize: { xs: '1rem', sm: '1.25rem', md: '1.125rem', lg: '1.25rem' },
                            mb: { xs: 0.5, sm: 0 }
                          }}>
                            Recursos Premium
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{
                            fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.8rem', lg: '0.875rem' },
                            lineHeight: 1.4
                          }}>
                            Acesso completo a todas as funcionalidades da plataforma
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        gap: { xs: 2, sm: 3 }, 
                        flexWrap: 'wrap',
                        justifyContent: { xs: 'center', sm: 'flex-start' }
                      }}>
                        <Chip
                          icon={<ShowChart sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />}
                          label="Gráficos Avançados"
                          sx={{
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main,
                            fontWeight: 600,
                            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.7rem', lg: '0.75rem' },
                            height: { xs: 24, sm: 32 },
                            '& .MuiChip-label': {
                              px: { xs: 1, sm: 1.5 }
                            }
                          }}
                        />
                        <Chip
                          icon={<AutoAwesome sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />}
                          label="IA Insights"
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.7rem', lg: '0.75rem' },
                            height: { xs: 24, sm: 32 },
                            '& .MuiChip-label': {
                              px: { xs: 1, sm: 1.5 }
                            }
                          }}
                        />
                        <Chip
                          icon={<Security sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />}
                          label="Segurança Total"
                          sx={{
                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                            color: theme.palette.secondary.main,
                            fontWeight: 600,
                            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.7rem', lg: '0.75rem' },
                            height: { xs: 24, sm: 32 },
                            '& .MuiChip-label': {
                              px: { xs: 1, sm: 1.5 }
                            }
                          }}
                        />
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
      </Box>
          </Grid>
        </Grid>
    </Container>
    </Box>
  );
}
