-- ============================================================
--  Property Management System (Bangladesh)
--  DBMS Course Project - MySQL Schema
--  Run this file once in phpMyAdmin / MySQL CLI before using the app.
-- ============================================================

DROP DATABASE IF EXISTS pms_db;
CREATE DATABASE pms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pms_db;

-- ------------------------------------------------------------
-- 1. ADMIN  (system owner - that's you)
-- ------------------------------------------------------------
CREATE TABLE admin (
    admin_id      INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(120)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    phone         VARCHAR(20),
    created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. SUBSCRIPTION_PLAN  (Basic / Standard / Premium)
-- ------------------------------------------------------------
CREATE TABLE subscription_plan (
    plan_id        INT AUTO_INCREMENT PRIMARY KEY,
    plan_name      VARCHAR(50)    NOT NULL UNIQUE,
    price          DECIMAL(10,2)  NOT NULL,
    duration_days  INT            NOT NULL DEFAULT 30,
    max_properties INT            NOT NULL DEFAULT 3,
    features       VARCHAR(255)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. OWNER  (main user of the system)
-- ------------------------------------------------------------
CREATE TABLE owner (
    owner_id      INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(120)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    phone         VARCHAR(20),
    nid           VARCHAR(30),
    address       VARCHAR(255),
    self_managed  TINYINT(1)    NOT NULL DEFAULT 1,  -- 1 = owner is his own manager
    status        ENUM('active','blocked') DEFAULT 'active',
    created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. SUBSCRIPTION  (M:N relationship OWNER <-> PLAN, with attributes)
-- ------------------------------------------------------------
CREATE TABLE subscription (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id        INT NOT NULL,
    plan_id         INT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    amount_paid     DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method  ENUM('bkash','nagad','rocket','bank','cash') DEFAULT 'bkash',
    trx_id          VARCHAR(50),
    status          ENUM('active','expired','cancelled') DEFAULT 'active',
    CONSTRAINT fk_sub_owner FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_plan  FOREIGN KEY (plan_id)  REFERENCES subscription_plan(plan_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. MANAGER  (hired by an owner, logs in separately)
-- ------------------------------------------------------------
CREATE TABLE manager (
    manager_id    INT AUTO_INCREMENT PRIMARY KEY,
    owner_id      INT NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    nid           VARCHAR(30),
    monthly_salary DECIMAL(10,2) DEFAULT 0,
    hire_date     DATE,
    status        ENUM('active','inactive') DEFAULT 'active',
    CONSTRAINT fk_mgr_owner FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. PROPERTY  (a building)
-- ------------------------------------------------------------
CREATE TABLE property (
    property_id   INT AUTO_INCREMENT PRIMARY KEY,
    owner_id      INT NOT NULL,
    manager_id    INT NULL,                  -- NULL = owner manages it himself
    name          VARCHAR(120) NOT NULL,
    address       VARCHAR(255),
    city          VARCHAR(60),
    property_type ENUM('residential','commercial','mixed') DEFAULT 'residential',
    total_floors  INT DEFAULT 0,
    year_built    YEAR,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prop_owner FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE,
    CONSTRAINT fk_prop_mgr   FOREIGN KEY (manager_id) REFERENCES manager(manager_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. FLOOR  (weak entity - identified by its property)
-- ------------------------------------------------------------
CREATE TABLE floor (
    floor_id    INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    floor_no    INT NOT NULL,
    description VARCHAR(120),
    UNIQUE KEY uq_floor (property_id, floor_no),
    CONSTRAINT fk_floor_prop FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. UNIT  (a flat / room on a floor - weak entity)
-- ------------------------------------------------------------
CREATE TABLE unit (
    unit_id        INT AUTO_INCREMENT PRIMARY KEY,
    floor_id       INT NOT NULL,
    unit_no        VARCHAR(20) NOT NULL,
    unit_type      ENUM('flat','shop','office','garage') DEFAULT 'flat',
    bedrooms       INT DEFAULT 0,
    size_sqft      INT DEFAULT 0,
    rent_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status         ENUM('vacant','occupied','maintenance') DEFAULT 'vacant',
    UNIQUE KEY uq_unit (floor_id, unit_no),
    CONSTRAINT fk_unit_floor FOREIGN KEY (floor_id) REFERENCES floor(floor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. TENANT
-- ------------------------------------------------------------
CREATE TABLE tenant (
    tenant_id         INT AUTO_INCREMENT PRIMARY KEY,
    owner_id          INT NOT NULL,
    full_name         VARCHAR(100) NOT NULL,
    phone             VARCHAR(20),
    email             VARCHAR(120),
    nid               VARCHAR(30),
    occupation        VARCHAR(80),
    permanent_address VARCHAR(255),
    family_members    INT DEFAULT 1,
    emergency_contact VARCHAR(20),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenant_owner FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. LEASE  (M:N relationship TENANT <-> UNIT, with attributes)
-- ------------------------------------------------------------
CREATE TABLE lease (
    lease_id        INT AUTO_INCREMENT PRIMARY KEY,
    unit_id         INT NOT NULL,
    tenant_id       INT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NULL,              -- planned move-out date
    duration_months INT DEFAULT 12,
    monthly_rent    DECIMAL(10,2) NOT NULL,
    advance_paid    DECIMAL(10,2) DEFAULT 0,
    rent_due_day    INT DEFAULT 5,
    status          ENUM('active','ended','terminated') DEFAULT 'active',
    note            VARCHAR(255),
    CONSTRAINT fk_lease_unit   FOREIGN KEY (unit_id)   REFERENCES unit(unit_id)   ON DELETE CASCADE,
    CONSTRAINT fk_lease_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. RENT_PAYMENT  (monthly rent collection - income)
-- ------------------------------------------------------------
CREATE TABLE rent_payment (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    lease_id       INT NOT NULL,
    billing_month  CHAR(7) NOT NULL,          -- format: 2026-09
    amount_due     DECIMAL(10,2) NOT NULL,
    amount_paid    DECIMAL(10,2) DEFAULT 0,
    payment_date   DATE NULL,
    payment_method ENUM('cash','bkash','nagad','bank','cheque') DEFAULT 'cash',
    status         ENUM('paid','partial','due') DEFAULT 'due',
    collected_by   INT NULL,                  -- manager who collected
    UNIQUE KEY uq_rent (lease_id, billing_month),
    CONSTRAINT fk_pay_lease FOREIGN KEY (lease_id) REFERENCES lease(lease_id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_mgr   FOREIGN KEY (collected_by) REFERENCES manager(manager_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 12. EXPENSE_CATEGORY  (electricity, water, garbage, wiring...)
-- ------------------------------------------------------------
CREATE TABLE expense_category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(60) NOT NULL UNIQUE,
    is_utility  TINYINT(1) DEFAULT 0
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 13. EXPENSE  (every taka that goes out of a property)
-- ------------------------------------------------------------
CREATE TABLE expense (
    expense_id    INT AUTO_INCREMENT PRIMARY KEY,
    property_id   INT NOT NULL,
    category_id   INT NOT NULL,
    unit_id       INT NULL,                  -- NULL = whole building
    title         VARCHAR(120) NOT NULL,
    amount        DECIMAL(10,2) NOT NULL,
    expense_date  DATE NOT NULL,
    billing_month CHAR(7) NOT NULL,
    vendor_name   VARCHAR(100),
    paid_by       ENUM('owner','manager') DEFAULT 'manager',
    note          VARCHAR(255),
    CONSTRAINT fk_exp_prop FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE,
    CONSTRAINT fk_exp_cat  FOREIGN KEY (category_id) REFERENCES expense_category(category_id),
    CONSTRAINT fk_exp_unit FOREIGN KEY (unit_id) REFERENCES unit(unit_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 14. STAFF  (caretaker, guard, cleaner of a building)
-- ------------------------------------------------------------
CREATE TABLE staff (
    staff_id       INT AUTO_INCREMENT PRIMARY KEY,
    property_id    INT NOT NULL,
    full_name      VARCHAR(100) NOT NULL,
    role           ENUM('caretaker','guard','cleaner','electrician','other') DEFAULT 'caretaker',
    phone          VARCHAR(20),
    nid            VARCHAR(30),
    monthly_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    join_date      DATE,
    status         ENUM('active','left') DEFAULT 'active',
    CONSTRAINT fk_staff_prop FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 15. SALARY_PAYMENT  (weak entity of STAFF)
-- ------------------------------------------------------------
CREATE TABLE salary_payment (
    salary_id    INT AUTO_INCREMENT PRIMARY KEY,
    staff_id     INT NOT NULL,
    salary_month CHAR(7) NOT NULL,
    amount       DECIMAL(10,2) NOT NULL,
    paid_date    DATE NULL,
    status       ENUM('paid','due') DEFAULT 'due',
    UNIQUE KEY uq_salary (staff_id, salary_month),
    CONSTRAINT fk_sal_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 16. MAINTENANCE_REQUEST  (something broke -> call a vendor -> cost)
-- ------------------------------------------------------------
CREATE TABLE maintenance_request (
    request_id   INT AUTO_INCREMENT PRIMARY KEY,
    property_id  INT NOT NULL,
    unit_id      INT NULL,
    title        VARCHAR(120) NOT NULL,
    description  VARCHAR(255),
    priority     ENUM('low','medium','high') DEFAULT 'medium',
    request_date DATE NOT NULL,
    status       ENUM('pending','in_progress','done') DEFAULT 'pending',
    vendor_name  VARCHAR(100),
    cost         DECIMAL(10,2) DEFAULT 0,
    resolved_date DATE NULL,
    expense_id   INT NULL,                  -- filled when the bill is recorded
    CONSTRAINT fk_mr_prop FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE,
    CONSTRAINT fk_mr_unit FOREIGN KEY (unit_id) REFERENCES unit(unit_id) ON DELETE SET NULL,
    CONSTRAINT fk_mr_exp  FOREIGN KEY (expense_id) REFERENCES expense(expense_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO admin (full_name, email, password_hash, phone) VALUES
('System Admin', 'admin@pms.com', '$2y$12$f/4KB17gGeYRtoQzciSmQ.8kMPGmquuesfcRi2.dYSRDsKwlDNHaq', '01700000000');

INSERT INTO subscription_plan (plan_name, price, duration_days, max_properties, features) VALUES
('Basic',    500.00,  30, 2,  'Up to 2 properties, 1 manager'),
('Standard', 1500.00, 30, 10, 'Up to 10 properties, unlimited managers, reports'),
('Premium',  4000.00, 90, 50, 'Unlimited properties, reports, priority support');

INSERT INTO expense_category (name, is_utility) VALUES
('Electricity Bill', 1), ('Water Bill', 1), ('Gas Bill', 1), ('Garbage Bill', 1),
('Lift Maintenance', 0), ('Electrical / Wiring', 0), ('Plumbing', 0),
('Painting & Repair', 0), ('Security', 0), ('Others', 0);

-- Demo owner: password is "123456"
INSERT INTO owner (full_name, email, password_hash, phone, nid, address, self_managed) VALUES
('Rahim Uddin', 'owner@pms.com', '$2y$12$Op8d932m49LgL34/vPEM0euDNR73c3GmCJnGKZNqMpowN5p5GHmka', '01711111111', '1990123456', 'Agrabad, Chattogram', 0);

INSERT INTO subscription (owner_id, plan_id, start_date, end_date, amount_paid, trx_id, status) VALUES
(1, 2, '2026-09-01', '2026-10-01', 1500.00, 'BKS7X21QA', 'active');

-- Demo manager: password is "123456"
INSERT INTO manager (owner_id, full_name, email, password_hash, phone, monthly_salary, hire_date) VALUES
(1, 'Karim Hossain', 'manager@pms.com', '$2y$12$Op8d932m49LgL34/vPEM0euDNR73c3GmCJnGKZNqMpowN5p5GHmka', '01822222222', 15000, '2026-01-01');

INSERT INTO property (owner_id, manager_id, name, address, city, property_type, total_floors, year_built) VALUES
(1, 1, 'Rahim Tower', '25 CDA Avenue, Muradpur', 'Chattogram', 'residential', 3, 2015),
(1, 1, 'Noor Manzil', '11 Jamal Khan Road', 'Chattogram', 'mixed', 2, 2019);

INSERT INTO floor (property_id, floor_no, description) VALUES
(1,1,'Ground floor'), (1,2,'2nd floor'), (1,3,'3rd floor'),
(2,1,'Shops'), (2,2,'Residential');

INSERT INTO unit (floor_id, unit_no, unit_type, bedrooms, size_sqft, rent_amount, advance_amount, status) VALUES
(1,'1A','flat',3,1200,18000,36000,'occupied'),
(1,'1B','flat',2,950,14000,28000,'occupied'),
(1,'1C','flat',2,900,13500,27000,'vacant'),
(2,'2A','flat',3,1200,18500,37000,'occupied'),
(2,'2B','flat',2,950,14000,28000,'vacant'),
(2,'2C','flat',2,900,13500,27000,'maintenance'),
(3,'3A','flat',3,1200,19000,38000,'occupied'),
(3,'3B','flat',2,950,14500,29000,'vacant'),
(3,'3C','flat',2,900,14000,28000,'vacant'),
(4,'S1','shop',0,300,25000,75000,'occupied'),
(4,'S2','shop',0,300,25000,75000,'vacant'),
(5,'2A','flat',3,1300,22000,44000,'occupied');

INSERT INTO tenant (owner_id, full_name, phone, email, nid, occupation, permanent_address, family_members, emergency_contact) VALUES
(1,'Jahid Hasan','01911111111','jahid@mail.com','1985998877','Banker','Feni',4,'01911111112'),
(1,'Salma Begum','01922222222','salma@mail.com','1992334455','Teacher','Cumilla',3,'01922222223'),
(1,'Nayeem Islam','01933333333','nayeem@mail.com','1994556677','Businessman','Chattogram',5,'01933333334'),
(1,'Farid Ahmed','01944444444','farid@mail.com','1988112233','Shop Owner','Chattogram',2,'01944444445'),
(1,'Ruma Akter','01955555555','ruma@mail.com','1996778899','Doctor','Dhaka',3,'01955555556');

INSERT INTO lease (unit_id, tenant_id, start_date, end_date, duration_months, monthly_rent, advance_paid, status) VALUES
(1,1,'2025-01-01','2026-12-31',24,18000,36000,'active'),
(2,2,'2025-06-01','2026-05-31',12,14000,28000,'active'),
(4,3,'2026-02-01','2027-01-31',12,18500,37000,'active'),
(7,5,'2026-03-01','2027-02-28',12,19000,38000,'active'),
(10,4,'2025-09-01','2027-08-31',24,25000,75000,'active'),
(12,1,'2026-04-01','2027-03-31',12,22000,44000,'active');

INSERT INTO rent_payment (lease_id, billing_month, amount_due, amount_paid, payment_date, payment_method, status, collected_by) VALUES
(1,'2026-07',18000,18000,'2026-07-04','bkash','paid',1),
(1,'2026-08',18000,18000,'2026-08-03','bkash','paid',1),
(1,'2026-09',18000,18000,'2026-09-05','bkash','paid',1),
(2,'2026-07',14000,14000,'2026-07-06','cash','paid',1),
(2,'2026-08',14000,14000,'2026-08-05','cash','paid',1),
(2,'2026-09',14000,7000,'2026-09-10','cash','partial',1),
(3,'2026-07',18500,18500,'2026-07-02','bank','paid',1),
(3,'2026-08',18500,18500,'2026-08-02','bank','paid',1),
(3,'2026-09',18500,0,NULL,'bank','due',NULL),
(4,'2026-08',19000,19000,'2026-08-04','nagad','paid',1),
(4,'2026-09',19000,19000,'2026-09-04','nagad','paid',1),
(5,'2026-08',25000,25000,'2026-08-06','cash','paid',1),
(5,'2026-09',25000,25000,'2026-09-06','cash','paid',1),
(6,'2026-09',22000,22000,'2026-09-05','bkash','paid',1);

INSERT INTO expense (property_id, category_id, unit_id, title, amount, expense_date, billing_month, vendor_name, paid_by) VALUES
(1,1,NULL,'Common area electricity',4200,'2026-09-08','2026-09','PDB','manager'),
(1,2,NULL,'WASA water bill',2600,'2026-09-08','2026-09','WASA','manager'),
(1,4,NULL,'Garbage collection',900,'2026-09-03','2026-09','City Corp','manager'),
(1,5,NULL,'Lift servicing',3500,'2026-09-12','2026-09','Otis Service','manager'),
(1,7,6,'Bathroom pipe leakage',1800,'2026-09-14','2026-09','Mistri Jashim','manager'),
(1,1,NULL,'Common area electricity',3900,'2026-08-08','2026-08','PDB','manager'),
(1,2,NULL,'WASA water bill',2400,'2026-08-08','2026-08','WASA','manager'),
(2,1,NULL,'Shop line electricity',5100,'2026-09-09','2026-09','PDB','owner'),
(2,6,NULL,'Main switch board repair',2700,'2026-09-15','2026-09','Alam Electric','manager');

INSERT INTO staff (property_id, full_name, role, phone, monthly_salary, join_date) VALUES
(1,'Abdul Malek','caretaker','01611111111',9000,'2024-05-01'),
(1,'Sumon Mia','guard','01622222222',8000,'2025-02-01'),
(1,'Rekha Bala','cleaner','01633333333',5000,'2025-03-15'),
(2,'Jashim Uddin','guard','01644444444',8500,'2025-08-01');

INSERT INTO salary_payment (staff_id, salary_month, amount, paid_date, status) VALUES
(1,'2026-08',9000,'2026-08-31','paid'),
(2,'2026-08',8000,'2026-08-31','paid'),
(3,'2026-08',5000,'2026-08-31','paid'),
(4,'2026-08',8500,'2026-08-31','paid'),
(1,'2026-09',9000,'2026-09-05','paid'),
(2,'2026-09',8000,'2026-09-05','paid'),
(3,'2026-09',5000,NULL,'due'),
(4,'2026-09',8500,NULL,'due');

INSERT INTO maintenance_request (property_id, unit_id, title, description, priority, request_date, status, vendor_name, cost, resolved_date) VALUES
(1,6,'Bathroom pipe leaking','Water dripping into 1C ceiling','high','2026-09-13','done','Mistri Jashim',1800,'2026-09-14'),
(1,NULL,'Lift making noise','Yearly servicing needed','medium','2026-09-10','done','Otis Service',3500,'2026-09-12'),
(1,9,'Room repainting','Before new tenant moves in','low','2026-09-16','pending',NULL,0,NULL),
(2,NULL,'Main switch board burnt','Urgent, shops affected','high','2026-09-15','in_progress','Alam Electric',2700,NULL);
