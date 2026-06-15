-- =============================================================================
-- PG18-19 TEMPORAL GRAPH STRESS TEST SCHEMA
-- Healthcare + Financial + Social Network System
-- Exercises ALL PostgreSQL 18-19 specific features plus all earlier features
-- For SQL parser stress testing — 2000+ lines of comprehensive DDL
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS intarray;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS isn;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- =============================================================================
-- SCHEMAS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS social;
CREATE SCHEMA IF NOT EXISTS system;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS temp;
CREATE SCHEMA IF NOT EXISTS graph;
CREATE SCHEMA IF NOT EXISTS fdw_schema;
CREATE SCHEMA IF NOT EXISTS replication;

-- =============================================================================
-- CUSTOM ENUM TYPES
-- =============================================================================
CREATE TYPE clinical.gender_enum AS ENUM ('male', 'female', 'non_binary', 'other', 'unknown');
CREATE TYPE clinical.blood_type_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');
CREATE TYPE clinical.record_status_enum AS ENUM ('active', 'inactive', 'archived', 'deleted', 'pending_review');
CREATE TYPE clinical.appointment_status_enum AS ENUM ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE clinical.severity_enum AS ENUM ('mild', 'moderate', 'severe', 'critical', 'life_threatening');
CREATE TYPE clinical.procedure_category_enum AS ENUM ('diagnostic', 'therapeutic', 'surgical', 'preventive', 'palliative', 'rehabilitative');
CREATE TYPE clinical.medication_route_enum AS ENUM ('oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'inhalation', 'rectal', 'sublingual', 'transdermal', 'ophthalmic');
CREATE TYPE clinical.lab_status_enum AS ENUM ('ordered', 'collected', 'processing', 'completed', 'cancelled', 'error');
CREATE TYPE financial.invoice_status_enum AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded', 'in_dispute');
CREATE TYPE financial.payment_method_enum AS ENUM ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'insurance', 'payment_plan', 'write_off');
CREATE TYPE financial.claim_status_enum AS ENUM ('submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'appealed', 'paid', 'closed');
CREATE TYPE social.connection_type_enum AS ENUM ('friend', 'family', 'caregiver', 'colleague', 'provider', 'patient');
CREATE TYPE social.message_type_enum AS ENUM ('text', 'audio', 'video', 'document', 'system', 'appointment_reminder', 'prescription_update');
CREATE TYPE system.user_role_enum AS ENUM ('admin', 'doctor', 'nurse', 'staff', 'patient', 'auditor', 'system');
CREATE TYPE system.session_status_enum AS ENUM ('active', 'expired', 'terminated', 'suspended');
CREATE TYPE system.audit_action_enum AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'grant', 'revoke', 'export', 'import');
CREATE TYPE system.notification_type_enum AS ENUM ('info', 'warning', 'error', 'critical', 'appointment', 'result', 'billing');

-- =============================================================================
-- COMPOSITE TYPES
-- =============================================================================
CREATE TYPE clinical.address_type AS (
    street_line1 TEXT,
    street_line2 TEXT,
    city TEXT,
    state_code CHAR(2),
    postal_code VARCHAR(10),
    country_code CHAR(3),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_verified BOOLEAN
);

CREATE TYPE clinical.phone_type AS (
    country_code SMALLINT,
    area_code SMALLINT,
    number BIGINT,
    extension SMALLINT,
    phone_kind TEXT
);

CREATE TYPE clinical.name_type AS (
    prefix TEXT,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    suffix TEXT,
    preferred_name TEXT
);

CREATE TYPE financial.money_range AS (
    low NUMERIC(12,2),
    high NUMERIC(12,2),
    currency CHAR(3)
);

CREATE TYPE clinical.vital_reading AS (
    value NUMERIC(10,2),
    unit TEXT,
    measured_at TIMESTAMPTZ,
    method TEXT,
    is_abnormal BOOLEAN
);

-- =============================================================================
-- RANGE AND MULTIRANGE TYPES
-- =============================================================================
CREATE TYPE clinical.tstzrange_period AS RANGE (
    subtype = timestamptz,
    subtype_diff = tstzsub
);

CREATE TYPE clinical.date_multirange AS MULTIRANGE (
    subtype = daterange
);

CREATE TYPE clinical.int4_session_range AS RANGE (
    subtype = integer,
    subtype_diff = int4mi,
    canonical = int4range_canonical
);

-- =============================================================================
-- DOMAIN TYPES
-- =============================================================================
CREATE DOMAIN clinical.ssn_domain AS TEXT
    CHECK (VALUE ~ '^\d{3}-\d{2}-\d{4}$');

CREATE DOMAIN clinical.mrn_domain AS TEXT
    CHECK (VALUE ~ '^MRN-[A-Z]{2}-\d{8}$');

CREATE DOMAIN clinical.npi_domain AS BIGINT
    CHECK (VALUE BETWEEN 1000000000 AND 9999999999);

CREATE DOMAIN clinical.positive_int AS INTEGER
    NOT NULL
    CHECK (VALUE > 0);

CREATE DOMAIN clinical.non_negative_int AS INTEGER
    NOT NULL
    CHECK (VALUE >= 0);

CREATE DOMAIN clinical.percentage AS NUMERIC(5,2)
    CHECK (VALUE BETWEEN 0.00 AND 100.00);

CREATE DOMAIN clinical.positive_decimal AS NUMERIC(12,2)
    CHECK (VALUE > 0);

CREATE DOMAIN financial.usd_amount AS NUMERIC(12,2)
    NOT NULL
    CHECK (VALUE >= 0);

CREATE DOMAIN financial.tax_rate AS NUMERIC(5,4)
    CHECK (VALUE BETWEEN 0.0000 AND 1.0000);

CREATE DOMAIN system.email_domain AS TEXT
    CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN system.api_key_domain AS TEXT
    CHECK (VALUE ~ '^pg_[a-zA-Z0-9]{32,64}$');

CREATE DOMAIN system.ip_address AS INET
    CHECK (family(VALUE) IN (4, 6));

-- =============================================================================
-- SEQUENCES
-- =============================================================================
CREATE SEQUENCE clinical.patient_seq
    AS BIGINT INCREMENT BY 1 START WITH 100000 MINVALUE 100000 MAXVALUE 999999999 NO CYCLE CACHE 20;

CREATE SEQUENCE clinical.doctor_seq
    AS BIGINT INCREMENT BY 1 START WITH 50000 MINVALUE 50000 MAXVALUE 99999999 NO CYCLE CACHE 10;

CREATE SEQUENCE clinical.record_seq
    AS BIGINT INCREMENT BY 1 START WITH 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;

CREATE SEQUENCE clinical.appointment_seq
    AS BIGINT INCREMENT BY 1 START WITH 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 20;

CREATE SEQUENCE financial.invoice_seq
    AS BIGINT INCREMENT BY 1 START WITH 10000 MINVALUE 10000 NO MAXVALUE NO CYCLE CACHE 10;

CREATE SEQUENCE financial.claim_seq
    AS BIGINT INCREMENT BY 1 START WITH 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 10;

CREATE SEQUENCE financial.payment_seq
    AS BIGINT INCREMENT BY 1 START WITH 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 10;

CREATE SEQUENCE system.user_seq
    AS BIGINT INCREMENT BY 1 START WITH 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 5;

CREATE SEQUENCE system.session_seq
    AS BIGINT INCREMENT BY 1 START WITH 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 100;

CREATE SEQUENCE analytics.report_seq
    AS BIGINT INCREMENT BY 1 START WITH 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 5;

-- =============================================================================
-- COLATIONS
-- =============================================================================
CREATE COLLATION IF NOT EXISTS system.case_insensitive (
    PROVIDER = icu,
    LOCALE = 'en-US-x-icu',
    DETERMINISTIC = FALSE
);

CREATE COLLATION IF NOT EXISTS system.numeric_sort (
    PROVIDER = icu,
    LOCALE = 'en@colNumeric=yes',
    DETERMINISTIC = FALSE
);

CREATE COLLATION IF NOT EXISTS system.phonebook_sort (
    PROVIDER = libc,
    LOCALE = 'en_US PHONEBOOK'
);

-- =============================================================================
-- CASTS
-- =============================================================================
CREATE CAST (clinical.address_type AS TEXT)
    WITH FUNCTION clinical.address_type_to_text(clinical.address_type)
    AS IMPLICIT;

CREATE CAST (clinical.phone_type AS TEXT)
    WITH FUNCTION clinical.phone_type_to_text(clinical.phone_type)
    AS ASSIGNMENT;

CREATE CAST (financial.usd_amount AS TEXT)
    WITH FUNCTION financial.format_usd(financial.usd_amount)
    AS ASSIGNMENT;

-- =============================================================================
-- CONVERSIONS
-- =============================================================================
CREATE CONVERSION system.latin1_to_utf8
    FOR 'LATIN1' TO 'UTF8' FROM iso8859_1_to_utf8;

-- =============================================================================
-- TEXT SEARCH OBJECTS
-- =============================================================================
CREATE TEXT SEARCH CONFIGURATION system.medical_english (
    COPY = pg_catalog.english
);

CREATE TEXT SEARCH CONFIGURATION system.clinical_ts (
    PARSER = pg_catalog.default
);

ALTER TEXT SEARCH CONFIGURATION system.clinical_ts
    ADD MAPPING FOR asciiword WITH english_stem, medical_stem;

ALTER TEXT SEARCH CONFIGURATION system.clinical_ts
    ADD MAPPING FOR word WITH english_stem;

ALTER TEXT SEARCH CONFIGURATION system.clinical_ts
    ADD MAPPING FOR numword WITH simple;

CREATE TEXT SEARCH DICTIONARY system.medical_dictionary (
    TEMPLATE = ispell,
    DictFile = medical_dict,
    AffFile = medical_affix,
    StopWords = english
);

CREATE TEXT SEARCH DICTIONARY system.medical_stem (
    TEMPLATE = snowball,
    Language = english,
    StopWords = english
);

CREATE TEXT SEARCH PARSER system.medical_parser (
    START = medicalprs_start,
    GETTOKEN = medicalprs_gettoken,
    END = medicalprs_end,
    HEADLINE = medicalprs_headline,
    LEXTYPES = medicalprs_lextypes
);

CREATE TEXT SEARCH TEMPLATE system.medical_template (
    INIT = medicaldict_init,
    LEXIZE = medicaldict_lexize
);

-- =============================================================================
-- OPERATORS AND OPERATOR CLASSES/FAMILIES
-- =============================================================================
CREATE OPERATOR clinical.~<>~ (
    LEFTARG = clinical.vital_reading,
    RIGHTARG = clinical.vital_reading,
    FUNCTION = clinical.vital_reading_not_equal,
    COMMUTATOR = OPERATOR(clinical.~<>~),
    NEGATOR = OPERATOR(clinical.~=~),
    RESTRICT = neqsel,
    JOIN = neqjoinsel
);

CREATE OPERATOR clinical.~=~ (
    LEFTARG = clinical.vital_reading,
    RIGHTARG = clinical.vital_reading,
    FUNCTION = clinical.vital_reading_equal,
    COMMUTATOR = OPERATOR(clinical.~=~),
    NEGATOR = OPERATOR(clinical.~<>~),
    RESTRICT = eqsel,
    JOIN = eqjoinsel,
    HASHES,
    MERGES
);

CREATE OPERATOR CLASS clinical.vital_reading_ops
    DEFAULT FOR TYPE clinical.vital_reading USING btree AS
        OPERATOR 1 clinical.~<>~,
        OPERATOR 2 clinical.~=~,
        FUNCTION 1 clinical.vital_reading_cmp(clinical.vital_reading, clinical.vital_reading);

CREATE OPERATOR FAMILY clinical.vital_reading_family USING btree;

ALTER OPERATOR FAMILY clinical.vital_reading_family USING btree ADD
    OPERATOR 1 clinical.~<>~ (clinical.vital_reading, clinical.vital_reading),
    OPERATOR 2 clinical.~=~ (clinical.vital_reading, clinical.vital_reading),
    FUNCTION 1 clinical.vital_reading_cmp(clinical.vital_reading, clinical.vital_reading);

-- =============================================================================
-- FUNCTIONS AND PROCEDURES
-- =============================================================================
CREATE OR REPLACE FUNCTION clinical.address_type_to_text(clinical.address_type)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN $1.street_line1 || ', ' || $1.city || ', ' || $1.state_code || ' ' || $1.postal_code;

CREATE OR REPLACE FUNCTION clinical.phone_type_to_text(clinical.phone_type)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN '+' || $1.country_code || ' (' || $1.area_code || ') ' || $1.number;

CREATE OR REPLACE FUNCTION financial.format_usd(financial.usd_amount)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN '$' || to_char($1, 'FM999,999,999.00');

CREATE OR REPLACE FUNCTION clinical.calculate_bmi(weight_kg NUMERIC, height_cm NUMERIC)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::numeric, 2);

CREATE OR REPLACE FUNCTION clinical.calculate_age(dob DATE, reference DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN EXTRACT(YEAR FROM age(reference, dob))::INTEGER;

CREATE OR REPLACE FUNCTION clinical.validate_icd10(code TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN code ~ '^[A-Z]\d{2}(\.\d{1,4})?$';

CREATE OR REPLACE FUNCTION clinical.validate_cpt(code TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN code ~ '^\d{5}$' AND code::INTEGER BETWEEN 10000 AND 99999;

CREATE OR REPLACE FUNCTION clinical.validate_ndc(code TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN code ~ '^\d{5}-\d{4}-\d{2}$';

CREATE OR REPLACE FUNCTION clinical.generate_mrn(prefix TEXT DEFAULT 'MR')
RETURNS TEXT
LANGUAGE sql VOLATILE
RETURN 'MRN-' || prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('clinical.record_seq')::TEXT, 6, '0');

CREATE OR REPLACE FUNCTION financial.calculate_copay(
    total_charge NUMERIC,
    insurance_rate NUMERIC,
    deductible_remaining NUMERIC,
    copay_pct NUMERIC DEFAULT 0.20
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
$$
DECLARE
    after_insurance NUMERIC;
    deductible_applied NUMERIC;
    copay_amount NUMERIC;
BEGIN
    after_insurance := total_charge * (1 - insurance_rate);
    deductible_applied := LEAST(deductible_remaining, after_insurance);
    copay_amount := (after_insurance - deductible_applied) * copay_pct;
    RETURN ROUND(GREATEST(copay_amount, 0), 2);
END;
$$;

CREATE OR REPLACE FUNCTION clinical.compute_risk_score(
    p_age INTEGER,
    p_comorbidities INTEGER,
    p_severity clinical.severity_enum,
    p_vitals_abnormal_count INTEGER DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
$$
DECLARE
    age_factor NUMERIC := 0;
    comorbidity_factor NUMERIC := 0;
    severity_factor NUMERIC := 0;
    vitals_factor NUMERIC := 0;
BEGIN
    -- Age scoring
    CASE
        WHEN p_age < 18 THEN age_factor := 0.5;
        WHEN p_age BETWEEN 18 AND 40 THEN age_factor := 1.0;
        WHEN p_age BETWEEN 41 AND 60 THEN age_factor := 1.5;
        WHEN p_age BETWEEN 61 AND 75 THEN age_factor := 2.5;
        ELSE age_factor := 4.0;
    END CASE;

    -- Comorbidity scoring
    comorbidity_factor := 0.5 * p_comorbidities;

    -- Severity scoring
    severity_factor := CASE p_severity
        WHEN 'mild' THEN 1.0
        WHEN 'moderate' THEN 2.0
        WHEN 'severe' THEN 3.5
        WHEN 'critical' THEN 5.0
        WHEN 'life_threatening' THEN 8.0
    END;

    -- Vitals abnormality scoring
    vitals_factor := 0.3 * p_vitals_abnormal_count;

    RETURN ROUND(age_factor + comorbidity_factor + severity_factor + vitals_factor, 2);
END;
$$;

CREATE OR REPLACE FUNCTION clinical.merge_patient_records(
    p_source_id BIGINT,
    p_target_id BIGINT,
    p_merged_by BIGINT,
    OUT records_merged INTEGER,
    OUT conflicts_found INTEGER
)
RETURNS RECORD
LANGUAGE plpgsql VOLATILE
$$
DECLARE
    v_count INTEGER;
BEGIN
    records_merged := 0;
    conflicts_found := 0;

    -- Check for conflicting diagnoses
    SELECT COUNT(*) INTO v_count
    FROM clinical.diagnoses d1
    JOIN clinical.diagnoses d2 ON d1.icd10_code = d2.icd10_code
        AND d1.diagnosed_date = d2.diagnosed_date
    WHERE d1.patient_id = p_source_id AND d2.patient_id = p_target_id;

    conflicts_found := conflicts_found + v_count;

    -- Merge medical records
    UPDATE clinical.medical_records
    SET patient_id = p_target_id
    WHERE patient_id = p_source_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    records_merged := records_merged + v_count;

    -- Merge prescriptions
    UPDATE clinical.prescriptions
    SET patient_id = p_target_id
    WHERE patient_id = p_source_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    records_merged := records_merged + v_count;

    -- Log the merge
    INSERT INTO system.audit_logs (action, table_name, record_id, performed_by, details)
    VALUES (
        'update',
        'patients',
        p_target_id,
        p_merged_by,
        format('Merged patient %s into %s. %s records merged, %s conflicts found.',
            p_source_id, p_target_id, records_merged, conflicts_found)
    );

    -- Soft-delete source patient
    UPDATE clinical.patients
    SET status = 'deleted',
        updated_at = NOW()
    WHERE patient_id = p_source_id;
END;
$$;

CREATE OR REPLACE FUNCTION clinical.process_appointment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
$$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Create billing entry
        INSERT INTO financial.billing_accounts (patient_id, account_type, balance, created_at)
        VALUES (NEW.patient_id, 'appointment', 0, NOW())
        ON CONFLICT (patient_id, account_type) DO UPDATE
            SET updated_at = NOW();

        -- Create audit log
        INSERT INTO system.audit_logs (action, table_name, record_id, performed_by, details)
        VALUES ('update', 'appointments', NEW.appointment_id, NEW.doctor_id,
            format('Appointment %s completed for patient %s', NEW.appointment_id, NEW.patient_id));
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION clinical.enforce_no_overlapping_insurance()
RETURNS TRIGGER
LANGUAGE plpgsql
$$
BEGIN
    IF EXISTS (
        SELECT 1 FROM clinical.patient_insurance
        WHERE patient_id = NEW.patient_id
            AND insurance_plan_id = NEW.insurance_plan_id
            AND coverage_period && NEW.coverage_period
            AND (NEW.insurance_id IS NULL OR insurance_id != NEW.insurance_id)
    ) THEN
        RAISE EXCEPTION 'Overlapping insurance coverage period for patient % and plan %',
            NEW.patient_id, NEW.insurance_plan_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION system.sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
$$
BEGIN
    RETURN regexp_replace(
        regexp_replace(input_text, '<[^>]+>', '', 'g'),
        '[;&|''"\\]', '', 'g'
    );
END;
$$;

CREATE OR REPLACE PROCEDURE clinical.bulk_import_patients(
    p_data JSONB,
    INOUT p_imported_count INTEGER DEFAULT 0,
    INOUT p_error_count INTEGER DEFAULT 0
)
LANGUAGE plpgsql
$$
DECLARE
    rec JSONB;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_data)
    LOOP
        BEGIN
            INSERT INTO clinical.patients (
                first_name, last_name, date_of_birth, gender,
                ssn, primary_address, primary_phone, created_at
            ) VALUES (
                rec->>'first_name',
                rec->>'last_name',
                (rec->>'date_of_birth')::DATE,
                (rec->>'gender')::clinical.gender_enum,
                rec->>'ssn',
                ROW(rec->>'street', NULL, rec->>'city', rec->>'state',
                    rec->>'zip', 'USA', NULL, NULL, FALSE)::clinical.address_type,
                ROW(1, (rec->>'area_code')::SMALLINT,
                    (rec->>'phone_number')::BIGINT,
                    NULL, 'mobile')::clinical.phone_type,
                NOW()
            );
            p_imported_count := p_imported_count + 1;
        EXCEPTION WHEN OTHERS THEN
            p_error_count := p_error_count + 1;
            INSERT INTO system.audit_logs (action, table_name, details, performed_by)
            VALUES ('import', 'patients', format('Error importing: %s', SQLERRM), 0);
        END;
    END LOOP;
END;
$$;

-- =============================================================================
-- AGGREGATE FUNCTIONS
-- =============================================================================
CREATE OR REPLACE AGGREGATE clinical.array_concat_agg(ANYARRAY) (
    SFUNC = array_cat,
    STYPE = ANYARRAY,
    INITCOND = '{}'
);

CREATE OR REPLACE AGGREGATE financial.percentile_cont_90(NUMERIC) (
    SFUNC = financial.percentile_transfn,
    STYPE = INTERNAL,
    FINALFUNC = financial.percentile_cont_final,
    FINALFUNC_EXTRA
);

CREATE OR REPLACE AGGREGATE clinical.weighted_average(NUMERIC, NUMERIC) (
    SFUNC = clinical.wavg_transfn,
    STYPE = NUMERIC[],
    FINALFUNC = clinical.wavg_finalfn,
    INITCOND = '{0,0}'
);

-- =============================================================================
-- STATISTICS
-- =============================================================================
CREATE STATISTICS clinical.patient_demographics_stats (
    MCV, NDISTINCT, DEPENDENCIES
) ON gender, date_of_birth, primary_address->>'state_code'
FROM clinical.patients;

CREATE STATISTICS financial.billing_correlation_stats (
    DEPENDENCIES, MCV
) ON account_type, balance, last_payment_date
FROM financial.billing_accounts;

CREATE STATISTICS system.access_pattern_stats (
    NDISTINCT, MCV
) ON user_id, action, table_name
FROM system.audit_logs;

-- =============================================================================
-- FDW AND FOREIGN SERVERS (PG19: CONNECTION clause)
-- =============================================================================
CREATE SERVER remote_clinical_db
    FOREIGN DATA WRAPPER postgres_fdw
    CONNECTION 'host=clinical-db.internal port=5432 dbname=clinical_prod sslmode=require'
    OPTIONS (updatable 'true', fetch_size '10000');

CREATE SERVER remote_financial_db
    FOREIGN DATA WRAPPER postgres_fdw
    CONNECTION 'host=finance-db.internal port=5432 dbname=finance_prod sslmode=require'
    OPTIONS (updatable 'true', fetch_size '5000');

CREATE SERVER remote_analytics_db
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'analytics-db.internal', port '5432', dbname 'analytics');

CREATE USER MAPPING FOR CURRENT_USER
    SERVER remote_clinical_db
    OPTIONS (user 'fdw_reader', password 'REDACTED');

CREATE USER MAPPING FOR CURRENT_USER
    SERVER remote_financial_db
    OPTIONS (user 'fdw_reader', password 'REDACTED');

-- =============================================================================
-- FOREIGN TABLES (PG18: CREATE FOREIGN TABLE ... LIKE)
-- =============================================================================
CREATE FOREIGN TABLE fdw_schema.remote_patients (
    patient_id BIGINT,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    gender clinical.gender_enum
)
SERVER remote_clinical_db
OPTIONS (schema_name 'clinical', table_name 'patients');

CREATE FOREIGN TABLE fdw_schema.remote_invoices (
    invoice_id BIGINT,
    patient_id BIGINT,
    total_amount NUMERIC(12,2),
    status financial.invoice_status_enum,
    created_at TIMESTAMPTZ
)
SERVER remote_financial_db
OPTIONS (schema_name 'financial', table_name 'invoices');

-- PG18: CREATE FOREIGN TABLE ... LIKE
CREATE FOREIGN TABLE fdw_schema.remote_appointments (
    LIKE clinical.appointments
)
SERVER remote_clinical_db
OPTIONS (schema_name 'clinical', table_name 'appointments');

-- =============================================================================
-- CORE TEMPORAL TABLES — CLINICAL SCHEMA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PATIENTS (Temporal: system-versioned)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.patients (
    patient_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mrn TEXT NOT NULL CONSTRAINT patients_mrn_notnull NOT INHERIT DEFAULT clinical.generate_mrn(),
    first_name TEXT NOT NULL CONSTRAINT patients_fname_notnull NOT INHERIT,
    last_name TEXT NOT NULL CONSTRAINT patients_lname_notnull NOT INHERIT,
    date_of_birth DATE NOT NULL CONSTRAINT patients_dob_notnull NOT INHERIT,
    gender clinical.gender_enum NOT NULL,
    blood_type clinical.blood_type_enum DEFAULT 'unknown',
    ssn clinical.ssn_domain,
    primary_address clinical.address_type,
    primary_phone clinical.phone_type,
    email system.email_domain,
    emergency_contact JSONB,
    risk_score NUMERIC(5,2),
    -- PG18: VIRTUAL generated columns
    full_name TEXT GENERATED ALWAYS AS (
        CONCAT_WS(' ', first_name, NULLIF(last_name, ''))
    ) VIRTUAL,
    age INTEGER GENERATED ALWAYS AS (
        clinical.calculate_age(date_of_birth)
    ) VIRTUAL,
    is_pediatric BOOLEAN GENERATED ALWAYS AS (
        clinical.calculate_age(date_of_birth) < 18
    ) VIRTUAL,
    is_geriatric BOOLEAN GENERATED ALWAYS AS (
        clinical.calculate_age(date_of_birth) >= 65
    ) VIRTUAL,
    display_name TEXT GENERATED ALWAYS AS (
        last_name || ', ' || first_name
    ) VIRTUAL,
    -- System temporal columns
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',
    status clinical.record_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- PG18: PERIOD definition for system versioning
    PERIOD FOR system_time (sys_start, sys_end),

    -- Constraints
    CONSTRAINT patients_mrn_unique UNIQUE (mrn),
    CONSTRAINT patients_ssn_unique UNIQUE NULLS NOT DISTINCT (ssn),
    CONSTRAINT patients_dob_reasonable CHECK (
        date_of_birth BETWEEN '1900-01-01' AND CURRENT_DATE
    ),
    CONSTRAINT patients_valid_risk CHECK (
        risk_score IS NULL OR risk_score BETWEEN 0 AND 50
    ),
    -- NOT ENFORCED soft constraint
    CONSTRAINT patients_email_format_soft NOT ENFORCED CHECK (
        email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
) PARTITION BY RANGE (date_of_birth);

-- PG18/PG19: PRIMARY KEY with WITHOUT OVERLAPS on period
ALTER TABLE clinical.patients
    ADD CONSTRAINT patients_pk_temporal
    PRIMARY KEY (patient_id, system_time WITHOUT OVERLAPS);

-- Patient partitions by birth decade
CREATE TABLE clinical.patients_born_before_1950 PARTITION OF clinical.patients
    FOR VALUES FROM ('1900-01-01') TO ('1950-01-01');

CREATE TABLE clinical.patients_born_1950s PARTITION OF clinical.patients
    FOR VALUES FROM ('1950-01-01') TO ('1960-01-01');

CREATE TABLE clinical.patients_born_1960s PARTITION OF clinical.patients
    FOR VALUES FROM ('1960-01-01') TO ('1970-01-01');

CREATE TABLE clinical.patients_born_1970s PARTITION OF clinical.patients
    FOR VALUES FROM ('1970-01-01') TO ('1980-01-01');

CREATE TABLE clinical.patients_born_1980s PARTITION OF clinical.patients
    FOR VALUES FROM ('1980-01-01') TO ('1990-01-01');

CREATE TABLE clinical.patients_born_1990s PARTITION OF clinical.patients
    FOR VALUES FROM ('1990-01-01') TO ('2000-01-01');

CREATE TABLE clinical.patients_born_2000s PARTITION OF clinical.patients
    FOR VALUES FROM ('2000-01-01') TO ('2010-01-01');

CREATE TABLE clinical.patients_born_2010s PARTITION OF clinical.patients
    FOR VALUES FROM ('2010-01-01') TO ('2020-01-01');

CREATE TABLE clinical.patients_born_2020s PARTITION OF clinical.patients
    FOR VALUES FROM ('2020-01-01') TO ('2030-01-01');

CREATE TABLE clinical.patients_born_default PARTITION OF clinical.patients
    DEFAULT;

-- -----------------------------------------------------------------------------
-- PATIENT_ADDRESSES (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.patient_addresses (
    address_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    address clinical.address_type NOT NULL,
    address_type TEXT NOT NULL DEFAULT 'home',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE NOT NULL DEFAULT '9999-12-31',
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR validity (valid_from, valid_to),

    CONSTRAINT patient_addresses_pk PRIMARY KEY (address_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT patient_addresses_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT patient_addresses_one_primary CHECK (
        NOT is_primary OR address_type IN ('home', 'billing')
    ),
    CONSTRAINT patient_addresses_valid_dates CHECK (valid_from <= valid_to)
);

-- Exclusion constraint for no overlapping primary addresses per patient
CREATE INDEX idx_patient_addresses_patient ON clinical.patient_addresses USING btree (patient_id);

-- -----------------------------------------------------------------------------
-- PATIENT_CONTACTS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.patient_contacts (
    contact_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'email', 'fax', 'portal')),
    contact_value TEXT NOT NULL,
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE NOT NULL DEFAULT '9999-12-31',
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',
    contact_display TEXT GENERATED ALWAYS AS (
        contact_type || ': ' || contact_value
    ) VIRTUAL,

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR contact_validity (valid_from, valid_to),

    CONSTRAINT patient_contacts_pk PRIMARY KEY (contact_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT patient_contacts_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time)
        ON DELETE CASCADE,
    CONSTRAINT patient_contacts_valid_range CHECK (valid_from <= valid_to)
);

-- -----------------------------------------------------------------------------
-- MEDICAL_RECORDS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.medical_records (
    record_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_type TEXT NOT NULL CHECK (visit_type IN ('office', 'telehealth', 'emergency', 'inpatient', 'home')),
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    physical_examination TEXT,
    assessment TEXT,
    plan TEXT,
    follow_up_interval_days INTEGER DEFAULT 30,
    encounter_duration_minutes INTEGER,
    complexity_level INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN assessment IS NOT NULL AND plan IS NOT NULL AND physical_examination IS NOT NULL THEN 3
            WHEN assessment IS NOT NULL AND plan IS NOT NULL THEN 2
            ELSE 1
        END
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT medical_records_pk PRIMARY KEY (record_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT medical_records_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT medical_records_fk_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT medical_records_valid_followup CHECK (
        follow_up_interval_days BETWEEN 1 AND 365
    ),
    CONSTRAINT medical_records_duration CHECK (
        encounter_duration_minutes IS NULL OR encounter_duration_minutes > 0
    )
) PARTITION BY RANGE (visit_date);

CREATE TABLE clinical.medical_records_2023 PARTITION OF clinical.medical_records
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE clinical.medical_records_2024 PARTITION OF clinical.medical_records
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE clinical.medical_records_2025 PARTITION OF clinical.medical_records
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE clinical.medical_records_default PARTITION OF clinical.medical_records
    DEFAULT;

-- -----------------------------------------------------------------------------
-- DIAGNOSES
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.diagnoses (
    diagnosis_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    icd10_code TEXT NOT NULL,
    description TEXT NOT NULL,
    severity clinical.severity_enum DEFAULT 'moderate',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_chronic BOOLEAN NOT NULL DEFAULT FALSE,
    diagnosed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    resolved_date DATE,
    confirming_doctor_id BIGINT NOT NULL,
    notes TEXT,
    is_confirmed BOOLEAN GENERATED ALWAYS AS (
        confirming_doctor_id IS NOT NULL AND diagnosed_date IS NOT NULL
    ) VIRTUAL,
    days_since_diagnosis INTEGER GENERATED ALWAYS AS (
        CURRENT_DATE - diagnosed_date
    ) VIRTUAL,

    CONSTRAINT diagnoses_fk_record
        FOREIGN KEY (record_id, PERIOD system_time)
        REFERENCES clinical.medical_records (record_id, PERIOD system_time)
        ON DELETE CASCADE,
    CONSTRAINT diagnoses_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT diagnoses_fk_doctor
        FOREIGN KEY (confirming_doctor_id)
        REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT diagnoses_valid_icd10 CHECK (clinical.validate_icd10(icd10_code)),
    CONSTRAINT diagnoses_resolved_after_diagnosed CHECK (
        resolved_date IS NULL OR resolved_date >= diagnosed_date
    ),
    CONSTRAINT diagnoses_one_primary_per_record NOT ENFORCED CHECK (
        NOT is_primary OR NOT EXISTS (
            SELECT 1 FROM clinical.diagnoses d2
            WHERE d2.record_id = diagnoses.record_id
              AND d2.is_primary = TRUE
              AND d2.diagnosis_id != diagnoses.diagnosis_id
        )
    )
);

-- GIN index for full-text search on descriptions
CREATE INDEX idx_diagnoses_description_fts ON clinical.diagnoses
    USING gin (to_tsvector('english', description));

-- Covering index
CREATE INDEX idx_diagnoses_patient_icd10 ON clinical.diagnoses
    USING btree (patient_id, icd10_code)
    INCLUDE (severity, is_primary, diagnosed_date);

-- Partial index for chronic conditions
CREATE INDEX idx_diagnoses_chronic ON clinical.diagnoses (patient_id, icd10_code)
    WHERE is_chronic = TRUE;

-- -----------------------------------------------------------------------------
-- PROCEDURES TABLE (not the PL/pgSQL kind)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.procedures (
    procedure_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_id BIGINT,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    cpt_code TEXT NOT NULL,
    description TEXT NOT NULL,
    category clinical.procedure_category_enum NOT NULL DEFAULT 'diagnostic',
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER,
    outcome TEXT,
    complications TEXT,
    body_site TEXT,
    laterality TEXT CHECK (laterality IN ('left', 'right', 'bilateral', 'unspecified')),
    estimated_cost NUMERIC(10,2),
    is_valid_cpt BOOLEAN GENERATED ALWAYS AS (
        clinical.validate_cpt(cpt_code)
    ) VIRTUAL,

    CONSTRAINT procedures_fk_record
        FOREIGN KEY (record_id, PERIOD system_time)
        REFERENCES clinical.medical_records (record_id, PERIOD system_time),
    CONSTRAINT procedures_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT procedures_fk_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT procedures_duration_positive CHECK (
        duration_minutes IS NULL OR duration_minutes > 0
    ),
    CONSTRAINT procedures_cost_positive CHECK (
        estimated_cost IS NULL OR estimated_cost >= 0
    )
);

-- GiST index for temporal overlap queries
CREATE INDEX idx_procedures_performed_gist ON clinical.procedures
    USING gist (tsrange(performed_at, performed_at + (duration_minutes || ' minutes')::interval));

-- BRIN index on performed_at
CREATE INDEX idx_procedures_performed_brin ON clinical.procedures
    USING brin (performed_at) WITH (pages_per_range = 32);

-- -----------------------------------------------------------------------------
-- MEDICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.medications (
    medication_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ndc_code TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    brand_name TEXT,
    therapeutic_class TEXT NOT NULL,
    dosage_form TEXT,
    strength TEXT,
    route clinical.medication_route_enum DEFAULT 'oral',
    controlled_substance_schedule INTEGER CHECK (
        controlled_substance_schedule BETWEEN 1 AND 5 OR controlled_substance_schedule IS NULL
    ),
    is_formulary BOOLEAN DEFAULT TRUE,
    dea_classification TEXT,
    fda_approval_date DATE,
    manufacturer TEXT,
    is_controlled BOOLEAN GENERATED ALWAYS AS (
        controlled_substance_schedule IS NOT NULL
    ) VIRTUAL,
    schedule_display TEXT GENERATED ALWAYS AS (
        CASE
            WHEN controlled_substance_schedule = 1 THEN 'Schedule I'
            WHEN controlled_substance_schedule = 2 THEN 'Schedule II'
            WHEN controlled_substance_schedule = 3 THEN 'Schedule III'
            WHEN controlled_substance_schedule = 4 THEN 'Schedule IV'
            WHEN controlled_substance_schedule = 5 THEN 'Schedule V'
            ELSE 'Non-controlled'
        END
    ) VIRTUAL,

    CONSTRAINT medications_ndc_unique UNIQUE (ndc_code),
    CONSTRAINT medications_valid_ndc CHECK (clinical.validate_ndc(ndc_code)),
    CONSTRAINT medications_generic_required NOT ENFORCED CHECK (
        generic_name IS NOT NULL AND LENGTH(generic_name) > 2
    )
);

-- Hash index on generic name
CREATE INDEX idx_medications_generic_hash ON clinical.medications
    USING hash (generic_name);

-- GIN index on therapeutic class (using intarray if mapped)
CREATE INDEX idx_medications_therapeutic_gin ON clinical.medications
    USING gin (to_tsvector('english', therapeutic_class));

-- SP-GiST index on brand name
CREATE INDEX idx_medications_brand_spgist ON clinical.medications
    USING spgist (brand_name);

-- -----------------------------------------------------------------------------
-- PRESCRIPTIONS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.prescriptions (
    prescription_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    medication_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    refills_remaining INTEGER DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    prescribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN GENERATED ALWAYS AS (
        end_date IS NULL OR end_date >= CURRENT_DATE
    ) VIRTUAL,
    duration_days INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN end_date IS NOT NULL THEN end_date - start_date
            ELSE NULL
        END
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR prescription_period (start_date, COALESCE(end_date, '9999-12-31')),

    CONSTRAINT prescriptions_pk PRIMARY KEY (prescription_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT prescriptions_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT prescriptions_fk_medication
        FOREIGN KEY (medication_id)
        REFERENCES clinical.medications (medication_id),
    CONSTRAINT prescriptions_fk_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT prescriptions_valid_dates CHECK (
        end_date IS NULL OR end_date >= start_date
    ),
    CONSTRAINT prescriptions_quantity_positive CHECK (quantity > 0),
    CONSTRAINT prescriptions_no_overlap NOT ENFORCED EXCLUDE USING gist (
        patient_id WITH =,
        medication_id WITH =,
        daterange(start_date, COALESCE(end_date, '9999-12-31'), '[)') WITH &&
    )
);

-- Expression index
CREATE INDEX idx_prescriptions_active ON clinical.prescriptions (patient_id)
    WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- -----------------------------------------------------------------------------
-- LAB_RESULTS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.lab_results (
    result_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    record_id BIGINT,
    test_name TEXT NOT NULL,
    test_code TEXT NOT NULL,
    result_value NUMERIC,
    result_unit TEXT,
    reference_range_low NUMERIC,
    reference_range_high NUMERIC,
    is_abnormal BOOLEAN GENERATED ALWAYS AS (
        result_value IS NOT NULL
        AND (
            result_value < reference_range_low
            OR result_value > reference_range_high
        )
    ) VIRTUAL,
    abnormality_flag TEXT GENERATED ALWAYS AS (
        CASE
            WHEN result_value IS NULL THEN NULL
            WHEN result_value < reference_range_low THEN 'LOW'
            WHEN result_value > reference_range_high THEN 'HIGH'
            ELSE 'NORMAL'
        END
    ) VIRTUAL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resulted_at TIMESTAMPTZ,
    status clinical.lab_status_enum NOT NULL DEFAULT 'ordered',
    ordering_doctor_id BIGINT NOT NULL,
    performing_lab TEXT,
    notes TEXT,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT lab_results_pk PRIMARY KEY (result_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT lab_results_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT lab_results_fk_record
        FOREIGN KEY (record_id, PERIOD system_time)
        REFERENCES clinical.medical_records (record_id, PERIOD system_time),
    CONSTRAINT lab_results_fk_doctor
        FOREIGN KEY (ordering_doctor_id)
        REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT lab_results_valid_range CHECK (
        reference_range_low IS NULL OR reference_range_high IS NULL
        OR reference_range_low <= reference_range_high
    ),
    CONSTRAINT lab_results_resulted_after_collected CHECK (
        resulted_at IS NULL OR resulted_at >= collected_at
    )
);

-- Btree index for common queries
CREATE INDEX idx_lab_results_patient_test ON clinical.lab_results
    USING btree (patient_id, test_code, collected_at DESC);

-- Partial index for pending results
CREATE INDEX idx_lab_results_pending ON clinical.lab_results (patient_id, test_name)
    WHERE status IN ('ordered', 'collected', 'processing');

-- -----------------------------------------------------------------------------
-- ALLERGIES (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.allergies (
    allergy_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    allergen TEXT NOT NULL,
    allergen_type TEXT NOT NULL CHECK (allergen_type IN ('drug', 'food', 'environmental', 'latex', 'other')),
    severity clinical.severity_enum NOT NULL DEFAULT 'mild',
    reaction TEXT,
    confirmed_at DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    reported_by TEXT,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT allergies_pk PRIMARY KEY (allergy_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT allergies_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time)
        ON DELETE CASCADE,
    CONSTRAINT allergies_no_duplicate NOT ENFORCED UNIQUE (patient_id, allergen)
);

-- -----------------------------------------------------------------------------
-- VITALS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.vitals (
    vital_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    record_id BIGINT,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    temperature_c NUMERIC(4,1),
    weight_kg NUMERIC(5,1),
    height_cm NUMERIC(5,1),
    oxygen_saturation INTEGER CHECK (oxygen_saturation BETWEEN 0 AND 100),
    pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
    bmi NUMERIC(5,2) GENERATED ALWAYS AS (
        clinical.calculate_bmi(
            COALESCE(weight_kg, 0),
            NULLIF(height_cm, 0)
        )
    ) VIRTUAL,
    bp_display TEXT GENERATED ALWAYS AS (
        CASE
            WHEN systolic_bp IS NOT NULL AND diastolic_bp IS NOT NULL
            THEN systolic_bp || '/' || diastolic_bp
            ELSE NULL
        END
    ) VIRTUAL,
    is_hypertensive BOOLEAN GENERATED ALWAYS AS (
        systolic_bp IS NOT NULL AND systolic_bp >= 140
    ) VIRTUAL,
    is_tachycardic BOOLEAN GENERATED ALWAYS AS (
        heart_rate IS NOT NULL AND heart_rate > 100
    ) VIRTUAL,
    is_feverish BOOLEAN GENERATED ALWAYS AS (
        temperature_c IS NOT NULL AND temperature_c >= 38.0
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT vitals_pk PRIMARY KEY (vital_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT vitals_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT vitals_fk_record
        FOREIGN KEY (record_id, PERIOD system_time)
        REFERENCES clinical.medical_records (record_id, PERIOD system_time),
    CONSTRAINT vitals_bp_range CHECK (
        (systolic_bp IS NULL OR systolic_bp BETWEEN 40 AND 300)
        AND (diastolic_bp IS NULL OR diastolic_bp BETWEEN 20 AND 200)
    ),
    CONSTRAINT vitals_hr_range CHECK (
        heart_rate IS NULL OR heart_rate BETWEEN 20 AND 300
    ),
    CONSTRAINT vitals_temp_range CHECK (
        temperature_c IS NULL OR temperature_c BETWEEN 30.0 AND 45.0
    )
) PARTITION BY HASH (patient_id);

CREATE TABLE clinical.vitals_p0 PARTITION OF clinical.vitals FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE clinical.vitals_p1 PARTITION OF clinical.vitals FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE clinical.vitals_p2 PARTITION OF clinical.vitals FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE clinical.vitals_p3 PARTITION OF clinical.vitals FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- -----------------------------------------------------------------------------
-- APPOINTMENTS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.appointments (
    appointment_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    facility_id BIGINT,
    department_id BIGINT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status clinical.appointment_status_enum NOT NULL DEFAULT 'scheduled',
    reason TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60
    ) VIRTUAL,
    is_walk_in BOOLEAN DEFAULT FALSE,
    is_telehealth BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR appointment_period (scheduled_start, scheduled_end),

    CONSTRAINT appointments_pk PRIMARY KEY (appointment_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT appointments_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT appointments_fk_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT appointments_end_after_start CHECK (
        scheduled_end > scheduled_start
    ),
    CONSTRAINT appointments_actual_times CHECK (
        (actual_start IS NULL AND actual_end IS NULL)
        OR (actual_start IS NOT NULL AND actual_end IS NOT NULL AND actual_end > actual_start)
    ),
    CONSTRAINT appointments_no_double_book NOT ENFORCED EXCLUDE USING gist (
        doctor_id WITH =,
        tsrange(scheduled_start, scheduled_end, '[)') WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

-- Btree index for schedule lookups
CREATE INDEX idx_appointments_doctor_schedule ON clinical.appointments
    USING btree (doctor_id, scheduled_start, scheduled_end);

-- Covering index for patient portal
CREATE INDEX idx_appointments_patient_upcoming ON clinical.appointments
    USING btree (patient_id, scheduled_start)
    INCLUDE (status, doctor_id, reason)
    WHERE status IN ('scheduled', 'confirmed', 'checked_in');

-- GiST index for temporal overlap
CREATE INDEX idx_appointments_time_gist ON clinical.appointments
    USING gist (tsrange(scheduled_start, scheduled_end, '[)'));

-- -----------------------------------------------------------------------------
-- APPOINTMENT_SLOTS
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.appointment_slots (
    slot_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id BIGINT NOT NULL,
    facility_id BIGINT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    slot_type TEXT NOT NULL DEFAULT 'office' CHECK (slot_type IN ('office', 'telehealth', 'emergency', 'procedure')),
    recurring_pattern TEXT,
    max_bookings INTEGER DEFAULT 1,

    CONSTRAINT appointment_slots_fk_doctor
        FOREIGN KEY (doctor_id) REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT appointment_slots_valid_time CHECK (end_time > start_time),
    CONSTRAINT appointment_slots_no_overlap EXCLUDE USING gist (
        doctor_id WITH =,
        tsrange(start_time, end_time, '[)') WITH &&
    ) WHERE (is_available = TRUE)
);

-- -----------------------------------------------------------------------------
-- DEPARTMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.departments (
    department_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_name TEXT NOT NULL CONSTRAINT departments_name_notnull NOT INHERIT,
    department_code TEXT NOT NULL UNIQUE,
    facility_id BIGINT,
    head_doctor_id BIGINT,
    parent_department_id BIGINT,
    department_type TEXT CHECK (department_type IN ('clinical', 'administrative', 'research', 'support')),
    budget NUMERIC(14,2),
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT departments_fk_parent
        FOREIGN KEY (parent_department_id)
        REFERENCES clinical.departments (department_id)
        ON DELETE SET NULL,
    CONSTRAINT departments_fk_head_doctor
        FOREIGN KEY (head_doctor_id)
        REFERENCES clinical.doctors (doctor_id)
        ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- FACILITIES (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.facilities (
    facility_id BIGINT GENERATED ALWAYS AS IDENTITY,
    facility_name TEXT NOT NULL,
    facility_code TEXT NOT NULL,
    facility_type TEXT NOT NULL CHECK (facility_type IN ('hospital', 'clinic', 'urgent_care', 'rehab', 'lab', 'pharmacy', 'imaging_center')),
    address clinical.address_type NOT NULL,
    phone clinical.phone_type,
    npi clinical.npi_domain,
    tax_id TEXT,
    capacity INTEGER,
    is_teaching BOOLEAN DEFAULT FALSE,
    accreditation_status TEXT DEFAULT 'pending',
    is_active BOOLEAN GENERATED ALWAYS AS (
        accreditation_status IN ('accredited', 'provisional')
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT facilities_pk PRIMARY KEY (facility_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT facilities_code_unique UNIQUE (facility_code)
);

-- -----------------------------------------------------------------------------
-- DOCTORS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.doctors (
    doctor_id BIGINT GENERATED ALWAYS AS IDENTITY,
    npi clinical.npi_domain NOT NULL,
    first_name TEXT NOT NULL CONSTRAINT doctors_fname_notnull NOT INHERIT,
    last_name TEXT NOT NULL CONSTRAINT doctors_lname_notnull NOT INHERIT,
    email system.email_domain,
    phone clinical.phone_type,
    primary_facility_id BIGINT,
    department_id BIGINT,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    is_active BOOLEAN GENERATED ALWAYS AS (
        termination_date IS NULL OR termination_date > CURRENT_DATE
    ) VIRTUAL,
    years_of_experience INTEGER GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM age(CURRENT_DATE, hire_date))::INTEGER
    ) VIRTUAL,
    full_name TEXT GENERATED ALWAYS AS (
        'Dr. ' || first_name || ' ' || last_name
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT doctors_pk PRIMARY KEY (doctor_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT doctors_npi_unique UNIQUE (npi),
    CONSTRAINT doctors_termination_after_hire CHECK (
        termination_date IS NULL OR termination_date >= hire_date
    ),
    CONSTRAINT doctors_fk_facility
        FOREIGN KEY (primary_facility_id, PERIOD system_time)
        REFERENCES clinical.facilities (facility_id, PERIOD system_time)
        ON DELETE SET NULL,
    CONSTRAINT doctors_fk_department
        FOREIGN KEY (department_id)
        REFERENCES clinical.departments (department_id)
        ON DELETE SET NULL
) PARTITION BY LIST (primary_facility_id);

-- -----------------------------------------------------------------------------
-- DOCTOR_SPECIALIZATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.doctor_specializations (
    specialization_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id BIGINT NOT NULL,
    specialty_code TEXT NOT NULL,
    specialty_name TEXT NOT NULL,
    board_certified BOOLEAN DEFAULT FALSE,
    certification_date DATE,
    expiration_date DATE,
    is_current BOOLEAN GENERATED ALWAYS AS (
        expiration_date IS NULL OR expiration_date >= CURRENT_DATE
    ) VIRTUAL,

    CONSTRAINT doctor_specs_fk_doctor
        FOREIGN KEY (doctor_id) REFERENCES clinical.doctors (doctor_id) ON DELETE CASCADE,
    CONSTRAINT doctor_specs_unique UNIQUE (doctor_id, specialty_code),
    CONSTRAINT doctor_specs_cert_dates CHECK (
        certification_date IS NULL OR expiration_date IS NULL OR expiration_date >= certification_date
    ),
    CONSTRAINT doctor_specs_soft_enforcement NOT ENFORCED CHECK (
        board_certified = FALSE OR certification_date IS NOT NULL
    )
);

-- -----------------------------------------------------------------------------
-- NURSES
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.nurses (
    nurse_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    license_number TEXT NOT NULL UNIQUE,
    license_type TEXT CHECK (license_type IN ('RN', 'LPN', 'NP', 'CNA', 'APRN')),
    facility_id BIGINT,
    department_id BIGINT,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT nurses_fk_facility
        FOREIGN KEY (facility_id) REFERENCES clinical.facilities (facility_id),
    CONSTRAINT nurses_fk_department
        FOREIGN KEY (department_id) REFERENCES clinical.departments (department_id)
);

-- -----------------------------------------------------------------------------
-- STAFF
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.staff (
    staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email system.email_domain UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('receptionist', 'billing', 'admin', 'it', 'maintenance', 'security', 'pharmacist', 'technician')),
    facility_id BIGINT,
    department_id BIGINT,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT staff_fk_facility
        FOREIGN KEY (facility_id) REFERENCES clinical.facilities (facility_id)
);

-- -----------------------------------------------------------------------------
-- ROOMS
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.rooms (
    room_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    facility_id BIGINT NOT NULL,
    room_number TEXT NOT NULL,
    floor_number INTEGER NOT NULL,
    room_type TEXT NOT NULL CHECK (room_type IN ('patient', 'icu', 'surgery', 'examination', 'lab', 'imaging', 'waiting', 'office', 'storage')),
    capacity INTEGER DEFAULT 1,
    is_available BOOLEAN DEFAULT TRUE,
    has_oxygen BOOLEAN DEFAULT FALSE,
    has_monitoring BOOLEAN DEFAULT FALSE,
    room_display TEXT GENERATED ALWAYS AS (
        room_type || ' ' || room_number || ' (Floor ' || floor_number || ')'
    ) VIRTUAL,

    CONSTRAINT rooms_fk_facility
        FOREIGN KEY (facility_id) REFERENCES clinical.facilities (facility_id),
    CONSTRAINT rooms_unique_per_facility UNIQUE (facility_id, room_number)
);

-- -----------------------------------------------------------------------------
-- BEDS
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.beds (
    bed_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id BIGINT NOT NULL,
    bed_label TEXT NOT NULL DEFAULT 'A',
    bed_type TEXT CHECK (bed_type IN ('standard', 'icu', 'crib', 'stretcher', 'bariatric', 'isolation')),
    is_occupied BOOLEAN DEFAULT FALSE,
    current_patient_id BIGINT,
    admit_at TIMESTAMPTZ,

    CONSTRAINT beds_fk_room
        FOREIGN KEY (room_id) REFERENCES clinical.rooms (room_id) ON DELETE CASCADE,
    CONSTRAINT beds_fk_patient
        FOREIGN KEY (current_patient_id) REFERENCES clinical.patients (patient_id),
    CONSTRAINT beds_unique_in_room UNIQUE (room_id, bed_label)
);

-- =============================================================================
-- TEMPORAL TABLES — INSURANCE & COVERAGE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PATIENT_INSURANCE (Temporal with WITHOUT OVERLAPS PK)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.patient_insurance (
    insurance_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    insurance_plan_id BIGINT NOT NULL,
    member_id TEXT NOT NULL,
    group_number TEXT,
    subscriber_name TEXT,
    subscriber_relationship TEXT CHECK (
        subscriber_relationship IN ('self', 'spouse', 'child', 'domestic_partner', 'other')
    ),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    coverage_start DATE NOT NULL,
    coverage_end DATE,
    copay_amount NUMERIC(8,2) DEFAULT 25.00,
    deductible NUMERIC(10,2) DEFAULT 0,
    deductible_met NUMERIC(10,2) DEFAULT 0,
    out_of_pocket_max NUMERIC(10,2),
    out_of_pocket_used NUMERIC(10,2) DEFAULT 0,
    coverage_remaining_pct NUMERIC(5,4) GENERATED ALWAYS AS (
        CASE
            WHEN out_of_pocket_max IS NULL THEN NULL
            ELSE GREATEST(0, 1 - (out_of_pocket_used / out_of_pocket_max))
        END
    ) VIRTUAL,
    is_active_coverage BOOLEAN GENERATED ALWAYS AS (
        coverage_end IS NULL OR coverage_end >= CURRENT_DATE
    ) VIRTUAL,
    coverage_period daterange GENERATED ALWAYS AS (
        daterange(coverage_start, COALESCE(coverage_end, '9999-12-31'), '[)')
    ) STORED,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR coverage_period_t (coverage_start, COALESCE(coverage_end, '9999-12-31')),

    CONSTRAINT patient_insurance_pk PRIMARY KEY (insurance_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT patient_insurance_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time)
        ON DELETE CASCADE,
    CONSTRAINT patient_insurance_fk_plan
        FOREIGN KEY (insurance_plan_id)
        REFERENCES clinical.insurance_plans (plan_id),
    CONSTRAINT patient_insurance_no_overlapping_primary
        EXCLUDE USING gist (
            patient_id WITH =,
            coverage_period WITH &&
        ) WHERE (is_primary = TRUE),
    CONSTRAINT patient_insurance_coverage_dates CHECK (
        coverage_end IS NULL OR coverage_end >= coverage_start
    ),
    CONSTRAINT patient_insurance_copay_nonneg CHECK (copay_amount >= 0),
    CONSTRAINT patient_insurance_deductible_valid CHECK (
        deductible_met <= deductible
    ),
    -- NOT ENFORCED: soft constraint for business rule
    CONSTRAINT patient_insurance_one_primary_per_period NOT ENFORCED CHECK (
        NOT is_primary OR subscriber_relationship = 'self'
    )
);

CREATE INDEX idx_patient_ins_patient_coverage ON clinical.patient_insurance
    USING gist (coverage_period);

-- -----------------------------------------------------------------------------
-- INSURANCE_PLANS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.insurance_plans (
    plan_id BIGINT GENERATED ALWAYS AS IDENTITY,
    plan_name TEXT NOT NULL,
    plan_code TEXT NOT NULL,
    insurer_name TEXT NOT NULL,
    insurer_code TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('hmo', 'ppo', 'epo', 'pos', 'hdhp', 'medicare', 'medicaid', 'tricare', 'va', 'workers_comp', 'self_pay')),
    network_tier TEXT DEFAULT 'standard',
    effective_date DATE NOT NULL,
    termination_date DATE,
    monthly_premium NUMERIC(8,2),
    annual_deductible NUMERIC(10,2),
    individual_oop_max NUMERIC(10,2),
    family_oop_max NUMERIC(10,2),
    coinsurance_pct NUMERIC(3,2) DEFAULT 0.80,
    requires_referral BOOLEAN DEFAULT FALSE,
    requires_preauth BOOLEAN DEFAULT FALSE,
    is_active_plan BOOLEAN GENERATED ALWAYS AS (
        termination_date IS NULL OR termination_date > CURRENT_DATE
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT insurance_plans_pk PRIMARY KEY (plan_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT insurance_plans_code_unique UNIQUE (plan_code),
    CONSTRAINT insurance_plans_dates CHECK (
        termination_date IS NULL OR termination_date >= effective_date
    ),
    CONSTRAINT insurance_plans_coinsurance CHECK (
        coinsurance_pct BETWEEN 0 AND 1
    )
);

-- -----------------------------------------------------------------------------
-- COVERAGE_PERIODS (Temporal — multi-period)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.coverage_periods (
    coverage_id BIGINT GENERATED ALWAYS AS IDENTITY,
    insurance_id BIGINT NOT NULL,
    coverage_type TEXT NOT NULL CHECK (coverage_type IN ('medical', 'dental', 'vision', 'pharmacy', 'mental_health', 'rehabilitation')),
    start_date DATE NOT NULL,
    end_date DATE,
    max_benefit NUMERIC(12,2),
    benefit_used NUMERIC(12,2) DEFAULT 0,
    benefit_remaining NUMERIC(12,2) GENERATED ALWAYS AS (
        CASE
            WHEN max_benefit IS NULL THEN NULL
            ELSE GREATEST(0, max_benefit - benefit_used)
        END
    ) VIRTUAL,
    benefit_utilization_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN max_benefit IS NULL OR max_benefit = 0 THEN NULL
            ELSE ROUND((benefit_used / max_benefit) * 100, 2)
        END
    ) VIRTUAL,
    requires_preauth BOOLEAN DEFAULT FALSE,
    is_unlimited BOOLEAN DEFAULT FALSE,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR coverage_validity (start_date, COALESCE(end_date, '9999-12-31')),

    CONSTRAINT coverage_periods_pk PRIMARY KEY (coverage_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT coverage_periods_fk_insurance
        FOREIGN KEY (insurance_id, PERIOD system_time)
        REFERENCES clinical.patient_insurance (insurance_id, PERIOD system_time)
        ON DELETE CASCADE,
    CONSTRAINT coverage_periods_valid_dates CHECK (
        end_date IS NULL OR end_date >= start_date
    ),
    CONSTRAINT coverage_periods_no_overlap EXCLUDE USING gist (
        insurance_id WITH =,
        coverage_type WITH =,
        daterange(start_date, COALESCE(end_date, '9999-12-31'), '[)') WITH &&
    )
);

-- -----------------------------------------------------------------------------
-- TREATMENT_PLANS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.treatment_plans (
    plan_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    plan_name TEXT NOT NULL,
    diagnosis_icd10 TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_end_date DATE,
    actual_end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'discontinued', 'on_hold')),
    goals TEXT[],
    progress_notes TEXT,
    completion_pct clinical.percentage DEFAULT 0,
    is_on_schedule BOOLEAN GENERATED ALWAYS AS (
        status = 'active'
        AND (target_end_date IS NULL OR target_end_date >= CURRENT_DATE)
    ) VIRTUAL,
    days_remaining INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN target_end_date IS NULL THEN NULL
            WHEN actual_end_date IS NOT NULL THEN 0
            ELSE GREATEST(0, target_end_date - CURRENT_DATE)
        END
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR plan_period (start_date, COALESCE(actual_end_date, target_end_date, '9999-12-31')),

    CONSTRAINT treatment_plans_pk PRIMARY KEY (plan_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT treatment_plans_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT treatment_plans_fk_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT treatment_plans_dates CHECK (
        target_end_date IS NULL OR target_end_date >= start_date
    ),
    CONSTRAINT treatment_plans_actual_dates CHECK (
        actual_end_date IS NULL OR actual_end_date >= start_date
    ),
    CONSTRAINT treatment_plans_completion CHECK (
        completion_pct BETWEEN 0 AND 100
    )
);

-- -----------------------------------------------------------------------------
-- MEDICATION_SCHEDULES (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.medication_schedules (
    schedule_id BIGINT GENERATED ALWAYS AS IDENTITY,
    prescription_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    schedule_time TIME NOT NULL,
    dose_quantity NUMERIC(5,2) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'bid', 'tid', 'qid', 'q4h', 'q6h', 'q8h', 'q12h', 'weekly', 'prn')),
    day_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN GENERATED ALWAYS AS (
        end_date IS NULL OR end_date >= CURRENT_DATE
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT medication_schedules_pk PRIMARY KEY (schedule_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT medication_schedules_fk_prescription
        FOREIGN KEY (prescription_id, PERIOD system_time)
        REFERENCES clinical.prescriptions (prescription_id, PERIOD system_time)
        ON DELETE CASCADE,
    CONSTRAINT medication_schedules_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT medication_schedules_valid_dates CHECK (
        end_date IS NULL OR end_date >= start_date
    ),
    CONSTRAINT medication_schedules_dose_positive CHECK (dose_quantity > 0)
);

-- -----------------------------------------------------------------------------
-- VITAL_SIGNS_HISTORY (Temporal — audit trail for vitals)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.vital_signs_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY,
    vital_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('insert', 'update', 'delete', 'correction')),
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by BIGINT,
    reason TEXT,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT vital_signs_history_pk PRIMARY KEY (history_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT vital_signs_history_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT vital_signs_history_fk_vital
        FOREIGN KEY (vital_id)
        REFERENCES clinical.vitals (vital_id)
);

-- -----------------------------------------------------------------------------
-- AUDIT_TRAIL (Temporal — system-wide)
-- -----------------------------------------------------------------------------
CREATE TABLE clinical.audit_trail (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY,
    table_name TEXT NOT NULL,
    record_id BIGINT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
    old_data JSONB,
    new_data JSONB,
    performed_by BIGINT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip INET,
    session_id UUID,
    transaction_id XID,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT audit_trail_pk PRIMARY KEY (audit_id, system_time WITHOUT OVERLAPS)
) PARTITION BY RANGE (performed_at);

CREATE TABLE clinical.audit_trail_2024_q1 PARTITION OF clinical.audit_trail
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE clinical.audit_trail_2024_q2 PARTITION OF clinical.audit_trail
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE clinical.audit_trail_2024_q3 PARTITION OF clinical.audit_trail
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

CREATE TABLE clinical.audit_trail_2024_q4 PARTITION OF clinical.audit_trail
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

CREATE TABLE clinical.audit_trail_default PARTITION OF clinical.audit_trail
    DEFAULT;

-- =============================================================================
-- FINANCIAL SCHEMA TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BILLING_ACCOUNTS
-- -----------------------------------------------------------------------------
CREATE TABLE financial.billing_accounts (
    account_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('appointment', 'procedure', 'pharmacy', 'lab', 'facility', 'insurance')),
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    insurance_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    patient_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_payments NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_adjustments NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_payment_date DATE,
    last_statement_date DATE,
    is_delinquent BOOLEAN GENERATED ALWAYS AS (
        balance > 0 AND (last_payment_date IS NULL OR CURRENT_DATE - last_payment_date > 90)
    ) VIRTUAL,
    days_since_last_payment INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN last_payment_date IS NULL THEN NULL
            ELSE CURRENT_DATE - last_payment_date
        END
    ) VIRTUAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT billing_accounts_fk_patient
        FOREIGN KEY (patient_id) REFERENCES clinical.patients (patient_id) ON DELETE CASCADE,
    CONSTRAINT billing_accounts_balance_integrity CHECK (
        balance = total_charges - total_payments - total_adjustments
    ) NOT ENFORCED,
    CONSTRAINT billing_accounts_unique_per_type UNIQUE (patient_id, account_type),
    CONSTRAINT billing_accounts_nonneg CHECK (
        total_charges >= 0 AND total_payments >= 0 AND total_adjustments >= 0
    )
);

-- Expression index
CREATE INDEX idx_billing_accounts_delinquent ON financial.billing_accounts (patient_id, balance)
    WHERE balance > 0;

-- -----------------------------------------------------------------------------
-- INVOICES (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE financial.invoices (
    invoice_id BIGINT DEFAULT nextval('financial.invoice_seq'),
    patient_id BIGINT NOT NULL,
    billing_account_id BIGINT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    status financial.invoice_status_enum NOT NULL DEFAULT 'draft',
    insurance_submitted BOOLEAN DEFAULT FALSE,
    insurance_response TEXT,
    notes TEXT,
    is_overdue BOOLEAN GENERATED ALWAYS AS (
        status NOT IN ('paid', 'cancelled', 'refunded')
        AND due_date < CURRENT_DATE
        AND amount_paid < net_amount
    ) VIRTUAL,
    outstanding_balance NUMERIC(12,2) GENERATED ALWAYS AS (
        GREATEST(0, net_amount - amount_paid)
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT invoices_pk PRIMARY KEY (invoice_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT invoices_number_unique UNIQUE (invoice_number),
    CONSTRAINT invoices_fk_patient
        FOREIGN KEY (patient_id) REFERENCES clinical.patients (patient_id),
    CONSTRAINT invoices_fk_account
        FOREIGN KEY (billing_account_id) REFERENCES financial.billing_accounts (account_id),
    CONSTRAINT invoices_due_after_invoice CHECK (due_date >= invoice_date),
    CONSTRAINT invoices_amounts_valid CHECK (
        total_amount >= 0 AND tax_amount >= 0 AND discount_amount >= 0
    ),
    CONSTRAINT invoices_net_valid NOT ENFORCED CHECK (
        net_amount = total_amount + tax_amount - discount_amount
    )
);

-- -----------------------------------------------------------------------------
-- INVOICE_ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE financial.invoice_items (
    item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    line_number INTEGER NOT NULL,
    cpt_code TEXT,
    icd10_code TEXT,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    discount_pct NUMERIC(3,2) DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 1),
    line_total NUMERIC(12,2) GENERATED ALWAYS AS (
        ROUND(quantity * unit_price * (1 - discount_pct), 2)
    ) VIRTUAL,
    modifier_code TEXT,
    revenue_code TEXT,

    CONSTRAINT invoice_items_fk_invoice
        FOREIGN KEY (invoice_id) REFERENCES financial.invoices (invoice_id) ON DELETE CASCADE,
    CONSTRAINT invoice_items_unique_line UNIQUE (invoice_id, line_number)
);

-- Covering index
CREATE INDEX idx_invoice_items_invoice ON financial.invoice_items
    USING btree (invoice_id, line_number)
    INCLUDE (description, unit_price, line_total);

-- -----------------------------------------------------------------------------
-- PAYMENTS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE financial.payments (
    payment_id BIGINT DEFAULT nextval('financial.payment_seq'),
    invoice_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method financial.payment_method_enum NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    check_number TEXT,
    card_last_four CHAR(4),
    bank_name TEXT,
    is_refund BOOLEAN DEFAULT FALSE,
    processed_by BIGINT,
    notes TEXT,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT payments_pk PRIMARY KEY (payment_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT payments_fk_invoice
        FOREIGN KEY (invoice_id) REFERENCES financial.invoices (invoice_id),
    CONSTRAINT payments_fk_patient
        FOREIGN KEY (patient_id) REFERENCES clinical.patients (patient_id),
    CONSTRAINT payments_card_format CHECK (
        card_last_four IS NULL OR card_last_four ~ '^\d{4}$'
    )
);

-- -----------------------------------------------------------------------------
-- CLAIMS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE financial.claims (
    claim_id BIGINT DEFAULT nextval('financial.claim_seq'),
    patient_id BIGINT NOT NULL,
    insurance_id BIGINT NOT NULL,
    invoice_id BIGINT,
    claim_number TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK (claim_type IN ('professional', 'institutional', 'dental', 'pharmacy')),
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    adjudication_date DATE,
    total_billed NUMERIC(12,2) NOT NULL,
    total_approved NUMERIC(12,2),
    total_denied NUMERIC(12,2) DEFAULT 0,
    patient_responsibility NUMERIC(12,2) DEFAULT 0,
    status financial.claim_status_enum NOT NULL DEFAULT 'submitted',
    denial_reason TEXT,
    appeal_deadline DATE,
    is_appealable BOOLEAN GENERATED ALWAYS AS (
        status = 'denied'
        AND appeal_deadline IS NOT NULL
        AND appeal_deadline >= CURRENT_DATE
    ) VIRTUAL,
    approval_rate NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_billed = 0 THEN NULL
            WHEN total_approved IS NULL THEN NULL
            ELSE ROUND((total_approved / total_billed) * 100, 2)
        END
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT claims_pk PRIMARY KEY (claim_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT claims_number_unique UNIQUE (claim_number),
    CONSTRAINT claims_fk_patient
        FOREIGN KEY (patient_id) REFERENCES clinical.patients (patient_id),
    CONSTRAINT claims_fk_insurance
        FOREIGN KEY (insurance_id) REFERENCES clinical.patient_insurance (insurance_id),
    CONSTRAINT claims_fk_invoice
        FOREIGN KEY (invoice_id) REFERENCES financial.invoices (invoice_id),
    CONSTRAINT claims_billed_positive CHECK (total_billed > 0),
    CONSTRAINT claims_denied_nonneg CHECK (total_denied >= 0),
    CONSTRAINT claims_soft_totals NOT ENFORCED CHECK (
        total_approved + total_denied + patient_responsibility = total_billed
    )
);

-- Partial index for pending claims
CREATE INDEX idx_claims_pending ON financial.claims (patient_id, submission_date)
    WHERE status IN ('submitted', 'under_review');

-- -----------------------------------------------------------------------------
-- CLAIM_ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE financial.claim_items (
    claim_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    invoice_item_id BIGINT,
    line_number INTEGER NOT NULL,
    procedure_code TEXT NOT NULL,
    diagnosis_code TEXT,
    billed_amount NUMERIC(10,2) NOT NULL,
    approved_amount NUMERIC(10,2),
    denied_amount NUMERIC(10,2) DEFAULT 0,
    denial_reason_code TEXT,
    denial_reason_text TEXT,
    modifier TEXT,
    place_of_service TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT claim_items_fk_claim
        FOREIGN KEY (claim_id) REFERENCES financial.claims (claim_id) ON DELETE CASCADE,
    CONSTRAINT claim_items_unique_line UNIQUE (claim_id, line_number),
    CONSTRAINT claim_items_billed_positive CHECK (billed_amount > 0)
);

-- -----------------------------------------------------------------------------
-- PAYMENT_PLANS
-- -----------------------------------------------------------------------------
CREATE TABLE financial.payment_plans (
    plan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    billing_account_id BIGINT NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    monthly_payment NUMERIC(10,2) NOT NULL,
    number_of_payments INTEGER NOT NULL CHECK (number_of_payments BETWEEN 1 AND 60),
    payments_made INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    interest_rate NUMERIC(5,4) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
    remaining_balance NUMERIC(12,2) GENERATED ALWAYS AS (
        total_amount - (monthly_payment * payments_made)
    ) VIRTUAL,
    progress_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND((payments_made::NUMERIC / number_of_payments) * 100, 2)
    ) VIRTUAL,

    CONSTRAINT payment_plans_fk_patient
        FOREIGN KEY (patient_id) REFERENCES clinical.patients (patient_id),
    CONSTRAINT payment_plans_fk_account
        FOREIGN KEY (billing_account_id) REFERENCES financial.billing_accounts (account_id),
    CONSTRAINT payment_plans_dates CHECK (end_date >= start_date),
    CONSTRAINT payment_plans_payment_positive CHECK (monthly_payment > 0)
);

-- -----------------------------------------------------------------------------
-- FEE_SCHEDULES
-- -----------------------------------------------------------------------------
CREATE TABLE financial.fee_schedules (
    fee_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cpt_code TEXT NOT NULL,
    facility_id BIGINT,
    insurance_plan_id BIGINT,
    fee_amount NUMERIC(10,2) NOT NULL CHECK (fee_amount >= 0),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    is_negotiated BOOLEAN DEFAULT FALSE,
    modifier_code TEXT,

    CONSTRAINT fee_schedules_valid_dates CHECK (
        expiration_date IS NULL OR expiration_date >= effective_date
    ),
    CONSTRAINT fee_schedules_unique_fee UNIQUE NULLS NOT DISTINCT (
        cpt_code, facility_id, insurance_plan_id, modifier_code, effective_date
    ),
    CONSTRAINT fee_schedules_fk_facility
        FOREIGN KEY (facility_id) REFERENCES clinical.facilities (facility_id),
    CONSTRAINT fee_schedules_fk_plan
        FOREIGN KEY (insurance_plan_id) REFERENCES clinical.insurance_plans (plan_id)
);

-- =============================================================================
-- SOCIAL SCHEMA TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PATIENT_CONNECTIONS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE social.patient_connections (
    connection_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id_1 BIGINT NOT NULL,
    patient_id_2 BIGINT NOT NULL,
    connection_type social.connection_type_enum NOT NULL,
    strength NUMERIC(3,2) DEFAULT 0.5 CHECK (strength BETWEEN 0 AND 1),
    is_reciprocal BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    metadata JSONB,
    is_active BOOLEAN GENERATED ALWAYS AS (
        disconnected_at IS NULL
    ) VIRTUAL,
    duration_days INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM COALESCE(disconnected_at, NOW()) - connected_at)::INTEGER
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),
    PERIOD FOR connection_period (connected_at, COALESCE(disconnected_at, '9999-12-31 23:59:59.999999+00')),

    CONSTRAINT patient_connections_pk PRIMARY KEY (connection_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT patient_connections_fk_patient1
        FOREIGN KEY (patient_id_1, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT patient_connections_fk_patient2
        FOREIGN KEY (patient_id_2, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT patient_connections_no_self CHECK (patient_id_1 != patient_id_2),
    CONSTRAINT patient_connections_no_dup_overlap EXCLUDE USING gist (
        LEAST(patient_id_1, patient_id_2) WITH =,
        GREATEST(patient_id_1, patient_id_2) WITH =,
        connection_type WITH =,
        tsrange(connected_at, COALESCE(disconnected_at, '9999-12-31 23:59:59.999999+00'), '[)') WITH &&
    )
);

-- -----------------------------------------------------------------------------
-- PROVIDER_NETWORKS
-- -----------------------------------------------------------------------------
CREATE TABLE social.provider_networks (
    network_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doctor_id BIGINT NOT NULL,
    facility_id BIGINT NOT NULL,
    network_role TEXT NOT NULL CHECK (network_role IN ('primary', 'referring', 'consulting', 'covering', 'admitting')),
    is_in_network BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    contract_number TEXT,

    CONSTRAINT provider_networks_fk_doctor
        FOREIGN KEY (doctor_id) REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT provider_networks_fk_facility
        FOREIGN KEY (facility_id) REFERENCES clinical.facilities (facility_id),
    CONSTRAINT provider_networks_dates CHECK (
        termination_date IS NULL OR termination_date >= effective_date
    )
);

-- -----------------------------------------------------------------------------
-- REFERRAL_CHAINS (Temporal — edge table for graph)
-- -----------------------------------------------------------------------------
CREATE TABLE social.referral_chains (
    referral_id BIGINT GENERATED ALWAYS AS IDENTITY,
    from_doctor_id BIGINT NOT NULL,
    to_doctor_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
    referral_reason TEXT,
    urgency TEXT CHECK (urgency IN ('routine', 'urgent', 'emergency')),
    is_accepted BOOLEAN,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    outcome TEXT,
    from_specialty TEXT,
    to_specialty TEXT,
    is_cross_specialty BOOLEAN GENERATED ALWAYS AS (
        from_specialty IS NOT NULL AND to_specialty IS NOT NULL
        AND from_specialty != to_specialty
    ) VIRTUAL,
    response_time_hours NUMERIC(8,2) GENERATED ALWAYS AS (
        CASE
            WHEN accepted_at IS NULL THEN NULL
            ELSE EXTRACT(EPOCH FROM (accepted_at - referral_date)) / 3600
        END
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT referral_chains_pk PRIMARY KEY (referral_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT referral_chains_fk_from_doctor
        FOREIGN KEY (from_doctor_id) REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT referral_chains_fk_to_doctor
        FOREIGN KEY (to_doctor_id) REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT referral_chains_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time),
    CONSTRAINT referral_chains_no_self_referral CHECK (from_doctor_id != to_doctor_id),
    CONSTRAINT referral_chains_accepted_after_referral CHECK (
        accepted_at IS NULL OR accepted_at::DATE >= referral_date
    )
);

-- -----------------------------------------------------------------------------
-- CARE_TEAMS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE social.care_teams (
    team_id BIGINT GENERATED ALWAYS AS IDENTITY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    team_role TEXT NOT NULL CHECK (team_role IN ('primary_care', 'specialist', 'surgeon', 'anesthesiologist', 'consultant', 'coordinator')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    is_lead BOOLEAN DEFAULT FALSE,
    notes TEXT,
    is_active_member BOOLEAN GENERATED ALWAYS AS (
        removed_at IS NULL
    ) VIRTUAL,
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT care_teams_pk PRIMARY KEY (team_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT care_teams_fk_patient
        FOREIGN KEY (patient_id, PERIOD system_time)
        REFERENCES clinical.patients (patient_id, PERIOD system_time)
        ON DELETE CASCADE,
    CONSTRAINT care_teams_fk_doctor
        FOREIGN KEY (doctor_id) REFERENCES clinical.doctors (doctor_id),
    CONSTRAINT care_teams_one_lead NOT ENFORCED EXCLUDE USING gist (
        patient_id WITH =,
        (CASE WHEN is_lead THEN 1 ELSE 0 END) WITH =,
        tsrange(assigned_at, COALESCE(removed_at, '9999-12-31 23:59:59.999999+00'), '[)') WITH &&
    ) WHERE (is_lead = TRUE AND removed_at IS NULL)
);

-- -----------------------------------------------------------------------------
-- MESSAGES
-- -----------------------------------------------------------------------------
CREATE TABLE social.messages (
    message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    recipient_id BIGINT NOT NULL,
    message_type social.message_type_enum NOT NULL DEFAULT 'text',
    subject TEXT,
    body TEXT NOT NULL,
    attachments JSONB,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_system_message BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    word_count INTEGER GENERATED ALWAYS AS (
        array_length(regexp_split_to_array(body, '\s+'), 1)
    ) VIRTUAL,

    CONSTRAINT messages_fk_thread
        FOREIGN KEY (thread_id) REFERENCES social.message_threads (thread_id) ON DELETE CASCADE
);

-- GIN index for full-text search
CREATE INDEX idx_messages_body_fts ON social.messages
    USING gin (to_tsvector('english', body));

-- Expression index
CREATE INDEX idx_messages_unread ON social.messages (recipient_id, created_at DESC)
    WHERE is_read = FALSE AND is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- MESSAGE_THREADS
-- -----------------------------------------------------------------------------
CREATE TABLE social.message_threads (
    thread_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thread_type TEXT NOT NULL CHECK (thread_type IN ('direct', 'group', 'system', 'care_team', 'patient_doctor')),
    title TEXT,
    created_by BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMPTZ,
    participant_count INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SYSTEM SCHEMA TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- USERS
-- -----------------------------------------------------------------------------
CREATE TABLE system.users (
    user_id BIGINT DEFAULT nextval('system.user_seq') PRIMARY KEY,
    username TEXT NOT NULL CONSTRAINT users_username_notnull NOT INHERIT UNIQUE,
    email system.email_domain NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT GENERATED ALWAYS AS (
        COALESCE(NULLIF(first_name, ''), username)
    ) VIRTUAL,
    role system.user_role_enum NOT NULL DEFAULT 'staff',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    is_locked BOOLEAN GENERATED ALWAYS AS (
        locked_until IS NOT NULL AND locked_until > NOW()
    ) VIRTUAL,
    must_change_password BOOLEAN DEFAULT FALSE,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en_US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_password_strength NOT ENFORCED CHECK (
        LENGTH(password_hash) >= 60
    ),
    CONSTRAINT users_email_format CHECK (
        email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- -----------------------------------------------------------------------------
-- ROLES
-- -----------------------------------------------------------------------------
CREATE TABLE system.roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    max_sessions INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- PERMISSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE system.permissions (
    permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id BIGINT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('table', 'view', 'function', 'schema', 'sequence')),
    resource_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('select', 'insert', 'update', 'delete', 'execute', 'usage', 'create')),
    scope TEXT DEFAULT 'own' CHECK (scope IN ('own', 'department', 'facility', 'all')),
    is_grantable BOOLEAN DEFAULT FALSE,
    constraint_expr TEXT,

    CONSTRAINT permissions_fk_role
        FOREIGN KEY (role_id) REFERENCES system.roles (role_id) ON DELETE CASCADE,
    CONSTRAINT permissions_unique UNIQUE (role_id, resource_type, resource_name, action, scope)
);

-- -----------------------------------------------------------------------------
-- USER_ROLES (junction)
-- -----------------------------------------------------------------------------
CREATE TABLE system.user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by BIGINT,
    expires_at TIMESTAMPTZ,

    CONSTRAINT user_roles_pk PRIMARY KEY (user_id, role_id),
    CONSTRAINT user_roles_fk_user
        FOREIGN KEY (user_id) REFERENCES system.users (user_id) ON DELETE CASCADE,
    CONSTRAINT user_roles_fk_role
        FOREIGN KEY (role_id) REFERENCES system.roles (role_id) ON DELETE CASCADE,
    CONSTRAINT user_roles_fk_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES system.users (user_id)
);

-- -----------------------------------------------------------------------------
-- SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE system.sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status system.session_status_enum NOT NULL DEFAULT 'active',
    ip_address INET NOT NULL,
    user_agent TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    terminated_at TIMESTAMPTZ,
    is_expired BOOLEAN GENERATED ALWAYS AS (
        expires_at < NOW()
    ) VIRTUAL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM COALESCE(terminated_at, NOW()) - started_at) / 60
    ) VIRTUAL,

    CONSTRAINT sessions_fk_user
        FOREIGN KEY (user_id) REFERENCES system.users (user_id) ON DELETE CASCADE,
    CONSTRAINT sessions_terminated_after_start CHECK (
        terminated_at IS NULL OR terminated_at >= started_at
    )
);

CREATE INDEX idx_sessions_user_active ON system.sessions (user_id, started_at DESC)
    WHERE status = 'active';

-- -----------------------------------------------------------------------------
-- API_KEYS
-- -----------------------------------------------------------------------------
CREATE TABLE system.api_keys (
    key_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    key_value system.api_key_domain NOT NULL UNIQUE,
    key_name TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT ARRAY['read'],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    usage_count BIGINT DEFAULT 0,
    rate_limit INTEGER DEFAULT 1000,
    is_expired BOOLEAN GENERATED ALWAYS AS (
        expires_at IS NOT NULL AND expires_at < NOW()
    ) VIRTUAL,

    CONSTRAINT api_keys_fk_user
        FOREIGN KEY (user_id) REFERENCES system.users (user_id) ON DELETE CASCADE,
    CONSTRAINT api_keys_expiry CHECK (
        expires_at IS NULL OR expires_at > created_at
    )
);

-- -----------------------------------------------------------------------------
-- AUDIT_LOGS (Temporal)
-- -----------------------------------------------------------------------------
CREATE TABLE system.audit_logs (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT,
    action system.audit_action_enum NOT NULL,
    table_name TEXT NOT NULL,
    record_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip INET,
    session_id UUID,
    transaction_id XID,
    request_id UUID,
    details TEXT,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    sys_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sys_end TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59.999999+00',

    PERIOD FOR system_time (sys_start, sys_end),

    CONSTRAINT audit_logs_pk PRIMARY KEY (log_id, system_time WITHOUT OVERLAPS),
    CONSTRAINT audit_logs_fk_user
        FOREIGN KEY (user_id) REFERENCES system.users (user_id)
) PARTITION BY RANGE (performed_at);

CREATE TABLE system.audit_logs_2025_h1 PARTITION OF system.audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-07-01');

CREATE TABLE system.audit_logs_2025_h2 PARTITION OF system.audit_logs
    FOR VALUES FROM ('2025-07-01') TO ('2026-01-01');

CREATE TABLE system.audit_logs_default PARTITION OF system.audit_logs
    DEFAULT;

-- BRIN index for time-range queries
CREATE INDEX idx_audit_logs_time_brin ON system.audit_logs
    USING brin (performed_at) WITH (pages_per_range = 64);

-- GIN index for JSONB queries
CREATE INDEX idx_audit_logs_old_values ON system.audit_logs
    USING gin (old_values);

CREATE INDEX idx_audit_logs_new_values ON system.audit_logs
    USING gin (new_values jsonb_path_ops);

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE system.notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    notification_type system.notification_type_enum NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    reference_type TEXT,
    reference_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    CONSTRAINT notifications_fk_user
        FOREIGN KEY (user_id) REFERENCES system.users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_unread ON system.notifications (user_id, created_at DESC)
    WHERE is_read = FALSE;

-- -----------------------------------------------------------------------------
-- SYSTEM_CONFIGS
-- -----------------------------------------------------------------------------
CREATE TABLE system.system_configs (
    config_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    value_type TEXT NOT NULL DEFAULT 'string' CHECK (value_type IN ('string', 'integer', 'boolean', 'float', 'json', 'array')),
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    is_editable BOOLEAN DEFAULT TRUE,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT system_configs_fk_updated_by
        FOREIGN KEY (updated_by) REFERENCES system.users (user_id)
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
CREATE TRIGGER trg_appointment_completion
    AFTER UPDATE ON clinical.appointments
    FOR EACH ROW
    EXECUTE FUNCTION clinical.process_appointment_completion();

CREATE TRIGGER trg_enforce_no_overlapping_insurance
    BEFORE INSERT OR UPDATE ON clinical.patient_insurance
    FOR EACH ROW
    EXECUTE FUNCTION clinical.enforce_no_overlapping_insurance();

CREATE TRIGGER trg_audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON clinical.patients
    FOR EACH ROW
    EXECUTE FUNCTION system.audit_trigger_func();

CREATE TRIGGER trg_audit_medical_records
    AFTER INSERT OR UPDATE OR DELETE ON clinical.medical_records
    FOR EACH ROW
    EXECUTE FUNCTION system.audit_trigger_func();

CREATE TRIGGER trg_vitals_audit
    AFTER INSERT OR UPDATE OR DELETE ON clinical.vitals
    REFERENCING NEW TABLE AS new_vitals OLD TABLE AS old_vitals
    FOR EACH STATEMENT
    EXECUTE FUNCTION clinical.vitals_audit_trigger();

CREATE TRIGGER trg_patient_risk_update
    AFTER INSERT OR UPDATE ON clinical.diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION clinical.update_patient_risk_score();

CREATE TRIGGER trg_invoice_status_change
    AFTER UPDATE OF status ON financial.invoices
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION financial.invoice_status_notification();

CREATE TRIGGER trg_message_read
    AFTER UPDATE OF is_read ON social.messages
    FOR EACH ROW
    WHEN (OLD.is_read = FALSE AND NEW.is_read = TRUE)
    EXECUTE FUNCTION social.message_read_notification();

CREATE TRIGGER trg_update_timestamp_patients
    BEFORE UPDATE ON clinical.patients
    FOR EACH ROW
    EXECUTE FUNCTION system.update_timestamp();

CREATE TRIGGER trg_update_timestamp_billing
    BEFORE UPDATE ON financial.billing_accounts
    FOR EACH ROW
    EXECUTE FUNCTION system.update_timestamp();

-- =============================================================================
-- HELPER FUNCTIONS FOR TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION system.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
$$
DECLARE
    v_action TEXT;
    v_old JSONB;
    v_new JSONB;
BEGIN
    CASE TG_OP
        WHEN 'INSERT' THEN
            v_action := 'create';
            v_new := to_jsonb(NEW);
        WHEN 'UPDATE' THEN
            v_action := 'update';
            v_old := to_jsonb(OLD);
            v_new := to_jsonb(NEW);
        WHEN 'DELETE' THEN
            v_action := 'delete';
            v_old := to_jsonb(OLD);
    END CASE;

    INSERT INTO clinical.audit_trail (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.patient_id, OLD.patient_id, 0),
        v_action,
        v_old,
        v_new,
        current_user_id()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION clinical.vitals_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
$$
BEGIN
    INSERT INTO clinical.vital_signs_history (vital_id, patient_id, change_type, old_values, new_values, changed_by)
    SELECT vital_id, patient_id,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'insert'
            WHEN TG_OP = 'UPDATE' THEN 'update'
            WHEN TG_OP = 'DELETE' THEN 'delete'
        END,
        to_jsonb(o),
        to_jsonb(n),
        current_user_id()
    FROM old_vitals o
    FULL JOIN new_vitals n ON o.vital_id = n.vital_id;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION clinical.update_patient_risk_score()
RETURNS TRIGGER
LANGUAGE plpgsql
$$
BEGIN
    UPDATE clinical.patients
    SET risk_score = clinical.compute_risk_score(
        clinical.calculate_age(date_of_birth),
        (SELECT COUNT(*) FROM clinical.diagnoses WHERE patient_id = NEW.patient_id AND is_chronic),
        (SELECT MAX(severity) FROM clinical.diagnoses WHERE patient_id = NEW.patient_id),
        (SELECT COUNT(*) FROM clinical.vitals WHERE patient_id = NEW.patient_id AND is_hypertensive)
    ),
    updated_at = NOW()
    WHERE patient_id = NEW.patient_id;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION system.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS BIGINT
LANGUAGE sql STABLE
$$
    SELECT COALESCE(
        current_setting('app.current_user_id', TRUE)::BIGINT,
        0
    );
$$;

-- =============================================================================
-- VIEWS
-- =============================================================================
CREATE VIEW clinical.active_patients AS
SELECT
    patient_id, mrn, full_name, date_of_birth, gender,
    age, is_pediatric, is_geriatric, risk_score, email
FROM clinical.patients
WHERE status = 'active'
    AND sys_end = '9999-12-31 23:59:59.999999+00';

CREATE VIEW clinical.patient_summary AS
SELECT
    p.patient_id,
    p.full_name,
    p.age,
    p.gender,
    p.risk_score,
    (SELECT COUNT(*) FROM clinical.diagnoses d WHERE d.patient_id = p.patient_id AND d.is_chronic) AS chronic_conditions,
    (SELECT COUNT(*) FROM clinical.prescriptions pr WHERE pr.patient_id = p.patient_id AND pr.is_active) AS active_prescriptions,
    (SELECT COUNT(*) FROM clinical.allergies a WHERE a.patient_id = p.patient_id) AS allergy_count,
    (SELECT MAX(visited) FROM (
        SELECT MAX(visit_date) AS visited FROM clinical.medical_records WHERE patient_id = p.patient_id
        UNION ALL
        SELECT NULL
    ) sub) AS last_visit_date,
    (SELECT STRING_AGG(icd10_code, ', ') FROM clinical.diagnoses WHERE patient_id = p.patient_id AND is_primary) AS primary_diagnoses
FROM clinical.patients p
WHERE p.status = 'active';

CREATE VIEW financial.revenue_summary AS
SELECT
    DATE_TRUNC('month', i.invoice_date) AS month,
    COUNT(DISTINCT i.invoice_id) AS invoice_count,
    SUM(i.total_amount) AS total_billed,
    SUM(i.amount_paid) AS total_collected,
    SUM(i.net_amount - i.amount_paid) AS outstanding,
    AVG(i.net_amount) AS average_invoice,
    COUNT(*) FILTER (WHERE i.status = 'overdue') AS overdue_count
FROM financial.invoices i
WHERE i.invoice_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', i.invoice_date);

CREATE VIEW social.patient_network_stats AS
SELECT
    p.patient_id,
    p.full_name,
    COUNT(DISTINCT pc.connection_id) AS connection_count,
    AVG(pc.strength) AS avg_connection_strength,
    COUNT(DISTINCT ct.team_id) AS care_team_size,
    COUNT(DISTINCT rc.referral_id) AS referral_count
FROM clinical.patients p
LEFT JOIN social.patient_connections pc ON (p.patient_id IN (pc.patient_id_1, pc.patient_id_2) AND pc.is_active)
LEFT JOIN social.care_teams ct ON (p.patient_id = ct.patient_id AND ct.is_active_member)
LEFT JOIN social.referral_chains rc ON (p.patient_id = rc.patient_id)
WHERE p.status = 'active'
GROUP BY p.patient_id, p.full_name;

-- =============================================================================
-- MATERIALIZED VIEWS
-- =============================================================================
CREATE MATERIALIZED VIEW analytics.daily_census AS
SELECT
    CURRENT_DATE AS census_date,
    f.facility_id,
    f.facility_name,
    COUNT(DISTINCT b.current_patient_id) AS occupied_beds,
    COUNT(DISTINCT b.bed_id) AS total_beds,
    ROUND(COUNT(DISTINCT b.current_patient_id)::NUMERIC / NULLIF(COUNT(DISTINCT b.bed_id), 0) * 100, 1) AS occupancy_pct
FROM clinical.facilities f
LEFT JOIN clinical.rooms r ON r.facility_id = f.facility_id
LEFT JOIN clinical.beds b ON b.room_id = r.room_id
GROUP BY f.facility_id, f.facility_name
WITH DATA;

CREATE UNIQUE INDEX idx_daily_census ON analytics.daily_census (census_date, facility_id);

CREATE MATERIALIZED VIEW analytics.provider_performance AS
SELECT
    d.doctor_id,
    d.full_name,
    d.years_of_experience,
    COUNT(DISTINCT a.appointment_id) AS total_appointments,
    COUNT(*) FILTER (WHERE a.status = 'completed') AS completed_appointments,
    COUNT(*) FILTER (WHERE a.status = 'cancelled') AS cancelled_appointments,
    COUNT(*) FILTER (WHERE a.status = 'no_show') AS no_show_count,
    ROUND(COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS completion_rate,
    AVG(EXTRACT(EPOCH FROM (a.actual_end - a.actual_start)) / 60) AS avg_visit_minutes,
    COUNT(DISTINCT rc.referral_id) AS referrals_made
FROM clinical.doctors d
LEFT JOIN clinical.appointments a ON a.doctor_id = d.doctor_id
LEFT JOIN social.referral_chains rc ON rc.from_doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.full_name, d.years_of_experience
WITH DATA;

CREATE UNIQUE INDEX idx_provider_perf ON analytics.provider_performance (doctor_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE clinical.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE social.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.api_keys ENABLE ROW LEVEL SECURITY;

-- Permissive policies
CREATE POLICY patients_own_data ON clinical.patients
    AS PERMISSIVE
    FOR SELECT
    TO patient_role
    USING (patient_id = current_setting('app.patient_id', TRUE)::BIGINT);

CREATE POLICY patients_clinical_access ON clinical.patients
    AS PERMISSIVE
    FOR SELECT
    TO doctor_role, nurse_role
    USING (
        EXISTS (
            SELECT 1 FROM social.care_teams ct
            WHERE ct.doctor_id = current_setting('app.user_id', TRUE)::BIGINT
            AND ct.patient_id = patients.patient_id
            AND ct.is_active_member
        )
    );

CREATE POLICY patients_admin_access ON clinical.patients
    AS PERMISSIVE
    FOR ALL
    TO admin_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- Restrictive policies
CREATE POLICY patients_restricted_phi ON clinical.patients
    AS RESTRICTIVE
    FOR SELECT
    USING (
        current_setting('app.phi_access', TRUE) IN ('full', 'limited')
    );

CREATE POLICY medical_records_own ON clinical.medical_records
    AS PERMISSIVE
    FOR SELECT
    USING (
        patient_id = current_setting('app.patient_id', TRUE)::BIGINT
        OR EXISTS (
            SELECT 1 FROM social.care_teams ct
            WHERE ct.doctor_id = current_setting('app.user_id', TRUE)::BIGINT
            AND ct.patient_id = medical_records.patient_id
        )
    );

CREATE POLICY messages_own ON social.messages
    AS PERMISSIVE
    FOR ALL
    USING (
        sender_id = current_setting('app.user_id', TRUE)::BIGINT
        OR recipient_id = current_setting('app.user_id', TRUE)::BIGINT
    );

-- =============================================================================
-- RULES
-- =============================================================================
CREATE RULE protect_patient_deletion AS
    ON DELETE TO clinical.patients
    DO INSTEAD
        UPDATE clinical.patients SET status = 'deleted', updated_at = NOW()
        WHERE patient_id = OLD.patient_id;

CREATE RULE audit_sensitive_update AS
    ON UPDATE TO clinical.patient_insurance
    DO ALSO
        INSERT INTO clinical.audit_trail (table_name, record_id, action, old_data, new_data, performed_by)
        VALUES (
            'patient_insurance',
            OLD.insurance_id,
            'update',
            to_jsonb(OLD),
            to_jsonb(NEW),
            current_user_id()
        );

CREATE RULE log_unauthorized_access AS
    ON SELECT TO system.api_keys
    WHERE current_user NOT IN ('admin', 'system')
    DO ALSO
        INSERT INTO system.audit_logs (action, table_name, details, performed_by)
        VALUES ('read', 'api_keys', 'API key access attempt', current_user_id());

-- =============================================================================
-- PG18: ALTER CONSTRAINT ... ENFORCED / NOT ENFORCED
-- =============================================================================
ALTER TABLE clinical.patients
    ALTER CONSTRAINT patients_email_format_soft NOT ENFORCED;

ALTER TABLE clinical.patient_insurance
    ALTER CONSTRAINT patient_insurance_one_primary_per_period NOT ENFORCED;

ALTER TABLE financial.invoices
    ALTER CONSTRAINT invoices_net_valid NOT ENFORCED;

ALTER TABLE financial.claims
    ALTER CONSTRAINT claims_soft_totals NOT ENFORCED;

ALTER TABLE clinical.medications
    ALTER CONSTRAINT medications_generic_required NOT ENFORCED;

ALTER TABLE clinical.diagnoses
    ALTER CONSTRAINT diagnoses_one_primary_per_record NOT ENFORCED;

-- PG18: ALTER CONSTRAINT ... ENFORCED (making a constraint enforced again)
ALTER TABLE clinical.allergies
    ALTER CONSTRAINT allergies_no_duplicate ENFORCED;

-- =============================================================================
-- PG18: ALTER CONSTRAINT ... INHERIT / NO INHERIT
-- =============================================================================
ALTER TABLE clinical.patients
    ALTER CONSTRAINT patients_mrn_notnull NO INHERIT;

ALTER TABLE clinical.patients
    ALTER CONSTRAINT patients_fname_notnull NO INHERIT;

ALTER TABLE clinical.patients
    ALTER CONSTRAINT patients_lname_notnull NO INHERIT;

ALTER TABLE clinical.departments
    ALTER CONSTRAINT departments_name_notnull NO INHERIT;

ALTER TABLE clinical.doctors
    ALTER CONSTRAINT doctors_fname_notnull NO INHERIT;

ALTER TABLE clinical.doctors
    ALTER CONSTRAINT doctors_lname_notnull NO INHERIT;

ALTER TABLE system.users
    ALTER CONSTRAINT users_username_notnull NO INHERIT;

-- =============================================================================
-- PG18: NOT VALID for NOT NULL constraints
-- =============================================================================
ALTER TABLE clinical.patient_addresses
    ALTER COLUMN address_type SET NOT NULL NOT VALID;

ALTER TABLE clinical.patient_contacts
    ALTER COLUMN contact_type SET NOT NULL NOT VALID;

-- =============================================================================
-- PG19: ALTER TABLE ALTER CONSTRAINT NOT ENFORCED for CHECK
-- =============================================================================
ALTER TABLE clinical.procedures
    ALTER CONSTRAINT procedures_cost_positive NOT ENFORCED;

ALTER TABLE clinical.coverage_periods
    ADD CONSTRAINT coverage_periods_soft_limit NOT ENFORCED CHECK (
        benefit_used <= max_benefit * 1.1  -- allow 10% overage
    );

-- =============================================================================
-- PG19: ALTER TABLE MERGE PARTITIONS / SPLIT PARTITION
-- =============================================================================
-- Merge older partitions
ALTER TABLE clinical.patients
    MERGE PARTITIONS clinical.patients_born_before_1950, clinical.patients_born_1950s
    INTO clinical.patients_born_before_1960;

-- Split a partition
ALTER TABLE clinical.patients
    SPLIT PARTITION clinical.patients_born_2020s
    INTO (
        PARTITION clinical.patients_born_2020_2024 FOR VALUES FROM ('2020-01-01') TO ('2025-01-01'),
        PARTITION clinical.patients_born_2025_plus FOR VALUES FROM ('2025-01-01') TO ('2030-01-01')
    );

-- =============================================================================
-- PG19: TEMPORAL DML — UPDATE/DELETE FOR PORTION OF
-- =============================================================================
-- Update patient insurance for a portion of the coverage period
-- (Demonstrates PG19 temporal DML syntax — commented as it requires data)
/*
UPDATE clinical.patient_insurance
FOR PORTION OF coverage_period_t FROM DATE '2024-07-01' TO DATE '2024-12-31'
SET copay_amount = 35.00
WHERE insurance_id = 12345;

DELETE FROM clinical.patient_insurance
FOR PORTION OF coverage_period_t FROM DATE '2024-01-01' TO DATE '2024-06-30'
WHERE insurance_id = 12345;
*/

-- =============================================================================
-- PG19: CREATE PROPERTY GRAPH — SQL/PGQ
-- =============================================================================

-- HEALTHCARE NETWORK GRAPH
CREATE PROPERTY GRAPH graph.healthcare_network
    VERTEX TABLES (
        clinical.patients
            KEY (patient_id)
            PROPERTIES (patient_id, first_name, last_name, date_of_birth, gender, risk_score, full_name, age),
        clinical.doctors
            KEY (doctor_id)
            PROPERTIES (doctor_id, npi, first_name, last_name, full_name, is_active, years_of_experience),
        clinical.facilities
            KEY (facility_id)
            PROPERTIES (facility_id, facility_name, facility_type, is_active)
    )
    EDGE TABLES (
        social.referral_chains
            SOURCE KEY (from_doctor_id) REFERENCES clinical.doctors (doctor_id)
            DESTINATION KEY (to_doctor_id) REFERENCES clinical.doctors (doctor_id)
            PROPERTIES (referral_id, referral_date, urgency, is_accepted, is_cross_specialty),
        social.care_teams
            SOURCE KEY (doctor_id) REFERENCES clinical.doctors (doctor_id)
            DESTINATION KEY (patient_id) REFERENCES clinical.patients (patient_id)
            PROPERTIES (team_id, team_role, is_lead, is_active_member),
        clinical.appointments
            SOURCE KEY (patient_id) REFERENCES clinical.patients (patient_id)
            DESTINATION KEY (doctor_id) REFERENCES clinical.doctors (doctor_id)
            PROPERTIES (appointment_id, scheduled_start, status, reason, is_telehealth)
    );

-- SOCIAL GRAPH
CREATE PROPERTY GRAPH graph.social_graph
    VERTEX TABLES (
        clinical.patients
            KEY (patient_id)
            PROPERTIES (patient_id, full_name, age, gender, risk_score)
    )
    EDGE TABLES (
        social.patient_connections
            SOURCE KEY (patient_id_1) REFERENCES clinical.patients (patient_id)
            DESTINATION KEY (patient_id_2) REFERENCES clinical.patients (patient_id)
            PROPERTIES (connection_id, connection_type, strength, is_active)
    );

-- INSURANCE NETWORK GRAPH
CREATE PROPERTY GRAPH graph.insurance_network
    VERTEX TABLES (
        clinical.patients
            KEY (patient_id)
            PROPERTIES (patient_id, full_name, age, is_pediatric, is_geriatric),
        clinical.insurance_plans
            KEY (plan_id)
            PROPERTIES (plan_id, plan_name, plan_type, is_active_plan, coinsurance_pct),
        clinical.facilities
            KEY (facility_id)
            PROPERTIES (facility_id, facility_name, facility_type)
    )
    EDGE TABLES (
        clinical.patient_insurance
            SOURCE KEY (patient_id) REFERENCES clinical.patients (patient_id)
            DESTINATION KEY (insurance_plan_id) REFERENCES clinical.insurance_plans (plan_id)
            PROPERTIES (insurance_id, is_primary, is_active_coverage, copay_amount, coverage_remaining_pct),
        social.provider_networks
            SOURCE KEY (facility_id) REFERENCES clinical.facilities (facility_id)
            DESTINATION KEY (doctor_id) REFERENCES clinical.doctors (doctor_id)
            PROPERTIES (network_id, network_role, is_in_network),
        financial.claims
            SOURCE KEY (patient_id) REFERENCES clinical.patients (patient_id)
            DESTINATION KEY (insurance_id) REFERENCES clinical.patient_insurance (insurance_id)
            PROPERTIES (claim_id, total_billed, total_approved, status, approval_rate)
    );

-- =============================================================================
-- PG19: ALTER PROPERTY GRAPH
-- =============================================================================
ALTER PROPERTY GRAPH graph.healthcare_network
    ADD VERTEX TABLE clinical.nurses
        KEY (nurse_id)
        PROPERTIES (nurse_id, first_name, last_name, license_type);

ALTER PROPERTY GRAPH graph.healthcare_network
    ADD EDGE TABLE social.care_teams AS nurse_care
        SOURCE KEY (doctor_id) REFERENCES clinical.doctors (doctor_id)
        DESTINATION KEY (patient_id) REFERENCES clinical.patients (patient_id)
        PROPERTIES (team_id, team_role, is_lead);

-- =============================================================================
-- PG19: DROP PROPERTY GRAPH (example, commented out)
-- =============================================================================
-- DROP PROPERTY GRAPH IF EXISTS graph.temp_network;

-- =============================================================================
-- PG19: CREATE PUBLICATION ... ALL SEQUENCES
-- =============================================================================
CREATE PUBLICATION replication.clinical_pub
    FOR TABLE clinical.patients, clinical.medical_records, clinical.diagnoses,
            clinical.prescriptions, clinical.lab_results, clinical.vitals,
            clinical.appointments, clinical.allergies
    ALL SEQUENCES;

CREATE PUBLICATION replication.financial_pub
    FOR TABLE financial.invoices, financial.invoice_items, financial.payments,
            financial.claims, financial.claim_items, financial.billing_accounts
    ALL SEQUENCES;

-- =============================================================================
-- PG19: CREATE/ALTER PUBLICATION ... EXCEPT
-- =============================================================================
CREATE PUBLICATION replication.social_pub
    FOR ALL TABLES IN SCHEMA social
    EXCEPT TABLE social.message_threads;

ALTER PUBLICATION replication.clinical_pub
    ADD TABLE clinical.procedures, clinical.medication_schedules
    EXCEPT TABLE clinical.audit_trail;

-- =============================================================================
-- PG18/19: CREATE SUBSCRIPTION ... SERVER
-- =============================================================================
CREATE SUBSCRIPTION replication.dr_sub
    CONNECTION 'host=replica-db.internal port=5432 dbname=clinical_prod sslmode=require'
    SERVER remote_clinical_db
    PUBLICATION replication.clinical_pub
    WITH (
        copy_data = true,
        create_slot = true,
        streaming = 'parallel',
        synchronous_commit = off,
        run_as_root = false
    );

CREATE SUBSCRIPTION replication.analytics_sub
    CONNECTION 'host=analytics-db.internal port=5432 dbname=analytics_replica sslmode=require'
    SERVER remote_analytics_db
    PUBLICATION replication.financial_pub, replication.social_pub
    WITH (
        copy_data = false,
        create_slot = false,
        streaming = 'on',
        synchronous_commit = off
    );

-- =============================================================================
-- PG19: REPACK TABLE/INDEX
-- =============================================================================
-- (Demonstrates PG19 REPACK command — typically run as maintenance)
-- REPACK TABLE clinical.patients;
-- REPACK INDEX clinical.patients_pkey;
-- REPACK TABLE financial.invoices;
-- REPACK INDEX financial.invoices_invoice_number_key;

-- =============================================================================
-- PG19: ALTER DOMAIN VALIDATE CONSTRAINT with reduced lock
-- =============================================================================
ALTER DOMAIN clinical.ssn_domain VALIDATE CONSTRAINT ssn_check;
ALTER DOMAIN clinical.mrn_domain VALIDATE CONSTRAINT mrn_check;
ALTER DOMAIN clinical.npi_domain VALIDATE CONSTRAINT npi_check;

-- =============================================================================
-- PG19: GRANT/REVOKE GRANTED BY
-- =============================================================================
GRANT SELECT, INSERT, UPDATE ON clinical.patients TO doctor_role
    GRANTED BY admin_role;

GRANT SELECT ON clinical.medical_records TO nurse_role
    GRANTED BY admin_role;

GRANT SELECT, INSERT ON clinical.appointments TO staff_role
    GRANTED BY admin_role;

GRANT SELECT ON financial.invoices TO patient_role
    GRANTED BY admin_role;

GRANT ALL ON social.messages TO doctor_role, nurse_role
    GRANTED BY admin_role;

REVOKE DELETE ON clinical.patients FROM staff_role
    GRANTED BY admin_role;

REVOKE UPDATE ON system.audit_logs FROM staff_role
    GRANTED BY admin_role;

-- =============================================================================
-- EVENT TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION system.log_ddl_event()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
$$
DECLARE
    obj RECORD;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        INSERT INTO system.audit_logs (action, table_name, details, performed_by)
        VALUES (
            'create',
            obj.object_type,
            format('DDL: %s on %s by %s', obj.command_tag, obj.object_identity, current_user),
            0
        );
    END LOOP;
END;
$$;

CREATE EVENT TRIGGER trg_ddl_log
    ON DDL_COMMAND_END
    EXECUTE FUNCTION system.log_ddl_event();

CREATE OR REPLACE FUNCTION system.prevent_dangerous_ddl()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
$$
DECLARE
    obj RECORD;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
    LOOP
        IF obj.object_type = 'table' AND obj.schema_name IN ('clinical', 'financial', 'system') THEN
            RAISE EXCEPTION 'Dropping tables in protected schemas is not allowed: %.%',
                obj.schema_name, obj.object_name;
        END IF;
    END LOOP;
END;
$$;

CREATE EVENT TRIGGER trg_prevent_dangerous_drop
    ON SQL_DROP
    EXECUTE FUNCTION system.prevent_dangerous_ddl();

-- =============================================================================
-- ADDITIONAL INDEXES (all types)
-- =============================================================================

-- Btree (default)
CREATE INDEX idx_patients_name ON clinical.patients (last_name, first_name);
CREATE INDEX idx_patients_dob ON clinical.patients (date_of_birth);

-- Hash
CREATE INDEX idx_patients_mrn_hash ON clinical.patients USING hash (mrn);

-- GiST
CREATE INDEX idx_patient_addresses_gist ON clinical.patient_addresses
    USING gist (address);

-- GIN
CREATE INDEX idx_patients_emergency_gin ON clinical.patients
    USING gin (emergency_contact);

CREATE INDEX idx_diagnoses_notes_gin ON clinical.diagnoses
    USING gin (to_tsvector('english', COALESCE(notes, '')));

-- SP-GiST
CREATE INDEX idx_facilities_code_spgist ON clinical.facilities
    USING spgist (facility_code);

-- BRIN
CREATE INDEX idx_prescriptions_start_brin ON clinical.prescriptions
    USING brin (start_date) WITH (pages_per_range = 32);

CREATE INDEX idx_payments_date_brin ON financial.payments
    USING brin (payment_date) WITH (pages_per_range = 64);

-- Covering indexes
CREATE INDEX idx_doctors_active_covering ON clinical.doctors
    USING btree (doctor_id, is_active)
    INCLUDE (npi, full_name, years_of_experience);

-- Expression indexes
CREATE INDEX idx_patients_lower_email ON clinical.patients (LOWER(email));
CREATE INDEX idx_patients_lower_name ON clinical.patients (LOWER(last_name), LOWER(first_name));
CREATE INDEX idx_invoices_total_desc ON financial.invoices (total_amount DESC NULLS LAST);

-- Partial indexes
CREATE INDEX idx_patients_active ON clinical.patients (patient_id, last_name, first_name)
    WHERE status = 'active';

CREATE INDEX idx_prescriptions_active ON clinical.prescriptions (patient_id, medication_id, start_date)
    WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- Concurrent index build (cannot run in transaction)
-- CREATE INDEX CONCURRENTLY idx_lab_results_collected ON clinical.lab_results (collected_at DESC);

-- Unique indexes
CREATE UNIQUE INDEX idx_unique_active_primary_insurance ON clinical.patient_insurance (patient_id)
    WHERE is_primary = TRUE AND (coverage_end IS NULL OR coverage_end >= CURRENT_DATE);

-- =============================================================================
-- ADDITIONAL ALTER TABLE COMMANDS (comprehensive coverage)
-- =============================================================================
ALTER TABLE clinical.patients
    SET (fillfactor = 90, autovacuum_vacuum_scale_factor = 0.1);

ALTER TABLE clinical.patients
    RESET (autovacuum_analyze_scale_factor);

ALTER TABLE clinical.medical_records
    SET (parallel_workers = 4);

ALTER TABLE clinical.vitals
    SET (fillfactor = 85);

ALTER TABLE financial.invoices
    SET (autovacuum_vacuum_cost_delay = 10);

ALTER TABLE clinical.patients
    ADD COLUMN IF NOT EXISTS middle_initial CHAR(1);

ALTER TABLE clinical.patients
    ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
        CONSTRAINT patients_language_check CHECK (preferred_language IN ('en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar'));

ALTER TABLE clinical.patients
    DROP COLUMN IF EXISTS middle_initial;

ALTER TABLE clinical.patients
    ALTER COLUMN risk_score SET DEFAULT 0;

ALTER TABLE clinical.patients
    ALTER COLUMN blood_type SET DEFAULT 'unknown';

ALTER TABLE clinical.doctors
    ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE clinical.doctors
    ALTER COLUMN npi SET NOT NULL;

ALTER TABLE clinical.appointments
    CLUSTER ON idx_appointments_doctor_schedule;

ALTER TABLE clinical.lab_results
    SET WITHOUT CLUSTER;

ALTER TABLE clinical.patients
    SET LOGGED;

ALTER TABLE clinical.patients
    ENABLE TRIGGER trg_audit_patients;

ALTER TABLE clinical.patients
    DISABLE TRIGGER trg_update_timestamp_patients;

ALTER TABLE clinical.patients
    ENABLE TRIGGER ALL;

-- =============================================================================
-- ALTER FOR OTHER OBJECTS
-- =============================================================================
ALTER SEQUENCE clinical.patient_seq RESTART WITH 200000;
ALTER SEQUENCE clinical.patient_seq SET SCHEMA clinical;

ALTER INDEX idx_patients_name SET (fillfactor = 95);
ALTER INDEX idx_patients_dob RESET (fillfactor);

ALTER VIEW clinical.active_patients SET (security_barrier = true);
ALTER VIEW clinical.patient_summary SET (security_barrier = true, check_option = local);

ALTER MATERIALIZED VIEW analytics.daily_census SET (fillfactor = 90);
ALTER MATERIALIZED VIEW analytics.provider_performance SET (autovacuum_enabled = true);

ALTER DOMAIN clinical.percentage
    ADD CONSTRAINT percentage_range CHECK (VALUE BETWEEN 0.00 AND 100.00);

ALTER DOMAIN clinical.positive_decimal
    ADD CONSTRAINT positive_decimal_check CHECK (VALUE > 0);

ALTER TEXT SEARCH CONFIGURATION system.clinical_ts
    ALTER MAPPING FOR asciiword REPLACE WITH system.medical_stem;

-- =============================================================================
-- PG18: CREATE FOREIGN TABLE ... LIKE (already shown above, adding one more)
-- =============================================================================
CREATE FOREIGN TABLE fdw_schema.remote_vitals (
    LIKE clinical.vitals
)
SERVER remote_clinical_db
OPTIONS (schema_name 'clinical', table_name 'vitals');

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE clinical.patients IS 'Core temporal patient table with system-versioned period and VIRTUAL generated columns';
COMMENT ON COLUMN clinical.patients.full_name IS 'PG18 VIRTUAL generated column: concatenated first and last name';
COMMENT ON COLUMN clinical.patients.age IS 'PG18 VIRTUAL generated column: calculated from date_of_birth';
COMMENT ON COLUMN clinical.patients.is_pediatric IS 'PG18 VIRTUAL generated column: true if age < 18';
COMMENT ON COLUMN clinical.patients.sys_start IS 'Temporal system-time period start column';
COMMENT ON COLUMN clinical.patients.sys_end IS 'Temporal system-time period end column';
COMMENT ON TABLE clinical.patient_insurance IS 'Temporal insurance table with WITHOUT OVERLAPS PK and exclusion constraint for no overlapping primary coverage';
COMMENT ON CONSTRAINT patient_insurance_no_overlapping_primary ON clinical.patient_insurance IS 'GiST exclusion: prevents overlapping coverage periods for primary insurance';
COMMENT ON CONSTRAINT patient_insurance_one_primary_per_period ON clinical.patient_insurance IS 'PG18 NOT ENFORCED soft constraint: only one primary insurance per period';
COMMENT ON TABLE clinical.medical_records IS 'Temporal partitioned medical records table with cross-period FK references';
COMMENT ON TABLE clinical.vitals IS 'Hash-partitioned temporal vitals table with multiple VIRTUAL generated columns for abnormality flags';
COMMENT ON TABLE financial.invoices IS 'Temporal invoices with NOT ENFORCED constraint for net_amount validation';
COMMENT ON TABLE financial.claims IS 'Temporal claims with NOT ENFORCED soft constraint for total reconciliation';
COMMENT ON TABLE social.patient_connections IS 'Temporal social connections with multi-period definitions and exclusion for no duplicates';
COMMENT ON PROPERTY GRAPH graph.healthcare_network IS 'PG19 SQL/PGQ property graph: vertices=patients,doctors,facilities; edges=referrals,care_teams,appointments';
COMMENT ON PROPERTY GRAPH graph.social_graph IS 'PG19 SQL/PGQ property graph: vertices=patients; edges=connections';
COMMENT ON PROPERTY GRAPH graph.insurance_network IS 'PG19 SQL/PGQ property graph: vertices=patients,plans,facilities; edges=coverages,networks,claims';
COMMENT ON SEQUENCE clinical.patient_seq IS 'Sequence for patient_id identity column';
COMMENT ON FUNCTION clinical.calculate_bmi IS 'BMI calculation from weight (kg) and height (cm)';
COMMENT ON FUNCTION clinical.compute_risk_score IS 'Composite risk scoring based on age, comorbidities, severity, and vitals';
COMMENT ON FUNCTION clinical.merge_patient_records IS 'Procedure to merge duplicate patient records with conflict detection';
COMMENT ON INDEX idx_diagnoses_description_fts IS 'GIN full-text search index on diagnosis descriptions';
COMMENT ON INDEX idx_prescriptions_active IS 'Partial index for active prescriptions only';
COMMENT ON POLICY patients_own_data ON clinical.patients IS 'RLS policy: patients can see only their own data';
COMMENT ON POLICY patients_clinical_access ON clinical.patients IS 'RLS policy: doctors/nurses see patients in their care team';
COMMENT ON POLICY patients_restricted_phi ON clinical.patients IS 'Restrictive RLS policy: requires PHI access setting';
COMMENT ON TRIGGER trg_appointment_completion ON clinical.appointments IS 'Trigger: auto-create billing on appointment completion';
COMMENT ON TRIGGER trg_vitals_audit ON clinical.vitals IS 'Trigger with transition tables: audit all vital sign changes';
COMMENT ON DOMAIN clinical.ssn_domain IS 'Domain for SSN with format validation';
COMMENT ON DOMAIN clinical.npi_domain IS 'Domain for NPI numbers with range validation';
COMMENT ON STATISTICS clinical.patient_demographics_stats IS 'Extended statistics for patient demographic correlations';

-- =============================================================================
-- PG18: Named NOT NULL constraints with NO INHERIT (already defined inline above)
-- Additional examples:
-- =============================================================================
ALTER TABLE clinical.patient_addresses
    ALTER COLUMN patient_id SET NOT NULL CONSTRAINT patient_addresses_patientid_notnull NO INHERIT;

ALTER TABLE clinical.prescriptions
    ALTER COLUMN dosage SET NOT NULL CONSTRAINT prescriptions_dosage_notnull NO INHERIT;

ALTER TABLE clinical.prescriptions
    ALTER COLUMN frequency SET NOT NULL CONSTRAINT prescriptions_freq_notnull NO INHERIT;

-- =============================================================================
-- PG18: VIRTUAL generated columns (already shown inline, adding more)
-- =============================================================================
ALTER TABLE financial.billing_accounts
    ADD COLUMN delinquency_category TEXT GENERATED ALWAYS AS (
        CASE
            WHEN balance <= 0 THEN 'current'
            WHEN days_since_last_payment IS NULL OR days_since_last_payment <= 30 THEN '30_days'
            WHEN days_since_last_payment <= 60 THEN '60_days'
            WHEN days_since_last_payment <= 90 THEN '90_days'
            ELSE 'over_90_days'
        END
    ) VIRTUAL;

ALTER TABLE social.referral_chains
    ADD COLUMN referral_urgency_display TEXT GENERATED ALWAYS AS (
        CASE urgency
            WHEN 'routine' THEN '📋 Routine'
            WHEN 'urgent' THEN '⚡ Urgent'
            WHEN 'emergency' THEN '🚨 Emergency'
            ELSE 'Unknown'
        END
    ) VIRTUAL;

ALTER TABLE financial.claims
    ADD COLUMN claim_health NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_billed = 0 THEN NULL
            WHEN status = 'denied' THEN 0
            WHEN status = 'paid' THEN 100
            WHEN total_approved IS NOT NULL THEN ROUND((total_approved / total_billed) * 100, 2)
            ELSE NULL
        END
    ) VIRTUAL;

-- =============================================================================
-- COMPLEX STORED GENERATED COLUMNS
-- =============================================================================
ALTER TABLE clinical.procedures
    ADD COLUMN procedure_display TEXT GENERATED ALWAYS AS (
        cpt_code || ' - ' || description || ' (' || category || ')'
    ) STORED;

ALTER TABLE financial.invoice_items
    ADD COLUMN line_display TEXT GENERATED ALWAYS AS (
        line_number || '. ' || description || ' x' || quantity || ' @ $' || unit_price
    ) STORED;

-- =============================================================================
-- DEFERRABLE / INITIALLY DEFERRED / NOT ENFORCED constraints
-- =============================================================================
ALTER TABLE clinical.medical_records
    ADD CONSTRAINT medical_records_self_referential
        FOREIGN KEY (record_id) REFERENCES clinical.medical_records (record_id)
        DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE social.care_teams
    ADD CONSTRAINT care_teams_unique_active_role
        UNIQUE (patient_id, team_role) DEFERRABLE INITIALLY DEFERRED
        WHERE removed_at IS NULL;

ALTER TABLE financial.claim_items
    ADD CONSTRAINT claim_items_soft_total NOT ENFORCED CHECK (
        approved_amount + denied_amount <= billed_amount
    );

-- =============================================================================
-- ADDITIONAL EXCLUSION CONSTRAINTS
-- =============================================================================
ALTER TABLE clinical.appointment_slots
    ADD CONSTRAINT appointment_slots_no_double_book
        EXCLUDE USING gist (
            doctor_id WITH =,
            tsrange(start_time, end_time, '[)') WITH &&
        ) WHERE (is_available = TRUE);

ALTER TABLE clinical.medication_schedules
    ADD CONSTRAINT medication_schedules_no_conflict
        EXCLUDE USING gist (
            patient_id WITH =,
            schedule_time WITH =,
            daterange(start_date, COALESCE(end_date, '9999-12-31'), '[)') WITH &&
        );

-- =============================================================================
-- FK MATCH TYPES AND REFERENTIAL ACTIONS
-- =============================================================================
ALTER TABLE clinical.diagnoses
    ADD CONSTRAINT diagnoses_fk_patient_strict
        FOREIGN KEY (patient_id) REFERENCES clinical.patients (patient_id)
        MATCH FULL ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE clinical.prescriptions
    ADD CONSTRAINT prescriptions_fk_patient_match
        FOREIGN KEY (patient_id) REFERENCES clinical.patients (patient_id)
        MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE financial.payments
    ADD CONSTRAINT payments_fk_invoice_setnull
        FOREIGN KEY (invoice_id) REFERENCES financial.invoices (invoice_id)
        ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE financial.invoice_items
    ADD CONSTRAINT invoice_items_fk_invoice_cascade
        FOREIGN KEY (invoice_id) REFERENCES financial.invoices (invoice_id)
        ON UPDATE CASCADE ON DELETE CASCADE;

-- =============================================================================
-- UNIQUE with NULLS NOT DISTINCT
-- =============================================================================
ALTER TABLE clinical.patient_contacts
    ADD CONSTRAINT patient_contacts_unique_preferred
        UNIQUE NULLS NOT DISTINCT (patient_id, contact_type, is_preferred);

ALTER TABLE financial.fee_schedules
    ADD CONSTRAINT fee_schedules_unique_rate
        UNIQUE NULLS NOT DISTINCT (cpt_code, facility_id, modifier_code, effective_date);

-- =============================================================================
-- ADDITIONAL IDENTITY COLUMNS
-- =============================================================================
ALTER TABLE clinical.coverage_periods
    ALTER COLUMN coverage_id ADD GENERATED ALWAYS AS IDENTITY;

ALTER TABLE clinical.treatment_plans
    ALTER COLUMN plan_id ADD GENERATED ALWAYS AS IDENTITY (START WITH 1000 INCREMENT BY 5);

-- =============================================================================
-- DROP STATEMENTS (examples, commented)
-- =============================================================================
-- DROP POLICY IF EXISTS patients_own_data ON clinical.patients;
-- DROP TRIGGER IF EXISTS trg_audit_patients ON clinical.patients;
-- DROP RULE IF EXISTS protect_patient_deletion ON clinical.patients;
-- DROP VIEW IF EXISTS clinical.active_patients;
-- DROP MATERIALIZED VIEW IF EXISTS analytics.daily_census;
-- DROP FUNCTION IF EXISTS clinical.calculate_bmi(NUMERIC, NUMERIC);
-- DROP SEQUENCE IF EXISTS analytics.report_seq;
-- DROP INDEX IF EXISTS idx_patients_name;
-- DROP DOMAIN IF EXISTS clinical.ssn_domain;
-- DROP TYPE IF EXISTS clinical.vital_reading;
-- DROP SERVER IF EXISTS remote_analytics_db;
-- DROP PUBLICATION IF EXISTS replication.social_pub;
-- DROP SUBSCRIPTION IF EXISTS replication.dr_sub;
-- DROP EVENT TRIGGER IF EXISTS trg_ddl_log;
-- DROP EXTENSION IF EXISTS fuzzystrmatch;
-- DROP CONVERSION IF EXISTS system.latin1_to_utf8;
-- DROP CAST IF EXISTS (clinical.address_type AS TEXT);
-- DROP OPERATOR IF EXISTS clinical.~<>~ (clinical.vital_reading, clinical.vital_reading);
-- DROP OPERATOR CLASS IF EXISTS clinical.vital_reading_ops USING btree;
-- DROP OPERATOR FAMILY IF EXISTS clinical.vital_reading_family USING btree;
-- DROP AGGREGATE IF EXISTS clinical.array_concat_agg(ANYARRAY);
-- DROP TEXT SEARCH CONFIGURATION IF EXISTS system.clinical_ts;
-- DROP TEXT SEARCH DICTIONARY IF EXISTS system.medical_dictionary;
-- DROP TEXT SEARCH PARSER IF EXISTS system.medical_parser;
-- DROP TEXT SEARCH TEMPLATE IF EXISTS system.medical_template;
-- DROP STATISTICS IF EXISTS clinical.patient_demographics_stats;
-- DROP COLLATION IF EXISTS system.case_insensitive;
-- DROP FOREIGN TABLE IF EXISTS fdw_schema.remote_patients;
-- DROP PROPERTY GRAPH IF EXISTS graph.healthcare_network;

-- =============================================================================
-- GRANTS (comprehensive)
-- =============================================================================
GRANT USAGE ON SCHEMA clinical TO doctor_role, nurse_role, staff_role, patient_role;
GRANT USAGE ON SCHEMA financial TO doctor_role, staff_role, admin_role;
GRANT USAGE ON SCHEMA social TO doctor_role, nurse_role, patient_role;
GRANT USAGE ON SCHEMA system TO admin_role, system;
GRANT USAGE ON SCHEMA analytics TO admin_role, auditor_role;
GRANT USAGE ON SCHEMA graph TO admin_role, doctor_role;

GRANT SELECT, INSERT, UPDATE ON clinical.patients TO doctor_role;
GRANT SELECT ON clinical.patients TO nurse_role, auditor_role;
GRANT SELECT, UPDATE ON clinical.patients TO patient_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON clinical.medical_records TO doctor_role;
GRANT SELECT ON clinical.medical_records TO nurse_role;

GRANT SELECT, INSERT ON clinical.appointments TO doctor_role, staff_role;
GRANT SELECT ON clinical.appointments TO patient_role;

GRANT SELECT, INSERT, UPDATE ON clinical.prescriptions TO doctor_role;
GRANT SELECT ON clinical.prescriptions TO nurse_role, pharmacist_role;

GRANT SELECT, INSERT ON clinical.lab_results TO doctor_role;
GRANT SELECT ON clinical.lab_results TO nurse_role;

GRANT ALL ON ALL TABLES IN SCHEMA system TO admin_role;
GRANT SELECT ON ALL TABLES IN SCHEMA system TO auditor_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA clinical TO doctor_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA financial TO staff_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA clinical TO doctor_role, nurse_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA financial TO staff_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA system TO admin_role;

GRANT ALL ON clinical.patient_seq TO admin_role;
GRANT USAGE ON clinical.patient_seq TO doctor_role;

-- =============================================================================
-- REFRESH MATERIALIZED VIEWS
-- =============================================================================
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.daily_census;
REFRESH MATERIALIZED VIEW analytics.provider_performance;

-- =============================================================================
-- ANALYZE (for statistics)
-- =============================================================================
ANALYZE clinical.patients;
ANALYZE clinical.medical_records;
ANALYZE clinical.diagnoses;
ANALYZE clinical.prescriptions;
ANALYZE clinical.lab_results;
ANALYZE financial.invoices;
ANALYZE financial.claims;
ANALYZE social.patient_connections;

-- =============================================================================
-- VACUUM (maintenance examples, commented)
-- =============================================================================
-- VACUUM (FULL, ANALYZE, VERBOSE) clinical.patients;
-- VACUUM (ANALYZE) financial.invoices;
-- VACUUM FREEZE clinical.audit_trail;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
