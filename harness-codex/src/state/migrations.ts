export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        workspace TEXT NOT NULL,
        profile TEXT NOT NULL,
        timezone TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        state TEXT NOT NULL,
        config_path TEXT NOT NULL,
        config_hash TEXT NOT NULL,
        revision TEXT,
        lease_owner TEXT,
        lease_expires_at TEXT,
        heartbeat_at TEXT,
        pid INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      ) STRICT;

      CREATE TABLE input_versions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        kind TEXT NOT NULL,
        path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        captured_at TEXT NOT NULL,
        UNIQUE(run_id, path, sha256)
      ) STRICT;

      CREATE TABLE requirements (
        id TEXT NOT NULL,
        run_id TEXT NOT NULL REFERENCES runs(id),
        source_path TEXT NOT NULL,
        source_section TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL,
        acceptance_json TEXT NOT NULL,
        risks_json TEXT NOT NULL,
        dependencies_json TEXT NOT NULL,
        verification_method TEXT NOT NULL,
        PRIMARY KEY (run_id, id)
      ) STRICT;

      CREATE TABLE milestones (
        id TEXT NOT NULL,
        run_id TEXT NOT NULL REFERENCES runs(id),
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        state TEXT NOT NULL,
        position INTEGER NOT NULL,
        revision TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (run_id, id)
      ) STRICT;

      CREATE TABLE tasks (
        id TEXT NOT NULL,
        run_id TEXT NOT NULL REFERENCES runs(id),
        milestone_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        state TEXT NOT NULL,
        role TEXT NOT NULL,
        requirement_ids_json TEXT NOT NULL,
        dependencies_json TEXT NOT NULL,
        acceptance_json TEXT NOT NULL,
        planned_files_json TEXT NOT NULL,
        max_attempts INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (run_id, id),
        FOREIGN KEY (run_id, milestone_id) REFERENCES milestones(run_id, id)
      ) STRICT;

      CREATE TABLE dependencies (
        run_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        depends_on_task_id TEXT NOT NULL,
        PRIMARY KEY (run_id, task_id, depends_on_task_id)
      ) STRICT;

      CREATE TABLE attempts (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        task_id TEXT NOT NULL,
        number INTEGER NOT NULL,
        executor TEXT NOT NULL,
        candidate_key TEXT NOT NULL,
        status TEXT NOT NULL,
        failure_signature TEXT,
        result_json TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      ) STRICT;

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL REFERENCES attempts(id),
        role TEXT NOT NULL,
        model_key TEXT NOT NULL,
        independent INTEGER NOT NULL,
        context_manifest_path TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      ) STRICT;

      CREATE TABLE provider_calls (
        id TEXT PRIMARY KEY,
        attempt_id TEXT,
        provider TEXT NOT NULL,
        model_id TEXT NOT NULL,
        modality TEXT NOT NULL,
        provider_request_id TEXT,
        state TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cached_tokens INTEGER,
        reasoning_tokens INTEGER,
        estimated_micros INTEGER,
        reported_micros INTEGER,
        uncertain_micros INTEGER,
        started_at TEXT NOT NULL,
        finished_at TEXT
      ) STRICT;

      CREATE TABLE cost_reservations (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        task_id TEXT,
        provider_call_id TEXT,
        amount_micros INTEGER NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        released_at TEXT
      ) STRICT;

      CREATE TABLE ledger_entries (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        task_id TEXT,
        provider_call_id TEXT,
        kind TEXT NOT NULL,
        amount_micros INTEGER NOT NULL,
        currency TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE verifier_runs (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        task_id TEXT,
        revision TEXT NOT NULL,
        verifier_id TEXT NOT NULL,
        verifier_version TEXT NOT NULL,
        status TEXT NOT NULL,
        command_json TEXT,
        exit_code INTEGER,
        output_path TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE findings (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        verifier_run_id TEXT,
        severity TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence_path TEXT,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE approvals (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        milestone_id TEXT NOT NULL,
        revision TEXT NOT NULL,
        decision TEXT NOT NULL,
        actor TEXT NOT NULL,
        scope TEXT NOT NULL,
        feedback_path TEXT,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE decisions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        scope TEXT NOT NULL,
        title TEXT NOT NULL,
        decision TEXT NOT NULL,
        rationale TEXT NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE lessons (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        scope TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        observation TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        evidence_ids_json TEXT NOT NULL,
        status TEXT NOT NULL,
        confidence TEXT NOT NULL,
        applicability_json TEXT NOT NULL,
        supersedes_json TEXT NOT NULL,
        review_after_runs INTEGER,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE routing_observations (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        attempt_id TEXT NOT NULL,
        candidate_key TEXT NOT NULL,
        role TEXT NOT NULL,
        task_category TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        cost_micros INTEGER,
        outcome TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE control_commands (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        command TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        handled_at TEXT
      ) STRICT;

      CREATE TABLE events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        run_id TEXT,
        type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX idx_events_run_sequence ON events(run_id, sequence);
      CREATE INDEX idx_tasks_run_state ON tasks(run_id, state);
      CREATE INDEX idx_reservations_run_state ON cost_reservations(run_id, state);
      CREATE INDEX idx_commands_run_state ON control_commands(run_id, state);
    `,
  },
  {
    version: 2,
    name: "pin_branch_per_milestone",
    sql: "ALTER TABLE milestones ADD COLUMN branch TEXT;",
  },
];
