-- ============================================
-- AEGIS POS - DUMMY DATA GENERATOR
-- Generate 3 months of dummy orders & products
-- ============================================
-- INSTRUKSI:
-- 1. Ganti 'YOUR_BUSINESS_ID' dengan business_id kamu
-- 2. Run di Supabase SQL Editor
-- 3. Tunggu "Success"
-- ============================================

-- ============================================
-- CONFIGURATION - GANTI INI!
-- ============================================
DO $$
DECLARE
    -- GANTI DENGAN BUSINESS ID KAMU!
    -- Cek di dashboard → console log → Business ID
    v_business_id UUID := 'e45322b5-d5f9-4d38-b7a6-29fa5c0aeb1c';
    
    v_product_ids UUID[];
    v_member_ids UUID[];
    v_member_id UUID;
    v_order_id UUID;
    v_order_date TIMESTAMPTZ;
    v_total INTEGER;
    v_points_earned INTEGER;
    v_payment_method TEXT;
    i INTEGER;
    j INTEGER;
BEGIN
    -- ============================================
    -- 1. GENERATE DUMMY PRODUCTS (20 products)
    -- ============================================
    INSERT INTO products (business_id, name, price, stock, category, created_at, updated_at)
    SELECT 
        v_business_id,
        (ARRAY[
            'Kopi Espresso', 'Kopi Latte', 'Kopi Cappuccino', 'Kopi Mocha', 'Kopi Americano',
            'Teh Green Tea', 'Teh Black Tea', 'Teh Milk Tea', 'Teh Lemon Tea',
            'Roti Croissant', 'Roti Muffin', 'Roti Danish', 'Roti Bagel',
            'Snack Cookies', 'Snack Brownie', 'Snack Chips', 'Snack Donut',
            'Makanan Nasi Goreng', 'Makanan Mie Goreng', 'Makanan Sandwich'
        ])[row_number() OVER ()],
        (ARRAY[
            15000, 25000, 28000, 30000, 20000,
            12000, 10000, 18000, 15000,
            18000, 20000, 22000, 15000,
            12000, 15000, 10000, 18000,
            25000, 22000, 20000
        ])[row_number() OVER ()],
        floor(random() * 100 + 20)::INTEGER,
        (ARRAY[
            'Minuman', 'Minuman', 'Minuman', 'Minuman', 'Minuman',
            'Minuman', 'Minuman', 'Minuman', 'Minuman',
            'Makanan', 'Makanan', 'Makanan', 'Makanan',
            'Snack', 'Snack', 'Snack', 'Snack',
            'Makanan', 'Makanan', 'Makanan'
        ])[row_number() OVER ()],
        NOW() - (random() * INTERVAL '90 days'),
        NOW()
    FROM generate_series(1, 20)
    ON CONFLICT DO NOTHING;

    -- Get product IDs
    SELECT ARRAY_AGG(id) INTO v_product_ids
    FROM products 
    WHERE business_id = v_business_id;

    -- ============================================
    -- 2. GENERATE DUMMY MEMBERS (30 members)
    -- ============================================
    INSERT INTO members (business_id, name, phone, email, points, total_purchases, created_at, updated_at)
    SELECT 
        v_business_id,
        (ARRAY[
            'Ahmad Rizki', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Eko Prasetyo',
            'Fitri Handayani', 'Gunawan Wijaya', 'Hana Pertiwi', 'Indra Lesmana', 'Jasmine Ayu',
            'Kevin Sanjaya', 'Linda Kusuma', 'Muhammad Fikri', 'Nadia Safitri', 'Omar Abdullah',
            'Putri Wulandari', 'Qori Az-Zahra', 'Rudi Hermawan', 'Sari Dewi', 'Taufik Hidayat',
            'Umar Faruq', 'Vina Amelia', 'Wawan Setiawan', 'Xena Patricia', 'Yusuf Ibrahim',
            'Zahra Kamila', 'Andi Wijaya', 'Bella Saphira', 'Citra Lestari', 'Dimas Prakoso'
        ])[row_number() OVER ()],
        '08' || LPAD(floor(random() * 1000000000)::TEXT, 9, '0'),
        'member' || row_number() OVER () || '@email.com',
        floor(random() * 5000)::INTEGER,
        floor(random() * 500000)::INTEGER,
        NOW() - (random() * INTERVAL '90 days'),
        NOW()
    FROM generate_series(1, 30)
    ON CONFLICT DO NOTHING;

    -- Get member IDs
    SELECT ARRAY_AGG(id) INTO v_member_ids
    FROM members 
    WHERE business_id = v_business_id;

    -- ============================================
    -- 3. GENERATE DUMMY ORDERS (500 orders over 3 months)
    -- ============================================
    FOR i IN 1..500 LOOP
        -- Random date in last 90 days
        v_order_date := NOW() - (random() * INTERVAL '90 days');
        
        -- Random member (80% chance) or general (20%)
        IF random() > 0.2 THEN
            v_member_id := v_member_ids[floor(random() * array_length(v_member_ids, 1) + 1)::INTEGER];
        ELSE
            v_member_id := NULL;
        END IF;
        
        -- Random payment method
        v_payment_method := (ARRAY['cash', 'debit', 'credit', 'gopay', 'ovo', 'dana'])[floor(random() * 6 + 1)::INTEGER];
        
        -- Generate 1-5 items per order
        v_total := 0;
        v_points_earned := 0;
        
        FOR j IN 1..floor(random() * 5 + 1)::INTEGER LOOP
            v_total := v_total + (floor(random() * 50000 + 10000)::INTEGER);
        END LOOP;
        
        v_points_earned := floor(v_total / 10000);
        
        -- Insert order
        INSERT INTO orders (business_id, member_id, total, payment_method, points_earned, points_used, discount, created_at)
        VALUES (
            v_business_id,
            v_member_id,
            v_total,
            v_payment_method,
            v_points_earned,
            0,
            0,
            v_order_date
        )
        RETURNING id INTO v_order_id;
        
        -- Insert order items (1-5 items)
        FOR j IN 1..floor(random() * 5 + 1)::INTEGER LOOP
            INSERT INTO order_items (business_id, order_id, product_id, qty, price)
            VALUES (
                v_business_id,
                v_order_id,
                v_product_ids[floor(random() * array_length(v_product_ids, 1) + 1)::INTEGER],
                floor(random() * 3 + 1)::INTEGER,
                (ARRAY[10000, 15000, 20000, 25000, 30000])[floor(random() * 5 + 1)::INTEGER]
            );
        END LOOP;
        
        -- Update member points and total_purchases if member exists
        IF v_member_id IS NOT NULL THEN
            UPDATE members
            SET 
                points = points + v_points_earned,
                total_purchases = total_purchases + v_total,
                updated_at = NOW()
            WHERE id = v_member_id;
            
            -- Insert member transaction
            INSERT INTO member_transactions (member_id, order_id, type, points, description, created_at)
            VALUES (
                v_member_id,
                v_order_id,
                'earn',
                v_points_earned,
                'Earned from order ' || substr(v_order_id::TEXT, 1, 8),
                v_order_date
            );
        END IF;
    END LOOP;

    RAISE NOTICE 'Dummy data generated successfully!';
    RAISE NOTICE 'Products: 20';
    RAISE NOTICE 'Members: 30';
    RAISE NOTICE 'Orders: 500';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check counts
SELECT 
    'Products' as table_name, COUNT(*) as count FROM products WHERE business_id = 'e45322b5-d5f9-4d38-b7a6-29fa5c0aeb1c'
UNION ALL
SELECT 'Members', COUNT(*) FROM members WHERE business_id = 'e45322b5-d5f9-4d38-b7a6-29fa5c0aeb1c'
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders WHERE business_id = 'e45322b5-d5f9-4d38-b7a6-29fa5c0aeb1c'
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items WHERE business_id = 'e45322b5-d5f9-4d38-b7a6-29fa5c0aeb1c';

-- Check date range
SELECT 
    MIN(created_at) as earliest_order,
    MAX(created_at) as latest_order,
    COUNT(*) as total_orders
FROM orders 
WHERE business_id = 'e45322b5-d5f9-4d38-b7a6-29fa5c0aeb1c';

-- Check sales by month
SELECT 
    TO_CHAR(created_at, 'YYYY-MM') as month,
    COUNT(*) as orders,
    SUM(total) as total_sales,
    AVG(total) as avg_order
FROM orders 
WHERE business_id = 'e45322b5-d5f9-4d38-b7a6-29fa5c0aeb1c'
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY month DESC;

-- ============================================
-- END OF SCRIPT
-- ============================================
