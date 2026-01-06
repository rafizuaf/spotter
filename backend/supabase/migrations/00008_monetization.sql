-- ============================================
-- Migration 00008: Monetization
-- ============================================
-- ============================================
-- Subscription Products
-- ============================================
CREATE TABLE subscription_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_product_id_ios TEXT,
    platform_product_id_android TEXT,
    display_price TEXT,
    duration_interval TEXT,
    -- 'month', 'year'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Payment Customers
-- ============================================
CREATE TABLE payment_customers (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    revenuecat_rc_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_payment_customers_updated_at BEFORE
UPDATE
    ON payment_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Subscription Status
-- ============================================
CREATE TYPE subscription_status AS ENUM (
    'ACTIVE',
    'CANCELLED',
    'EXPIRED',
    'PAUSED',
    'TRIAL',
    'PENDING'
);

CREATE TYPE payment_provider AS ENUM ('STRIPE', 'REVENUECAT', 'APPLE', 'GOOGLE');

-- ============================================
-- Subscription History
-- ============================================
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES subscription_products(id),
    provider payment_provider NOT NULL,
    original_transaction_id TEXT,
    status subscription_status NOT NULL,
    purchase_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_subscription_history_updated_at BEFORE
UPDATE
    ON subscription_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_subscription_history_user ON subscription_history(user_id)
WHERE
    deleted_at IS NULL;

-- ============================================
-- Webhook Processing Status
-- ============================================
CREATE TYPE webhook_status AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- ============================================
-- Payment Webhooks
-- ============================================
CREATE TABLE payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider payment_provider NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processing_status webhook_status DEFAULT 'PENDING',
    error_message TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payment_webhooks_status ON payment_webhooks(processing_status)
WHERE
    processing_status = 'PENDING';