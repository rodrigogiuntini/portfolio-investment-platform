"""add user profile and settings tables manual

Revision ID: 33249e032ef1
Revises: feae072ae4c4
Create Date: 2025-08-15 00:56:09.948051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '33249e032ef1'
down_revision: Union[str, Sequence[str], None] = 'feae072ae4c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create new enum types (check if they exist first)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE thememode AS ENUM ('LIGHT', 'DARK', 'AUTO');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE language AS ENUM ('PT_BR', 'EN_US', 'ES_ES');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE charttype AS ENUM ('LINE', 'CANDLESTICK', 'AREA');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create user_profiles table using SQL
    op.execute("""
        CREATE TABLE user_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
            name VARCHAR,
            bio TEXT,
            phone VARCHAR,
            location VARCHAR,
            avatar_url VARCHAR,
            website VARCHAR,
            linkedin VARCHAR,
            profile_visible BOOLEAN DEFAULT TRUE,
            email_verified BOOLEAN DEFAULT FALSE,
            phone_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    op.execute("CREATE INDEX ix_user_profiles_id ON user_profiles(id)")
    
    # Create user_settings table using SQL  
    op.execute("""
        CREATE TABLE user_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
            theme thememode DEFAULT 'LIGHT',
            language language DEFAULT 'PT_BR',
            currency currency DEFAULT 'BRL',
            email_notifications BOOLEAN DEFAULT TRUE,
            push_notifications BOOLEAN DEFAULT TRUE,
            sms_notifications BOOLEAN DEFAULT FALSE,
            portfolio_alerts BOOLEAN DEFAULT TRUE,
            price_alerts BOOLEAN DEFAULT TRUE,
            news_notifications BOOLEAN DEFAULT FALSE,
            show_portfolio_value BOOLEAN DEFAULT TRUE,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            decimal_places INTEGER DEFAULT 2,
            chart_type charttype DEFAULT 'LINE',
            refresh_interval INTEGER DEFAULT 60,
            compact_view BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    op.execute("CREATE INDEX ix_user_settings_id ON user_settings(id)")


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables
    op.execute("DROP TABLE IF EXISTS user_settings")
    op.execute("DROP TABLE IF EXISTS user_profiles")
    
    # Drop enum types (only if they exist and no other tables use them)
    op.execute("DROP TYPE IF EXISTS charttype")
    op.execute("DROP TYPE IF EXISTS language") 
    op.execute("DROP TYPE IF EXISTS thememode")
