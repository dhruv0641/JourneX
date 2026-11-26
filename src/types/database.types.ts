
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_logs": {
                  Row: {
                    "category": string,"created_at": string,"details": NonNullable<Json>,"duration_minutes": number | null,"id": string,"module_id": string | null,"occurred_at": string,"source": string,"title": string,"topic_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"duration_minutes"?: number | null,"id"?: string,"module_id"?: string | null,"occurred_at"?: string,"source"?: string,"title": string,"topic_id": string,"user_id": string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"duration_minutes"?: number | null,"id"?: string,"module_id"?: string | null,"occurred_at"?: string,"source"?: string,"title"?: string,"topic_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_logs_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    },{
      foreignKeyName: "activity_logs_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"attachments": {
                  Row: {
                    "bucket_id": string,"created_at": string,"entity_id": string,"entity_type": string,"file_name": string,"id": string,"mime_type": string,"size_bytes": number,"storage_path": string,"topic_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id"?: string,"created_at"?: string,"entity_id": string,"entity_type": string,"file_name": string,"id"?: string,"mime_type": string,"size_bytes": number,"storage_path": string,"topic_id": string,"user_id": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string,"size_bytes"?: number,"storage_path"?: string,"topic_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"audit_events": {
                  Row: {
                    "created_at": string,"entity_id": string | null,"entity_type": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entity_id"?: string | null,"entity_type": string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"calculation_history": {
                  Row: {
                    "calculated_at": string,"calculator_id": string,"calculator_version_id": string,"created_at": string,"id": string,"inputs": NonNullable<Json>,"label": string,"outputs": NonNullable<Json>,"topic_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calculated_at"?: string,"calculator_id": string,"calculator_version_id": string,"created_at"?: string,"id"?: string,"inputs": NonNullable<Json>,"label"?: string,"outputs": NonNullable<Json>,"topic_id": string,"user_id": string
                  }
                  Update: {
                    "calculated_at"?: string,"calculator_id"?: string,"calculator_version_id"?: string,"created_at"?: string,"id"?: string,"inputs"?: NonNullable<Json>,"label"?: string,"outputs"?: NonNullable<Json>,"topic_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calc_history_ver_fk"
      columns: ["calculator_version_id","calculator_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "calculator_versions"
      referencedColumns: ["id","calculator_id","topic_id","user_id"]
    }
                  ]
                },"calculator_definitions": {
                  Row: {
                    "created_at": string,"current_version": number,"description": string,"id": string,"is_archived": boolean,"module_id": string,"name": string,"topic_id": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_version"?: number,"description"?: string,"id"?: string,"is_archived"?: boolean,"module_id": string,"name": string,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"current_version"?: number,"description"?: string,"id"?: string,"is_archived"?: boolean,"module_id"?: string,"name"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "calc_def_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"calculator_versions": {
                  Row: {
                    "calculator_id": string,"change_note": string,"chart_config": NonNullable<Json>,"created_at": string,"formulas": NonNullable<Json>,"id": string,"inputs_schema": NonNullable<Json>,"outputs_schema": NonNullable<Json>,"topic_id": string,"user_id": string,"version_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "calculator_id": string,"change_note"?: string,"chart_config"?: NonNullable<Json>,"created_at"?: string,"formulas": NonNullable<Json>,"id"?: string,"inputs_schema": NonNullable<Json>,"outputs_schema": NonNullable<Json>,"topic_id": string,"user_id": string,"version_number": number
                  }
                  Update: {
                    "calculator_id"?: string,"change_note"?: string,"chart_config"?: NonNullable<Json>,"created_at"?: string,"formulas"?: NonNullable<Json>,"id"?: string,"inputs_schema"?: NonNullable<Json>,"outputs_schema"?: NonNullable<Json>,"topic_id"?: string,"user_id"?: string,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "calc_versions_def_fk"
      columns: ["calculator_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "calculator_definitions"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"calendar_events": {
                  Row: {
                    "all_day": boolean,"created_at": string,"description": string,"ends_at": string,"id": string,"module_id": string | null,"recurrence_rule": Json | null,"reminder_minutes": number | null,"starts_at": string,"task_id": string | null,"title": string,"topic_id": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"created_at"?: string,"description"?: string,"ends_at": string,"id"?: string,"module_id"?: string | null,"recurrence_rule"?: Json | null,"reminder_minutes"?: number | null,"starts_at": string,"task_id"?: string | null,"title": string,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "all_day"?: boolean,"created_at"?: string,"description"?: string,"ends_at"?: string,"id"?: string,"module_id"?: string | null,"recurrence_rule"?: Json | null,"reminder_minutes"?: number | null,"starts_at"?: string,"task_id"?: string | null,"title"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    },{
      foreignKeyName: "calendar_events_task_fk"
      columns: ["task_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","topic_id","user_id"]
    },{
      foreignKeyName: "calendar_events_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"custom_records": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"deleted_at": string | null,"id": string,"import_hash": string | null,"module_id": string,"occurred_at": string,"title": string,"topic_id": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"deleted_at"?: string | null,"id"?: string,"import_hash"?: string | null,"module_id": string,"occurred_at"?: string,"title"?: string,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"deleted_at"?: string | null,"id"?: string,"import_hash"?: string | null,"module_id"?: string,"occurred_at"?: string,"title"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "custom_records_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"dashboard_widgets": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"id": string,"is_visible": boolean,"layout": NonNullable<Json>,"scope": string,"sort_order": number,"title": string,"topic_id": string | null,"updated_at": string,"user_id": string,"version": number,"widget_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_visible"?: boolean,"layout"?: NonNullable<Json>,"scope": string,"sort_order"?: number,"title": string,"topic_id"?: string | null,"updated_at"?: string,"user_id": string,"version"?: number,"widget_type": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_visible"?: boolean,"layout"?: NonNullable<Json>,"scope"?: string,"sort_order"?: number,"title"?: string,"topic_id"?: string | null,"updated_at"?: string,"user_id"?: string,"version"?: number,"widget_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dashboard_widgets_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "created_at": string,"current_value": number,"description": string,"end_date": string | null,"id": string,"module_id": string,"period_type": string,"start_date": string,"status": string,"target_value": number,"title": string,"topic_id": string,"unit": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_value"?: number,"description"?: string,"end_date"?: string | null,"id"?: string,"module_id": string,"period_type": string,"start_date"?: string,"status"?: string,"target_value": number,"title": string,"topic_id": string,"unit"?: string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"current_value"?: number,"description"?: string,"end_date"?: string | null,"id"?: string,"module_id"?: string,"period_type"?: string,"start_date"?: string,"status"?: string,"target_value"?: number,"title"?: string,"topic_id"?: string,"unit"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "goals_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"habit_checkins": {
                  Row: {
                    "checkin_date": string,"created_at": string,"habit_id": string,"id": string,"notes": string,"topic_id": string,"updated_at": string,"user_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_date": string,"created_at"?: string,"habit_id": string,"id"?: string,"notes"?: string,"topic_id": string,"updated_at"?: string,"user_id": string,"value"?: number
                  }
                  Update: {
                    "checkin_date"?: string,"created_at"?: string,"habit_id"?: string,"id"?: string,"notes"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_checkins_habit_fk"
      columns: ["habit_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"habits": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"is_active": boolean,"module_id": string,"schedule_days": (number)[],"schedule_type": string,"target_count_per_day": number,"title": string,"topic_id": string,"unit": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"module_id": string,"schedule_days"?: (number)[],"schedule_type"?: string,"target_count_per_day"?: number,"title": string,"topic_id": string,"unit"?: string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"module_id"?: string,"schedule_days"?: (number)[],"schedule_type"?: string,"target_count_per_day"?: number,"title"?: string,"topic_id"?: string,"unit"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "habits_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"idempotency_records": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"idempotency_key": string,"operation": string,"request_hash": string,"response_body": NonNullable<Json>,"response_status": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"idempotency_key": string,"operation": string,"request_hash": string,"response_body"?: NonNullable<Json>,"response_status"?: number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"idempotency_key"?: string,"operation"?: string,"request_hash"?: string,"response_body"?: NonNullable<Json>,"response_status"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"journal_entries": {
                  Row: {
                    "category": string | null,"content_html": string,"content_text": string,"created_at": string,"deleted_at": string | null,"entry_date": string,"id": string,"is_draft": boolean,"module_id": string,"mood": string | null,"template_name": string | null,"title": string,"topic_id": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"content_html"?: string,"content_text"?: string,"created_at"?: string,"deleted_at"?: string | null,"entry_date"?: string,"id"?: string,"is_draft"?: boolean,"module_id": string,"mood"?: string | null,"template_name"?: string | null,"title"?: string,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "category"?: string | null,"content_html"?: string,"content_text"?: string,"created_at"?: string,"deleted_at"?: string | null,"entry_date"?: string,"id"?: string,"is_draft"?: boolean,"module_id"?: string,"mood"?: string | null,"template_name"?: string | null,"title"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "journal_entries_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"module_fields": {
                  Row: {
                    "created_at": string,"default_value": Json | null,"field_key": string,"field_type": string,"formula_expression": string | null,"id": string,"is_archived": boolean,"is_required": boolean,"is_unique": boolean,"is_visible_in_table": boolean,"label": string,"module_id": string,"options": NonNullable<Json>,"sort_order": number,"topic_id": string,"updated_at": string,"user_id": string,"validation_rules": NonNullable<Json>,"version": number,"visibility_condition": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_value"?: Json | null,"field_key": string,"field_type": string,"formula_expression"?: string | null,"id"?: string,"is_archived"?: boolean,"is_required"?: boolean,"is_unique"?: boolean,"is_visible_in_table"?: boolean,"label": string,"module_id": string,"options"?: NonNullable<Json>,"sort_order"?: number,"topic_id": string,"updated_at"?: string,"user_id": string,"validation_rules"?: NonNullable<Json>,"version"?: number,"visibility_condition"?: Json | null
                  }
                  Update: {
                    "created_at"?: string,"default_value"?: Json | null,"field_key"?: string,"field_type"?: string,"formula_expression"?: string | null,"id"?: string,"is_archived"?: boolean,"is_required"?: boolean,"is_unique"?: boolean,"is_visible_in_table"?: boolean,"label"?: string,"module_id"?: string,"options"?: NonNullable<Json>,"sort_order"?: number,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"validation_rules"?: NonNullable<Json>,"version"?: number,"visibility_condition"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_fields_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"module_views": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"id": string,"is_default": boolean,"module_id": string | null,"name": string,"sort_order": number,"topic_id": string,"updated_at": string,"user_id": string,"version": number,"view_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_default"?: boolean,"module_id"?: string | null,"name": string,"sort_order"?: number,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number,"view_type": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_default"?: boolean,"module_id"?: string | null,"name"?: string,"sort_order"?: number,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number,"view_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_views_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    },{
      foreignKeyName: "module_views_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "action_url": string | null,"body": string,"created_at": string,"id": string,"is_read": boolean,"kind": string,"read_at": string | null,"scheduled_for": string,"title": string,"topic_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_url"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"is_read"?: boolean,"kind"?: string,"read_at"?: string | null,"scheduled_for"?: string,"title": string,"topic_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "action_url"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"is_read"?: boolean,"kind"?: string,"read_at"?: string | null,"scheduled_for"?: string,"title"?: string,"topic_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"timezone": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email": string,"full_name"?: string,"id": string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"saved_filters": {
                  Row: {
                    "created_at": string,"filter_config": NonNullable<Json>,"id": string,"is_default": boolean,"module_id": string | null,"name": string,"topic_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"filter_config": NonNullable<Json>,"id"?: string,"is_default"?: boolean,"module_id"?: string | null,"name": string,"topic_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"filter_config"?: NonNullable<Json>,"id"?: string,"is_default"?: boolean,"module_id"?: string | null,"name"?: string,"topic_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_filters_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"tag_assignments": {
                  Row: {
                    "created_at": string,"entity_id": string,"entity_type": string,"id": string,"tag_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entity_id": string,"entity_type": string,"id"?: string,"tag_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string,"tag_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tag_assignments_tag_fk"
      columns: ["tag_id","user_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "color": string,"created_at": string,"id": string,"name": string,"normalized_name": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"id"?: string,"name": string,"normalized_name"?: never,"user_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"id"?: string,"name"?: string,"normalized_name"?: never,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"task_checklist_items": {
                  Row: {
                    "created_at": string,"id": string,"is_completed": boolean,"sort_order": number,"task_id": string,"title": string,"topic_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_completed"?: boolean,"sort_order"?: number,"task_id": string,"title": string,"topic_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_completed"?: boolean,"sort_order"?: number,"task_id"?: string,"title"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_checklist_task_fk"
      columns: ["task_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "actual_minutes": number | null,"completed_at": string | null,"created_at": string,"custom_data": NonNullable<Json>,"deleted_at": string | null,"description": string,"due_at": string | null,"estimated_minutes": number | null,"id": string,"module_id": string,"priority": string,"recurrence_rule": Json | null,"sort_order": number,"status": string,"title": string,"topic_id": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_minutes"?: number | null,"completed_at"?: string | null,"created_at"?: string,"custom_data"?: NonNullable<Json>,"deleted_at"?: string | null,"description"?: string,"due_at"?: string | null,"estimated_minutes"?: number | null,"id"?: string,"module_id": string,"priority"?: string,"recurrence_rule"?: Json | null,"sort_order"?: number,"status"?: string,"title": string,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "actual_minutes"?: number | null,"completed_at"?: string | null,"created_at"?: string,"custom_data"?: NonNullable<Json>,"deleted_at"?: string | null,"description"?: string,"due_at"?: string | null,"estimated_minutes"?: number | null,"id"?: string,"module_id"?: string,"priority"?: string,"recurrence_rule"?: Json | null,"sort_order"?: number,"status"?: string,"title"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"time_sessions": {
                  Row: {
                    "accumulated_seconds": number,"created_at": string,"description": string,"ended_at": string | null,"id": string,"is_manual": boolean,"last_resumed_at": string | null,"module_id": string,"started_at": string,"status": string,"task_id": string | null,"topic_id": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accumulated_seconds"?: number,"created_at"?: string,"description"?: string,"ended_at"?: string | null,"id"?: string,"is_manual"?: boolean,"last_resumed_at"?: string | null,"module_id": string,"started_at"?: string,"status"?: string,"task_id"?: string | null,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "accumulated_seconds"?: number,"created_at"?: string,"description"?: string,"ended_at"?: string | null,"id"?: string,"is_manual"?: boolean,"last_resumed_at"?: string | null,"module_id"?: string,"started_at"?: string,"status"?: string,"task_id"?: string | null,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_sessions_module_fk"
      columns: ["module_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topic_modules"
      referencedColumns: ["id","topic_id","user_id"]
    },{
      foreignKeyName: "time_sessions_task_fk"
      columns: ["task_id","topic_id","user_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","topic_id","user_id"]
    }
                  ]
                },"topic_modules": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"description": string,"feature_key": string,"feature_version": number,"icon": string,"id": string,"is_enabled": boolean,"module_key": string,"name": string,"sort_order": number,"topic_id": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"description"?: string,"feature_key": string,"feature_version"?: number,"icon"?: string,"id"?: string,"is_enabled"?: boolean,"module_key": string,"name": string,"sort_order"?: number,"topic_id": string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"description"?: string,"feature_key"?: string,"feature_version"?: number,"icon"?: string,"id"?: string,"is_enabled"?: boolean,"module_key"?: string,"name"?: string,"sort_order"?: number,"topic_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "topic_modules_topic_fk"
      columns: ["topic_id","user_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"topic_templates": {
                  Row: {
                    "accent_color": string,"category": string,"created_at": string,"definition": NonNullable<Json>,"description": string,"icon": string,"id": string,"is_system": boolean,"name": string,"owner_id": string | null,"schema_version": number,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent_color"?: string,"category": string,"created_at"?: string,"definition": NonNullable<Json>,"description": string,"icon"?: string,"id"?: string,"is_system"?: boolean,"name": string,"owner_id"?: string | null,"schema_version"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "accent_color"?: string,"category"?: string,"created_at"?: string,"definition"?: NonNullable<Json>,"description"?: string,"icon"?: string,"id"?: string,"is_system"?: boolean,"name"?: string,"owner_id"?: string | null,"schema_version"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"topics": {
                  Row: {
                    "accent_color": string,"archived_at": string | null,"category": string,"created_at": string,"deleted_at": string | null,"description": string,"icon": string,"id": string,"is_favorite": boolean,"is_pinned": boolean,"name": string,"purpose": string,"settings": NonNullable<Json>,"slug": string,"sort_order": number,"status": string,"template_id": string | null,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accent_color"?: string,"archived_at"?: string | null,"category"?: string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"icon"?: string,"id"?: string,"is_favorite"?: boolean,"is_pinned"?: boolean,"name": string,"purpose"?: string,"settings"?: NonNullable<Json>,"slug": string,"sort_order"?: number,"status"?: string,"template_id"?: string | null,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "accent_color"?: string,"archived_at"?: string | null,"category"?: string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"icon"?: string,"id"?: string,"is_favorite"?: boolean,"is_pinned"?: boolean,"name"?: string,"purpose"?: string,"settings"?: NonNullable<Json>,"slug"?: string,"sort_order"?: number,"status"?: string,"template_id"?: string | null,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "topics_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "topic_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"user_preferences": {
                  Row: {
                    "app_name": string,"compact_mode": boolean,"created_at": string,"date_format": string,"default_dashboard_range": string,"theme": string,"time_format": string,"updated_at": string,"user_id": string,"version": number,"week_starts_on": number
                  }
                  ComputedFields: never
                  Insert: {
                    "app_name"?: string,"compact_mode"?: boolean,"created_at"?: string,"date_format"?: string,"default_dashboard_range"?: string,"theme"?: string,"time_format"?: string,"updated_at"?: string,"user_id": string,"version"?: number,"week_starts_on"?: number
                  }
                  Update: {
                    "app_name"?: string,"compact_mode"?: boolean,"created_at"?: string,"date_format"?: string,"default_dashboard_range"?: string,"theme"?: string,"time_format"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number,"week_starts_on"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_topic_atomic":
{ Args: { "p_idempotency_key"?: string,"p_payload": Json }; Returns: Json
                           },
"duplicate_topic_atomic":
{ Args: { "p_idempotency_key"?: string,"p_new_name"?: string,"p_source_topic_id": string }; Returns: Json
                           },
"get_global_dashboard_summary":
{ Args: { "p_days"?: number,"p_timezone"?: string }; Returns: Json
                           },
"get_topic_analytics_summary":
{ Args: { "p_days"?: number,"p_timezone"?: string,"p_topic_id": string }; Returns: Json
                           },
"global_search_records":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: Json
                           },
"resolve_safe_timezone":
{ Args: { "p_tz": string }; Returns: string
                           },
"start_time_session_atomic":
{ Args: { "p_description"?: string,"p_idempotency_key"?: string,"p_module_id": string,"p_task_id"?: string,"p_topic_id": string }; Returns: Json
                           },
"transition_time_session_atomic":
{ Args: { "p_action": string,"p_expected_version": number,"p_session_id": string }; Returns: {
              "accumulated_seconds": number,
"created_at": string,
"description": string,
"ended_at": string | null,
"id": string,
"is_manual": boolean,
"last_resumed_at": string | null,
"module_id": string,
"started_at": string,
"status": string,
"task_id": string | null,
"topic_id": string,
"updated_at": string,
"user_id": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "time_sessions"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
