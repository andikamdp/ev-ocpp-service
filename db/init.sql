CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Charge point & configuration tables
CREATE TABLE charge_points (
                               id TEXT PRIMARY KEY,                 -- Charge Point ID
                               ocpp_version TEXT NOT NULL,
                               model TEXT,
                               vendor TEXT,
                               created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                               last_boot TIMESTAMPTZ
);

CREATE TABLE ocpp_configuration (
                                    id BIGSERIAL PRIMARY KEY,
                                    charge_point_id TEXT NOT NULL REFERENCES charge_points(id) ON DELETE CASCADE,
                                    key TEXT NOT NULL,
                                    value TEXT NOT NULL,
                                    read_only BOOLEAN NOT NULL DEFAULT FALSE,
                                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                    UNIQUE (charge_point_id, key)
);

-- Authorized RFID tags
CREATE TABLE rfid_tags (
                           id_tag TEXT PRIMARY KEY,
                           description TEXT,
                           is_authorized BOOLEAN NOT NULL DEFAULT TRUE,
                           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
                              id BIGSERIAL PRIMARY KEY,
                              charge_point_id TEXT NOT NULL REFERENCES charge_points(id) ON DELETE CASCADE,
                              connector_id INT NOT NULL,
                              id_tag TEXT NOT NULL REFERENCES rfid_tags(id_tag),
                              meter_start NUMERIC,
                              meter_stop NUMERIC,
                              start_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
                              stop_ts TIMESTAMPTZ,
                              status TEXT
);

-- Status of connectors
CREATE TABLE connector_status (
                                  id BIGSERIAL PRIMARY KEY,
                                  charge_point_id TEXT NOT NULL REFERENCES charge_points(id) ON DELETE CASCADE,
                                  connector_id INT NOT NULL,
                                  status TEXT NOT NULL,
                                  error_code TEXT,
                                  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time-series: Meter values
CREATE TABLE meter_values (
                              id BIGSERIAL PRIMARY KEY,
                              charge_point_id TEXT NOT NULL REFERENCES charge_points(id) ON DELETE CASCADE,
                              connector_id INT NOT NULL,
                              transaction_id BIGINT REFERENCES transactions(id),
                              ts TIMESTAMPTZ NOT NULL,
                              measurand TEXT NOT NULL,
                              value NUMERIC NOT NULL,
                              unit TEXT,
                              context TEXT
);

-- Make meter_values a hypertable
SELECT create_hypertable('meter_values', 'ts', if_not_exists => TRUE);

-- Enable compression on meter_values
ALTER TABLE meter_values
    SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'charge_point_id'
        );

-- Compress chunks older than 7 days
SELECT add_compression_policy('meter_values', INTERVAL '7 days');

-- Continuous aggregate for 15-minute energy consumption
CREATE MATERIALIZED VIEW mv_energy_15m
            WITH (timescaledb.continuous) AS
SELECT
    charge_point_id,
    connector_id,
    time_bucket(INTERVAL '15 minutes', ts) AS bucket,
    max(value) - min(value) AS energy_wh
FROM meter_values
GROUP BY charge_point_id, connector_id, bucket;

SELECT add_continuous_aggregate_policy(
               'mv_energy_15m',
               start_offset => INTERVAL '30 days',
               end_offset => INTERVAL '1 hour',
               schedule_interval => INTERVAL '15 minutes'
       );
