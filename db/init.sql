CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Charge point & configuration tables
CREATE TABLE tbl_charge_points_tm (
                               id TEXT PRIMARY KEY,                 -- Charge Point ID
                               ocpp_version TEXT NOT NULL,
                               model TEXT,
                               vendor TEXT,
                               created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                               last_boot TIMESTAMPTZ
);

CREATE TABLE ocpp_configuration (
                                    id BIGSERIAL PRIMARY KEY,
                                    charge_point_id TEXT NOT NULL REFERENCES tbl_charge_points_tm(id) ON DELETE CASCADE,
                                    key TEXT NOT NULL,
                                    value TEXT NOT NULL,
                                    read_only BOOLEAN NOT NULL DEFAULT FALSE,
                                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                    UNIQUE (charge_point_id, key)
);

-- Authorized RFID tags
CREATE TABLE tbl_rfid_tags_tm (
                           id_tag TEXT PRIMARY KEY,
                           description TEXT,
                           is_authorized BOOLEAN NOT NULL DEFAULT TRUE,
                           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tbl_transactions_tr
CREATE TABLE tbl_transactions_tr (
                              id BIGSERIAL PRIMARY KEY,
                              charge_point_id TEXT NOT NULL REFERENCES tbl_charge_points_tm(id) ON DELETE CASCADE,
                              connector_id INT NOT NULL,
                              id_tag TEXT NOT NULL REFERENCES tbl_rfid_tags_tm(id_tag),
                              meter_start NUMERIC,
                              meter_stop NUMERIC,
                              start_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
                              stop_ts TIMESTAMPTZ,
                              status TEXT
);

-- Status of connectors
CREATE TABLE tbl_connector_status_th (
                                  id BIGSERIAL PRIMARY KEY,
                                  charge_point_id TEXT NOT NULL REFERENCES tbl_charge_points_tm(id) ON DELETE CASCADE,
                                  connector_id INT NOT NULL,
                                  status TEXT NOT NULL,
                                  error_code TEXT,
                                  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time-series: Meter values
CREATE TABLE tbl_meter_values_th (
                              id BIGSERIAL,
                              charge_point_id TEXT NOT NULL REFERENCES tbl_charge_points_tm(id) ON DELETE CASCADE,
                              connector_id INT NOT NULL,
                              transaction_id BIGINT REFERENCES tbl_transactions_tr(id),
                              ts TIMESTAMPTZ NOT NULL,
                              measurand TEXT NOT NULL,
                              value NUMERIC NOT NULL,
                              unit TEXT,
                              context TEXT,
                                PRIMARY KEY (ts, id)
);

-- Make tbl_meter_values_th a hypertable
SELECT create_hypertable('tbl_meter_values_th', 'ts', if_not_exists => TRUE);

-- Enable compression on tbl_meter_values_th
ALTER TABLE tbl_meter_values_th
    SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'charge_point_id'
        );

-- Compress chunks older than 7 days
SELECT add_compression_policy('tbl_meter_values_th', INTERVAL '7 days');

-- Continuous aggregate for 15-minute energy consumption
CREATE MATERIALIZED VIEW mv_energy_15m
            WITH (timescaledb.continuous) AS
SELECT
    charge_point_id,
    connector_id,
    time_bucket(INTERVAL '15 minutes', ts) AS bucket,
    max(value) - min(value) AS energy_wh
FROM tbl_meter_values_th
GROUP BY charge_point_id, connector_id, bucket;

SELECT add_continuous_aggregate_policy(
               'mv_energy_15m',
               start_offset => INTERVAL '30 days',
               end_offset => INTERVAL '1 hour',
               schedule_interval => INTERVAL '15 minutes'
       );

INSERT INTO public.tbl_charge_points_tm (id, ocpp_version, model, vendor, created_at, last_boot) VALUES ('G1M8tVMvRwHePFtW0AT', '1.6', 'Elmo-Virtual1', 'Elmo', '2025-12-02 10:20:25.152321 +00:00', '2025-12-03 04:35:15.262234 +00:00');
INSERT INTO public.tbl_rfid_tags_tm (id_tag, description, is_authorized, created_at) VALUES ('zR9d6pBVii2Hv7lnexyK', 'Demo card', true, '2025-12-03 04:33:27.286387 +00:00');
INSERT INTO public.tbl_rfid_tags_tm (id_tag, description, is_authorized, created_at) VALUES ('233A98A7', 'CONNECTOR - 1', true, '2025-12-03 04:50:56.707177 +00:00');
INSERT INTO public.tbl_rfid_tags_tm (id_tag, description, is_authorized, created_at) VALUES ('TBS2206000589', 'CONNECTOR - 2', true, '2025-12-03 04:50:56.707177 +00:00');
