CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ===============================
-- Charge point & configuration tables
-- ===============================
CREATE TABLE tbl_charge_points_tm
(
    id           TEXT PRIMARY KEY, -- Charge Point ID
    ocpp_version TEXT        NOT NULL,
    model        TEXT,
    vendor       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_boot    TIMESTAMPTZ
);

-- ===============================
-- Authorized RFID tags (master)
-- ===============================
CREATE TABLE tbl_rfid_tags_tm
(
    id_tag        TEXT PRIMARY KEY,
    description   TEXT,
    is_authorized BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================
-- Transactions (one row per session)
-- ===============================
CREATE TABLE tbl_transactions_tr
(
    id              BIGSERIAL PRIMARY KEY,
    charge_point_id TEXT        NOT NULL REFERENCES tbl_charge_points_tm (id) ON DELETE CASCADE,
    connector_id    INT         NOT NULL,
    id_tag          TEXT        NOT NULL REFERENCES tbl_rfid_tags_tm (id_tag),
    meter_start     NUMERIC,
    meter_stop      NUMERIC,
    start_ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
    stop_ts         TIMESTAMPTZ,
    status          TEXT
);
CREATE INDEX idx_transactions_cp_ts
    ON tbl_transactions_tr (charge_point_id, start_ts DESC);

-- ===============================
-- Connector status timeline (hypertable)
-- ===============================
CREATE TABLE tbl_connector_status_th
(
    id              BIGSERIAL,
    charge_point_id TEXT        NOT NULL REFERENCES tbl_charge_points_tm (id) ON DELETE CASCADE,
    connector_id    INT         NOT NULL,
    status          TEXT        NOT NULL,
    error_code      TEXT,
    ts              TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (ts, id) -- include ts for Timescale
);

-- ===============================
-- Time-series: Meter values (hypertable)
-- ===============================
CREATE TABLE tbl_meter_values_th
(
    id              BIGSERIAL,
    charge_point_id TEXT        NOT NULL REFERENCES tbl_charge_points_tm (id) ON DELETE CASCADE,
    connector_id    INT         NOT NULL,
    transaction_id  BIGINT,
    ts              TIMESTAMPTZ NOT NULL,
    measurand       TEXT        NOT NULL,
    value           NUMERIC     NOT NULL,
    unit            TEXT,
    context         TEXT,
    PRIMARY KEY (ts, id)
);

SELECT create_hypertable('tbl_meter_values_th', 'ts', if_not_exists => TRUE);

CREATE INDEX idx_meter_values_cp_tx_ts
    ON tbl_meter_values_th (charge_point_id, transaction_id, ts DESC);

-- Enable compression on tbl_meter_values_th
ALTER TABLE tbl_meter_values_th
    SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'charge_point_id',
        timescaledb.compress_orderby = 'ts DESC'
        );

-- Compress chunks older than 7 days
SELECT add_compression_policy('tbl_meter_values_th', INTERVAL '7 days');

-- ===============================
-- Continuous aggregate for 15-minute energy consumption
-- (only for cumulative energy measurand)
-- ===============================
CREATE MATERIALIZED VIEW mv_energy_15m
    WITH (timescaledb.continuous) AS
SELECT charge_point_id,
       connector_id,
       time_bucket(INTERVAL '15 minutes', ts) AS bucket,
       max(value) - min(value)                AS energy_wh
FROM tbl_meter_values_th
WHERE measurand = 'Energy.Active.Import.Register'
GROUP BY charge_point_id, connector_id, bucket;

SELECT add_continuous_aggregate_policy(
               'mv_energy_15m',
               start_offset => INTERVAL '30 days',
               end_offset => INTERVAL '1 hour',
               schedule_interval => INTERVAL '15 minutes'
       );

-- ===============================
-- Seed data (demo)
-- ===============================
INSERT INTO public.tbl_charge_points_tm (id, ocpp_version, model, vendor, created_at, last_boot)
VALUES ('G1M8tVMvRwHePFtW0AT', '1.6', 'Elmo-Virtual1', 'Elmo', '2025-12-02 10:20:25.152321 +00:00',
        '2025-12-03 04:35:15.262234 +00:00');
INSERT INTO public.tbl_rfid_tags_tm (id_tag, description, is_authorized, created_at)
VALUES ('zR9d6pBVii2Hv7lnexyK', 'Demo card', true, '2025-12-03 04:33:27.286387 +00:00'),
       ('233A98A7', 'CONNECTOR - 1', true, '2025-12-03 04:50:56.707177 +00:00'),
       ('TBS2206000589', 'CONNECTOR - 2', true, '2025-12-03 04:50:56.707177 +00:00');
