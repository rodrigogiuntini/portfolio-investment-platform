from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from enum import Enum

from .. import models, auth
from ..database import get_db

router = APIRouter()

class NotificationType(str, Enum):
    PERFORMANCE = "PERFORMANCE"
    RISK = "RISK"
    OPPORTUNITY = "OPPORTUNITY"
    DIVIDEND = "DIVIDEND"
    REBALANCE = "REBALANCE"
    MILESTONE = "MILESTONE"
    ALERT = "ALERT"

class NotificationPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    created_at: datetime
    read: bool = False
    action_url: Optional[str] = None
    icon: str
    color: str

def analyze_portfolio_performance(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Analisa performance dos portfólios e gera notificações relevantes"""
    notifications = []
    
    # Buscar portfólios do usuário
    portfolios = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == user_id
    ).all()
    
    for portfolio in portfolios:
        # Calcular métricas do portfólio
        positions = db.query(models.Position).filter(
            models.Position.portfolio_id == portfolio.id
        ).all()
        
        if not positions:
            continue
            
        total_invested = sum(pos.total_invested or 0 for pos in positions)
        total_current = sum(pos.current_value or 0 for pos in positions)
        total_return = total_current - total_invested
        return_percentage = (total_return / total_invested * 100) if total_invested > 0 else 0
        
        # Notificação de performance excepcional (positiva)
        if return_percentage > 20:
            notifications.append({
                "type": NotificationType.PERFORMANCE,
                "priority": NotificationPriority.HIGH,
                "title": f"🚀 Excelente Performance!",
                "message": f"Seu portfólio '{portfolio.name}' está com retorno de {return_percentage:.1f}%",
                "data": {
                    "portfolio_id": portfolio.id,
                    "portfolio_name": portfolio.name,
                    "return_percentage": return_percentage,
                    "return_value": total_return
                },
                "action_url": f"/portfolios/{portfolio.id}",
                "icon": "TrendingUp",
                "color": "#4CAF50"
            })
        
        # Notificação de performance preocupante (negativa)
        elif return_percentage < -15:
            notifications.append({
                "type": NotificationType.RISK,
                "priority": NotificationPriority.HIGH,
                "title": f"⚠️ Atenção: Perda Significativa",
                "message": f"Portfólio '{portfolio.name}' com perda de {abs(return_percentage):.1f}%",
                "data": {
                    "portfolio_id": portfolio.id,
                    "portfolio_name": portfolio.name,
                    "return_percentage": return_percentage,
                    "return_value": total_return
                },
                "action_url": f"/portfolios/{portfolio.id}",
                "icon": "TrendingDown",
                "color": "#F44336"
            })
        
        # Análise de concentração de risco
        if len(positions) > 0:
            # Calcular concentração (peso do maior ativo)
            max_position_value = max(pos.current_value or 0 for pos in positions)
            concentration = (max_position_value / total_current * 100) if total_current > 0 else 0
            
            if concentration > 40:  # Mais de 40% em um único ativo
                largest_position = max(positions, key=lambda p: p.current_value or 0)
                notifications.append({
                    "type": NotificationType.RISK,
                    "priority": NotificationPriority.MEDIUM,
                    "title": "🎯 Concentração de Risco",
                    "message": f"Portfólio '{portfolio.name}': {concentration:.1f}% em {largest_position.asset.symbol}",
                    "data": {
                        "portfolio_id": portfolio.id,
                        "portfolio_name": portfolio.name,
                        "concentration": concentration,
                        "asset_symbol": largest_position.asset.symbol,
                        "asset_name": largest_position.asset.name
                    },
                    "action_url": f"/optimization",
                    "icon": "PieChart",
                    "color": "#FF9800"
                })
        
        # Oportunidade de rebalanceamento
        if len(positions) >= 3 and abs(return_percentage) > 5:
            notifications.append({
                "type": NotificationType.REBALANCE,
                "priority": NotificationPriority.MEDIUM,
                "title": "⚖️ Oportunidade de Rebalanceamento",
                "message": f"Considere rebalancear '{portfolio.name}' para otimizar retornos",
                "data": {
                    "portfolio_id": portfolio.id,
                    "portfolio_name": portfolio.name,
                    "num_assets": len(positions)
                },
                "action_url": f"/optimization",
                "icon": "Tune",
                "color": "#9C27B0"
            })
    
    return notifications

def analyze_dividend_opportunities(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Analisa oportunidades e alertas relacionados a dividendos"""
    notifications = []
    
    # Buscar dividendos recentes (últimos 30 dias)
    recent_date = datetime.now() - timedelta(days=30)
    recent_dividends = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.transaction_type == models.TransactionType.DIVIDEND,
        models.Transaction.date >= recent_date
    ).all()
    
    if recent_dividends:
        total_dividends = sum(t.total_amount or 0 for t in recent_dividends)
        if total_dividends > 100:  # Mais de R$ 100 em dividendos
            notifications.append({
                "type": NotificationType.DIVIDEND,
                "priority": NotificationPriority.MEDIUM,
                "title": "💰 Dividendos Recebidos",
                "message": f"Você recebeu R$ {total_dividends:.2f} em dividendos nos últimos 30 dias",
                "data": {
                    "total_dividends": total_dividends,
                    "num_payments": len(recent_dividends),
                    "period_days": 30
                },
                "action_url": "/dividends",
                "icon": "MonetizationOn",
                "color": "#4CAF50"
            })
    
    return notifications

def analyze_milestones(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Analisa marcos importantes atingidos pelo usuário"""
    notifications = []
    
    # Calcular patrimônio total
    portfolios = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == user_id
    ).all()
    
    total_patrimony = 0
    total_invested = 0
    
    for portfolio in portfolios:
        positions = db.query(models.Position).filter(
            models.Position.portfolio_id == portfolio.id
        ).all()
        
        portfolio_current = sum(pos.current_value or 0 for pos in positions)
        portfolio_invested = sum(pos.total_invested or 0 for pos in positions)
        
        total_patrimony += portfolio_current
        total_invested += portfolio_invested
    
    # Marcos de patrimônio
    milestones = [10000, 50000, 100000, 250000, 500000, 1000000]
    
    for milestone in milestones:
        if total_patrimony >= milestone and total_invested < milestone:
            # Atingiu o marco através de valorização
            notifications.append({
                "type": NotificationType.MILESTONE,
                "priority": NotificationPriority.HIGH,
                "title": f"🎉 Marco Atingido!",
                "message": f"Parabéns! Seu patrimônio atingiu R$ {milestone:,.2f}",
                "data": {
                    "milestone": milestone,
                    "current_patrimony": total_patrimony,
                    "total_invested": total_invested,
                    "gain": total_patrimony - total_invested
                },
                "action_url": "/dashboard",
                "icon": "EmojiEvents",
                "color": "#FFD700"
            })
            break  # Apenas o primeiro marco atingido
    
    # Marco de diversificação
    all_positions = []
    for portfolio in portfolios:
        positions = db.query(models.Position).filter(
            models.Position.portfolio_id == portfolio.id
        ).all()
        all_positions.extend(positions)
    
    unique_assets = len(set(pos.asset_id for pos in all_positions))
    
    if unique_assets >= 10 and unique_assets % 5 == 0:  # A cada 5 ativos a partir de 10
        notifications.append({
            "type": NotificationType.MILESTONE,
            "priority": NotificationPriority.MEDIUM,
            "title": "🎯 Portfólio Diversificado",
            "message": f"Excelente! Você possui {unique_assets} ativos diferentes",
            "data": {
                "num_assets": unique_assets,
                "num_portfolios": len(portfolios)
            },
            "action_url": "/assets",
            "icon": "Diversity3",
            "color": "#2196F3"
        })
    
    return notifications

def analyze_market_opportunities(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Analisa oportunidades baseadas em dados do mercado e portfólio"""
    notifications = []
    
    # Buscar ativos com performance muito diferente da média
    portfolios = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == user_id
    ).all()
    
    all_positions = []
    for portfolio in portfolios:
        positions = db.query(models.Position).filter(
            models.Position.portfolio_id == portfolio.id
        ).all()
        all_positions.extend(positions)
    
    if all_positions:
        # Calcular performance média
        returns = []
        for pos in all_positions:
            if pos.total_invested and pos.total_invested > 0:
                return_pct = ((pos.current_value or 0) - pos.total_invested) / pos.total_invested * 100
                returns.append(return_pct)
        
        if returns:
            avg_return = sum(returns) / len(returns)
            
            # Encontrar outliers (muito acima ou abaixo da média)
            for pos in all_positions:
                if pos.total_invested and pos.total_invested > 0:
                    return_pct = ((pos.current_value or 0) - pos.total_invested) / pos.total_invested * 100
                    
                    # Ativo com performance muito superior
                    if return_pct > avg_return + 20:
                        notifications.append({
                            "type": NotificationType.OPPORTUNITY,
                            "priority": NotificationPriority.MEDIUM,
                            "title": "⭐ Ativo em Destaque",
                            "message": f"{pos.asset.symbol} está {return_pct:.1f}% acima da média",
                            "data": {
                                "asset_symbol": pos.asset.symbol,
                                "asset_name": pos.asset.name,
                                "return_percentage": return_pct,
                                "avg_return": avg_return,
                                "difference": return_pct - avg_return
                            },
                            "action_url": f"/assets",
                            "icon": "Star",
                            "color": "#FFD700"
                        })
                    
                    # Ativo com performance muito inferior (possível oportunidade de compra)
                    elif return_pct < avg_return - 20:
                        notifications.append({
                            "type": NotificationType.OPPORTUNITY,
                            "priority": NotificationPriority.LOW,
                            "title": "🔍 Possível Oportunidade",
                            "message": f"{pos.asset.symbol} pode estar em desconto ({return_pct:.1f}%)",
                            "data": {
                                "asset_symbol": pos.asset.symbol,
                                "asset_name": pos.asset.name,
                                "return_percentage": return_pct,
                                "avg_return": avg_return,
                                "difference": return_pct - avg_return
                            },
                            "action_url": f"/assets",
                            "icon": "TrendingDown",
                            "color": "#2196F3"
                        })
    
    return notifications

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = 20,
    priority: Optional[NotificationPriority] = None,
    type: Optional[NotificationType] = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Busca notificações inteligentes baseadas nos dados do usuário"""
    
    try:
        all_notifications = []
        
        # Analisar diferentes aspectos do portfólio
        performance_notifications = analyze_portfolio_performance(db, current_user.id)
        dividend_notifications = analyze_dividend_opportunities(db, current_user.id)
        milestone_notifications = analyze_milestones(db, current_user.id)
        opportunity_notifications = analyze_market_opportunities(db, current_user.id)
        
        all_notifications.extend(performance_notifications)
        all_notifications.extend(dividend_notifications)
        all_notifications.extend(milestone_notifications)
        all_notifications.extend(opportunity_notifications)
        
        # Filtrar por tipo se especificado
        if type:
            all_notifications = [n for n in all_notifications if n["type"] == type]
        
        # Filtrar por prioridade se especificado
        if priority:
            all_notifications = [n for n in all_notifications if n["priority"] == priority]
        
        # Ordenar por prioridade e data
        priority_order = {
            NotificationPriority.CRITICAL: 4,
            NotificationPriority.HIGH: 3,
            NotificationPriority.MEDIUM: 2,
            NotificationPriority.LOW: 1
        }
        
        all_notifications.sort(
            key=lambda x: (priority_order.get(x["priority"], 0), x.get("created_at", datetime.now())),
            reverse=True
        )
        
        # Limitar resultados
        all_notifications = all_notifications[:limit]
        
        # Converter para formato de resposta
        notifications = []
        for i, notif in enumerate(all_notifications):
            notifications.append(NotificationResponse(
                id=f"notif_{i}_{current_user.id}",
                type=notif["type"],
                priority=notif["priority"],
                title=notif["title"],
                message=notif["message"],
                data=notif.get("data"),
                created_at=datetime.now(),
                read=False,
                action_url=notif.get("action_url"),
                icon=notif["icon"],
                color=notif["color"]
            ))
        
        return notifications
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar notificações: {str(e)}")

@router.get("/summary")
def get_notifications_summary(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retorna resumo das notificações por tipo e prioridade"""
    
    try:
        # Buscar todas as notificações
        notifications_response = get_notifications(limit=100, current_user=current_user, db=db)
        
        # Contar por tipo
        type_counts = {}
        priority_counts = {}
        
        for notif in notifications_response:
            # Contar por tipo
            type_counts[notif.type] = type_counts.get(notif.type, 0) + 1
            
            # Contar por prioridade
            priority_counts[notif.priority] = priority_counts.get(notif.priority, 0) + 1
        
        return {
            "total": len(notifications_response),
            "by_type": type_counts,
            "by_priority": priority_counts,
            "has_critical": priority_counts.get(NotificationPriority.CRITICAL, 0) > 0,
            "has_high": priority_counts.get(NotificationPriority.HIGH, 0) > 0,
            "unread_count": len(notifications_response)  # Todas são não lidas por enquanto
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar resumo: {str(e)}")

@router.post("/mark-read/{notification_id}")
def mark_notification_read(
    notification_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Marca uma notificação como lida"""
    
    # Por enquanto, apenas retorna sucesso
    # Em uma implementação completa, isso seria salvo no banco de dados
    return {"success": True, "notification_id": notification_id}

@router.post("/mark-all-read")
def mark_all_notifications_read(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Marca todas as notificações como lidas"""
    
    # Por enquanto, apenas retorna sucesso
    # Em uma implementação completa, isso seria salvo no banco de dados
    return {"success": True, "marked_count": 0}
