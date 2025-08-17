#!/usr/bin/env python3

from app.database import get_db
from app.models import User, Portfolio, Asset, Transaction, Position, Price
from datetime import datetime, date
from decimal import Decimal

def recreate_sample_data():
    """Recreate sample data that was lost"""
    
    # Get database session
    db = next(get_db())

    print('Recriando dados de exemplo...')

    # 1. Get user
    user = db.query(User).filter(User.username == 'rodrigo.giuntini@gmail.com').first()
    if not user:
        print('Usuário não encontrado!')
        return
    print(f'Usuário: {user.username} (ID: {user.id})')

    # 2. Get or create assets
    ccj_asset = db.query(Asset).filter(Asset.symbol == 'CCJ').first()
    if not ccj_asset:
        ccj_asset = Asset(
            symbol='CCJ',
            name='Cameco Corporation',
            asset_type='STOCK',
            exchange='NYSE'
        )
        db.add(ccj_asset)
    
    aapl_asset = db.query(Asset).filter(Asset.symbol == 'AAPL').first()
    if not aapl_asset:
        aapl_asset = Asset(
            symbol='AAPL',  
            name='Apple Inc.',
            asset_type='STOCK',
            exchange='NASDAQ'
        )
        db.add(aapl_asset)

    db.commit()
    print(f'Assets: CCJ (ID: {ccj_asset.id}), AAPL (ID: {aapl_asset.id})')

    # 3. Create portfolio
    portfolio = Portfolio(
        name='Portifolio',
        description='Portfólio de investimentos principal',
        currency='BRL',
        benchmark='CDI',
        owner_id=user.id
    )

    db.add(portfolio)
    db.commit()
    print(f'Portfolio criado: {portfolio.name} (ID: {portfolio.id})')

    # 4. Create transactions for CCJ
    ccj_transactions = [
        Transaction(
            portfolio_id=portfolio.id,
            asset_id=ccj_asset.id,
            transaction_type='BUY',
            date=date(2024, 1, 15),
            quantity=10,
            price=Decimal('70.50'),
            total_amount=Decimal('705.00'),
            currency='USD'
        ),
        Transaction(
            portfolio_id=portfolio.id,
            asset_id=ccj_asset.id,
            transaction_type='BUY', 
            date=date(2024, 2, 20),
            quantity=20,
            price=Decimal('78.08'),
            total_amount=Decimal('1561.65'),
            currency='USD'
        )
    ]

    # 5. Create transactions for AAPL
    aapl_transactions = [
        Transaction(
            portfolio_id=portfolio.id,
            asset_id=aapl_asset.id,
            transaction_type='BUY',
            date=date(2024, 1, 10),
            quantity=100,
            price=Decimal('185.50'),
            total_amount=Decimal('18550.00'),
            currency='USD'
        ),
        Transaction(
            portfolio_id=portfolio.id,
            asset_id=aapl_asset.id,
            transaction_type='BUY',
            date=date(2024, 3, 15),
            quantity=200,
            price=Decimal('172.45'),
            total_amount=Decimal('34490.00'),
            currency='USD'
        )
    ]

    for t in ccj_transactions + aapl_transactions:
        db.add(t)

    db.commit()
    print(f'Transações criadas: {len(ccj_transactions + aapl_transactions)} total')

    # 6. Create positions
    ccj_position = Position(
        portfolio_id=portfolio.id,
        asset_id=ccj_asset.id,
        quantity=30,  # 10 + 20
        average_price=Decimal('75.58'),  # weighted average
        total_invested=Decimal('2266.65'),  # 705 + 1561.65
        current_price=Decimal('75.60'),
        current_value=Decimal('2268.00')  # 30 * 75.60
    )

    aapl_position = Position(
        portfolio_id=portfolio.id,
        asset_id=aapl_asset.id,
        quantity=300,  # 100 + 200
        average_price=Decimal('176.80'),  # weighted average
        total_invested=Decimal('53040.00'),  # 18550 + 34490
        current_price=Decimal('176.80'),
        current_value=Decimal('53040.00')  # 300 * 176.80
    )

    db.add(ccj_position)
    db.add(aapl_position)
    db.commit()
    print(f'Posições criadas: CCJ ({ccj_position.quantity} ações), AAPL ({aapl_position.quantity} ações)')

    # 7. Create current prices
    ccj_price = Price(
        asset_id=ccj_asset.id,
        date=date.today(),
        open=Decimal('75.50'),
        high=Decimal('76.00'),
        low=Decimal('75.20'),
        close=Decimal('75.60'),
        volume=1000000
    )

    aapl_price = Price(
        asset_id=aapl_asset.id,
        date=date.today(),
        open=Decimal('176.50'),
        high=Decimal('177.00'),
        low=Decimal('176.00'),
        close=Decimal('176.80'),
        volume=50000000
    )

    db.add(ccj_price)
    db.add(aapl_price)
    db.commit()
    print(f'Preços atuais criados: CCJ ${ccj_price.close}, AAPL ${aapl_price.close}')

    print('\n✅ Dados de exemplo recriados com sucesso!')
    print(f'Total investido: ${ccj_position.total_invested + aapl_position.total_invested}')
    print(f'Valor atual: ${ccj_position.current_value + aapl_position.current_value}')

    db.close()

if __name__ == '__main__':
    recreate_sample_data()
