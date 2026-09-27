
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_role": string | null,"changes": Json | null,"entity": string,"entity_id": string | null,"id": number,"metadata": Json | null,"occurred_at": string
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_role"?: string | null,"changes"?: Json | null,"entity": string,"entity_id"?: string | null,"id"?: never,"metadata"?: Json | null,"occurred_at"?: string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_role"?: string | null,"changes"?: Json | null,"entity"?: string,"entity_id"?: string | null,"id"?: never,"metadata"?: Json | null,"occurred_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"calendar_events": {
                  Row: {
                    "client_id": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"description": string | null,"event_date": string,"event_time": string | null,"id": string,"location": string | null,"process_id": string | null,"responsible_id": string | null,"status": Database["public"]['Enums']["event_status"],"subprocess_id": string | null,"title": string,"type": Database["public"]['Enums']["event_type"],"updated_at": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"event_date": string,"event_time"?: string | null,"id"?: string,"location"?: string | null,"process_id"?: string | null,"responsible_id"?: string | null,"status"?: Database["public"]['Enums']["event_status"],"subprocess_id"?: string | null,"title": string,"type": Database["public"]['Enums']["event_type"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"event_date"?: string,"event_time"?: string | null,"id"?: string,"location"?: string | null,"process_id"?: string | null,"responsible_id"?: string | null,"status"?: Database["public"]['Enums']["event_status"],"subprocess_id"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["event_type"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_subprocess_id_fkey"
      columns: ["subprocess_id"]
isOneToOne: false
      referencedRelation: "subprocesses"
      referencedColumns: ["id"]
    }
                  ]
                },"client_health_profiles": {
                  Row: {
                    "client_id": string,"disability_categories": (string)[],"has_medical_report": boolean,"medical_report_valid_until": string | null,"notes": string | null,"updated_at": string
                  }
                  Insert: {
                    "client_id": string,"disability_categories"?: (string)[],"has_medical_report"?: boolean,"medical_report_valid_until"?: string | null,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"disability_categories"?: (string)[],"has_medical_report"?: boolean,"medical_report_valid_until"?: string | null,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_health_profiles_client_id_fkey"
      columns: ["client_id"]
isOneToOne: true
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_health_profiles_client_id_fkey"
      columns: ["client_id"]
isOneToOne: true
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "address_city": string | null,"address_complement": string | null,"address_district": string | null,"address_number": string | null,"address_state": string | null,"address_street": string | null,"address_zip": string | null,"birth_date": string | null,"code": string,"cpf": string,"created_at": string,"created_by": string | null,"email": string,"full_name": string,"id": string,"internal_notes": string | null,"phone": string,"portal_access_enabled": boolean,"responsible_id": string | null,"rg": string | null,"status": Database["public"]['Enums']["client_status"],"type": Database["public"]['Enums']["client_type"],"updated_at": string
                  }
                  Insert: {
                    "address_city"?: string | null,"address_complement"?: string | null,"address_district"?: string | null,"address_number"?: string | null,"address_state"?: string | null,"address_street"?: string | null,"address_zip"?: string | null,"birth_date"?: string | null,"code"?: string,"cpf": string,"created_at"?: string,"created_by"?: string | null,"email": string,"full_name": string,"id"?: string,"internal_notes"?: string | null,"phone": string,"portal_access_enabled"?: boolean,"responsible_id"?: string | null,"rg"?: string | null,"status"?: Database["public"]['Enums']["client_status"],"type": Database["public"]['Enums']["client_type"],"updated_at"?: string
                  }
                  Update: {
                    "address_city"?: string | null,"address_complement"?: string | null,"address_district"?: string | null,"address_number"?: string | null,"address_state"?: string | null,"address_street"?: string | null,"address_zip"?: string | null,"birth_date"?: string | null,"code"?: string,"cpf"?: string,"created_at"?: string,"created_by"?: string | null,"email"?: string,"full_name"?: string,"id"?: string,"internal_notes"?: string | null,"phone"?: string,"portal_access_enabled"?: boolean,"responsible_id"?: string | null,"rg"?: string | null,"status"?: Database["public"]['Enums']["client_status"],"type"?: Database["public"]['Enums']["client_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"company_settings": {
                  Row: {
                    "company_name": string,"id": boolean,"stale_process_days": number,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "company_name": string,"id"?: boolean,"stale_process_days"?: number,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "company_name"?: string,"id"?: boolean,"stale_process_days"?: number,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"documents": {
                  Row: {
                    "client_id": string,"created_at": string,"file_mime": string | null,"file_name": string | null,"file_path": string | null,"file_size_bytes": number | null,"id": string,"internal_notes": string | null,"is_sensitive": boolean,"process_id": string | null,"requested_at": string,"requested_by": string | null,"return_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["document_status"],"step_id": string | null,"subprocess_id": string | null,"title": string,"type": Database["public"]['Enums']["document_type"],"updated_at": string,"upload_deadline": string | null,"uploaded_at": string | null,"uploaded_by": string | null,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  Insert: {
                    "client_id": string,"created_at"?: string,"file_mime"?: string | null,"file_name"?: string | null,"file_path"?: string | null,"file_size_bytes"?: number | null,"id"?: string,"internal_notes"?: string | null,"is_sensitive"?: boolean,"process_id"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"return_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"step_id"?: string | null,"subprocess_id"?: string | null,"title": string,"type": Database["public"]['Enums']["document_type"],"updated_at"?: string,"upload_deadline"?: string | null,"uploaded_at"?: string | null,"uploaded_by"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"file_mime"?: string | null,"file_name"?: string | null,"file_path"?: string | null,"file_size_bytes"?: number | null,"id"?: string,"internal_notes"?: string | null,"is_sensitive"?: boolean,"process_id"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"return_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"step_id"?: string | null,"subprocess_id"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["document_type"],"updated_at"?: string,"upload_deadline"?: string | null,"uploaded_at"?: string | null,"uploaded_by"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "process_steps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_subprocess_id_fkey"
      columns: ["subprocess_id"]
isOneToOne: false
      referencedRelation: "subprocesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"financial_records": {
                  Row: {
                    "amount_paid": number,"client_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"description": string,"discount": number,"due_date": string | null,"id": string,"notes": string | null,"paid_at": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"process_id": string | null,"status": Database["public"]['Enums']["financial_status"],"total_amount": number,"updated_at": string
                  }
                  Insert: {
                    "amount_paid"?: number,"client_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description": string,"discount"?: number,"due_date"?: string | null,"id"?: string,"notes"?: string | null,"paid_at"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"process_id"?: string | null,"status"?: Database["public"]['Enums']["financial_status"],"total_amount": number,"updated_at"?: string
                  }
                  Update: {
                    "amount_paid"?: number,"client_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string,"discount"?: number,"due_date"?: string | null,"id"?: string,"notes"?: string | null,"paid_at"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"process_id"?: string | null,"status"?: Database["public"]['Enums']["financial_status"],"total_amount"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financial_records_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    }
                  ]
                },"integrations": {
                  Row: {
                    "category": string,"config": NonNullable<Json>,"description": string | null,"enabled": boolean,"id": string,"key": string,"name": string,"provider": string,"secret_names": (string)[],"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "category": string,"config"?: NonNullable<Json>,"description"?: string | null,"enabled"?: boolean,"id"?: string,"key": string,"name": string,"provider": string,"secret_names"?: (string)[],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "category"?: string,"config"?: NonNullable<Json>,"description"?: string | null,"enabled"?: boolean,"id"?: string,"key"?: string,"name"?: string,"provider"?: string,"secret_names"?: (string)[],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "integrations_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "client_id": string | null,"created_at": string,"id": string,"link": string | null,"message": string,"process_id": string | null,"read_at": string | null,"recipient_id": string,"title": string,"type": Database["public"]['Enums']["notification_type"]
                  }
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"message": string,"process_id"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string,"type": Database["public"]['Enums']["notification_type"]
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"message"?: string,"process_id"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string,"type"?: Database["public"]['Enums']["notification_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"process_movements": {
                  Row: {
                    "author_id": string | null,"created_at": string,"description": string | null,"from_status": string | null,"id": string,"process_id": string,"subprocess_id": string | null,"title": string,"to_status": string | null,"type": Database["public"]['Enums']["movement_type"],"visible_to_client": boolean
                  }
                  Insert: {
                    "author_id"?: string | null,"created_at"?: string,"description"?: string | null,"from_status"?: string | null,"id"?: string,"process_id": string,"subprocess_id"?: string | null,"title": string,"to_status"?: string | null,"type": Database["public"]['Enums']["movement_type"],"visible_to_client"?: boolean
                  }
                  Update: {
                    "author_id"?: string | null,"created_at"?: string,"description"?: string | null,"from_status"?: string | null,"id"?: string,"process_id"?: string,"subprocess_id"?: string | null,"title"?: string,"to_status"?: string | null,"type"?: Database["public"]['Enums']["movement_type"],"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "process_movements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "process_movements_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "process_movements_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "process_movements_subprocess_id_fkey"
      columns: ["subprocess_id"]
isOneToOne: false
      referencedRelation: "subprocesses"
      referencedColumns: ["id"]
    }
                  ]
                },"process_steps": {
                  Row: {
                    "client_note": string | null,"completed_at": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"due_date": string | null,"id": string,"internal_notes": string | null,"position": number,"responsible_id": string | null,"status": Database["public"]['Enums']["step_status"],"subprocess_id": string,"title": string,"updated_at": string,"visible_to_client": boolean
                  }
                  Insert: {
                    "client_note"?: string | null,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"internal_notes"?: string | null,"position"?: number,"responsible_id"?: string | null,"status"?: Database["public"]['Enums']["step_status"],"subprocess_id": string,"title": string,"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Update: {
                    "client_note"?: string | null,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"internal_notes"?: string | null,"position"?: number,"responsible_id"?: string | null,"status"?: Database["public"]['Enums']["step_status"],"subprocess_id"?: string,"title"?: string,"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "process_steps_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "process_steps_subprocess_id_fkey"
      columns: ["subprocess_id"]
isOneToOne: false
      referencedRelation: "subprocesses"
      referencedColumns: ["id"]
    }
                  ]
                },"processes": {
                  Row: {
                    "client_id": string,"code": string,"concluded_at": string | null,"created_by": string | null,"due_date": string | null,"id": string,"internal_notes": string | null,"opened_at": string,"priority": Database["public"]['Enums']["priority"],"public_summary": string | null,"responsible_id": string | null,"status": Database["public"]['Enums']["process_status"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "client_id": string,"code"?: string,"concluded_at"?: string | null,"created_by"?: string | null,"due_date"?: string | null,"id"?: string,"internal_notes"?: string | null,"opened_at"?: string,"priority"?: Database["public"]['Enums']["priority"],"public_summary"?: string | null,"responsible_id"?: string | null,"status"?: Database["public"]['Enums']["process_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"code"?: string,"concluded_at"?: string | null,"created_by"?: string | null,"due_date"?: string | null,"id"?: string,"internal_notes"?: string | null,"opened_at"?: string,"priority"?: Database["public"]['Enums']["priority"],"public_summary"?: string | null,"responsible_id"?: string | null,"status"?: Database["public"]['Enums']["process_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "processes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "processes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "processes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "processes_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"client_id": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"job_title": string | null,"last_access_at": string | null,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"client_id"?: string | null,"created_at"?: string,"email": string,"full_name": string,"id": string,"job_title"?: string | null,"last_access_at"?: string | null,"phone"?: string | null,"role": Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"client_id"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"job_title"?: string | null,"last_access_at"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"subprocess_catalog": {
                  Row: {
                    "applicability": string,"description": string,"display_order": number,"name": string,"suggested_agency": string | null,"suggested_documents": (Database["public"]['Enums']["document_type"])[],"suggested_steps": (string)[],"type": Database["public"]['Enums']["subprocess_type"]
                  }
                  Insert: {
                    "applicability": string,"description": string,"display_order": number,"name": string,"suggested_agency"?: string | null,"suggested_documents"?: (Database["public"]['Enums']["document_type"])[],"suggested_steps"?: (string)[],"type": Database["public"]['Enums']["subprocess_type"]
                  }
                  Update: {
                    "applicability"?: string,"description"?: string,"display_order"?: number,"name"?: string,"suggested_agency"?: string | null,"suggested_documents"?: (Database["public"]['Enums']["document_type"])[],"suggested_steps"?: (string)[],"type"?: Database["public"]['Enums']["subprocess_type"]
                  }
                  Relationships: [
                    
                  ]
                },"subprocesses": {
                  Row: {
                    "agency": string | null,"block_reason": string | null,"concluded_at": string | null,"created_at": string,"due_date": string | null,"id": string,"internal_notes": string | null,"next_action": string | null,"next_action_owner": Database["public"]['Enums']["action_owner"] | null,"process_id": string,"protocol_number": string | null,"responsible_id": string | null,"started_at": string | null,"status": Database["public"]['Enums']["subprocess_status"],"type": Database["public"]['Enums']["subprocess_type"],"updated_at": string
                  }
                  Insert: {
                    "agency"?: string | null,"block_reason"?: string | null,"concluded_at"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"internal_notes"?: string | null,"next_action"?: string | null,"next_action_owner"?: Database["public"]['Enums']["action_owner"] | null,"process_id": string,"protocol_number"?: string | null,"responsible_id"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["subprocess_status"],"type": Database["public"]['Enums']["subprocess_type"],"updated_at"?: string
                  }
                  Update: {
                    "agency"?: string | null,"block_reason"?: string | null,"concluded_at"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"internal_notes"?: string | null,"next_action"?: string | null,"next_action_owner"?: Database["public"]['Enums']["action_owner"] | null,"process_id"?: string,"protocol_number"?: string | null,"responsible_id"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["subprocess_status"],"type"?: Database["public"]['Enums']["subprocess_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subprocesses_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subprocesses_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subprocesses_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "calendar_event_list": {
                  Row: {
                    "client_id": string | null,"client_name": string | null,"created_at": string | null,"created_by": string | null,"deleted_at": string | null,"description": string | null,"event_date": string | null,"event_time": string | null,"id": string | null,"location": string | null,"process_code": string | null,"process_id": string | null,"responsible_id": string | null,"responsible_name": string | null,"status": Database["public"]['Enums']["event_status"] | null,"subprocess_id": string | null,"title": string | null,"type": Database["public"]['Enums']["event_type"] | null,"updated_at": string | null,"visibility": Database["public"]['Enums']["visibility"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_subprocess_id_fkey"
      columns: ["subprocess_id"]
isOneToOne: false
      referencedRelation: "subprocesses"
      referencedColumns: ["id"]
    }
                  ]
                },"client_list": {
                  Row: {
                    "active_processes": number | null,"address_city": string | null,"address_complement": string | null,"address_district": string | null,"address_number": string | null,"address_state": string | null,"address_street": string | null,"address_zip": string | null,"birth_date": string | null,"code": string | null,"cpf": string | null,"created_at": string | null,"created_by": string | null,"disability_categories": (string)[] | null,"email": string | null,"full_name": string | null,"has_health_profile": boolean | null,"has_medical_report": boolean | null,"health_notes": string | null,"id": string | null,"internal_notes": string | null,"last_movement_at": string | null,"medical_report_valid_until": string | null,"pending_documents": number | null,"phone": string | null,"portal_access_enabled": boolean | null,"responsible_id": string | null,"responsible_name": string | null,"rg": string | null,"search_text": string | null,"status": Database["public"]['Enums']["client_status"] | null,"total_processes": number | null,"type": Database["public"]['Enums']["client_type"] | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"document_list": {
                  Row: {
                    "awaiting_review": boolean | null,"client_id": string | null,"client_name": string | null,"created_at": string | null,"file_mime": string | null,"file_name": string | null,"file_path": string | null,"file_size_bytes": number | null,"id": string | null,"internal_notes": string | null,"is_sensitive": boolean | null,"process_code": string | null,"process_id": string | null,"requested_at": string | null,"requested_by": string | null,"return_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"search_text": string | null,"status": Database["public"]['Enums']["document_status"] | null,"step_id": string | null,"subprocess_id": string | null,"subprocess_type": Database["public"]['Enums']["subprocess_type"] | null,"title": string | null,"type": Database["public"]['Enums']["document_type"] | null,"updated_at": string | null,"upload_deadline": string | null,"uploaded_at": string | null,"uploaded_by": string | null,"visibility": Database["public"]['Enums']["visibility"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "process_steps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_subprocess_id_fkey"
      columns: ["subprocess_id"]
isOneToOne: false
      referencedRelation: "subprocesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"financial_list": {
                  Row: {
                    "amount_paid": number | null,"client_id": string | null,"client_name": string | null,"created_at": string | null,"created_by": string | null,"deleted_at": string | null,"description": string | null,"discount": number | null,"due_date": string | null,"id": string | null,"notes": string | null,"paid_at": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"process_code": string | null,"process_id": string | null,"search_text": string | null,"status": Database["public"]['Enums']["financial_status"] | null,"total_amount": number | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "financial_records_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_records_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    }
                  ]
                },"movement_feed": {
                  Row: {
                    "author_id": string | null,"client_name": string | null,"created_at": string | null,"description": string | null,"from_status": string | null,"id": string | null,"process_code": string | null,"process_id": string | null,"subprocess_id": string | null,"title": string | null,"to_status": string | null,"type": Database["public"]['Enums']["movement_type"] | null,"visible_to_client": boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "process_movements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "process_movements_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "process_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "process_movements_process_id_fkey"
      columns: ["process_id"]
isOneToOne: false
      referencedRelation: "processes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "process_movements_subprocess_id_fkey"
      columns: ["subprocess_id"]
isOneToOne: false
      referencedRelation: "subprocesses"
      referencedColumns: ["id"]
    }
                  ]
                },"process_list": {
                  Row: {
                    "client_code": string | null,"client_id": string | null,"client_name": string | null,"code": string | null,"completed_subprocesses": number | null,"concluded_at": string | null,"created_by": string | null,"due_date": string | null,"has_pending_items": boolean | null,"id": string | null,"internal_notes": string | null,"is_overdue": boolean | null,"opened_at": string | null,"pending_documents": number | null,"priority": Database["public"]['Enums']["priority"] | null,"priority_rank": number | null,"progress": number | null,"public_summary": string | null,"responsible_id": string | null,"responsible_name": string | null,"search_text": string | null,"status": Database["public"]['Enums']["process_status"] | null,"subprocess_types": (Database["public"]['Enums']["subprocess_type"])[] | null,"title": string | null,"total_subprocesses": number | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "processes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "processes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "processes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "processes_responsible_id_fkey"
      columns: ["responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_subprocess":
{ Args: { "p_data": Json }; Returns: string
                           },
"approve_document":
{ Args: { "p_id": string,"p_internal_notes"?: string }; Returns: undefined
                           },
"audit_event":
{ Args: { "p_action": string,"p_entity": string,"p_entity_id": string,"p_metadata"?: Json }; Returns: undefined
                           },
"change_process_status":
{ Args: { "p_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["process_status"] }; Returns: undefined
                           },
"change_step_status":
{ Args: { "p_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["step_status"] }; Returns: undefined
                           },
"change_subprocess_status":
{ Args: { "p_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["subprocess_status"] }; Returns: undefined
                           },
"client_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"create_process":
{ Args: { "p_data": Json }; Returns: string
                           },
"dashboard_analytics":
{ Args: { "p_months": number }; Returns: Json
                           },
"dashboard_pending_items":
{ Args: { "p_limit"?: number }; Returns: Json
                           },
"dashboard_summary":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"document_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"finance_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"mark_notification_read":
{ Args: { "p_id": string }; Returns: undefined
                           },
"portal_documents":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"portal_events":
{ Args: { "p_from": string,"p_to": string }; Returns: Json
                           },
"portal_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"portal_process":
{ Args: { "p_process_id": string }; Returns: Json
                           },
"process_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"register_document_upload":
{ Args: { "p_id": string,"p_mime": string,"p_name": string,"p_path": string,"p_size": number }; Returns: undefined
                           },
"reject_document":
{ Args: { "p_id": string,"p_reason": string }; Returns: undefined
                           },
"remove_calendar_event":
{ Args: { "p_id": string }; Returns: undefined
                           },
"remove_financial_record":
{ Args: { "p_id": string }; Returns: undefined
                           },
"remove_step":
{ Args: { "p_id": string }; Returns: undefined
                           },
"request_document_resubmission":
{ Args: { "p_id": string,"p_new_deadline"?: string,"p_reason": string }; Returns: undefined
                           },
"save_client":
{ Args: { "p_data": Json,"p_id": string }; Returns: string
                           },
"start_document_review":
{ Args: { "p_id": string }; Returns: undefined
                           },
"touch_last_access":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           }
          }
          Enums: {
            "action_owner": "equipe"|"cliente"|"orgao"|"terceiro","client_status": "ativo"|"inativo","client_type": "condutor"|"nao_condutor","document_status": "solicitado"|"enviado"|"em_analise"|"aprovado"|"reprovado"|"reenvio_solicitado","document_type": "rg"|"cpf"|"cnh"|"comprovante_endereco"|"laudo_medico"|"nota_fiscal"|"crlv"|"procuracao"|"declaracao"|"comprovante_renda"|"outro","event_status": "agendado"|"concluido"|"cancelado","event_type": "reuniao"|"prazo"|"pericia"|"protocolo"|"retorno"|"outro","financial_status": "pendente"|"parcial"|"pago"|"atrasado"|"cancelado","movement_type": "processo_criado"|"status_alterado"|"etapa_concluida"|"documento_solicitado"|"documento_enviado"|"documento_aprovado"|"documento_reprovado"|"protocolo_registrado"|"observacao"|"prazo_alterado"|"responsavel_alterado"|"mensagem_cliente","notification_type": "info"|"sucesso"|"alerta"|"erro"|"documento"|"prazo","payment_method": "pix"|"cartao"|"boleto"|"dinheiro"|"transferencia","priority": "baixa"|"normal"|"alta"|"urgente","process_status": "em_avaliacao"|"em_andamento"|"aguardando_cliente"|"aguardando_orgao"|"concluido"|"arquivado"|"cancelado","step_status": "pendente"|"em_andamento"|"concluida"|"bloqueada"|"nao_aplicavel","subprocess_status": "nao_iniciado"|"em_andamento"|"aguardando_documentos"|"aguardando_orgao"|"deferido"|"indeferido"|"nao_aplicavel"|"cancelado","subprocess_type": "avaliacao_inicial"|"ipi"|"iof"|"icms"|"ipva"|"estacionamento_pcd"|"rodizio"|"recurso","user_role": "super_admin"|"gestor"|"analista"|"cliente","visibility": "interno"|"cliente"
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
            "action_owner": ["equipe", "cliente", "orgao", "terceiro"],"client_status": ["ativo", "inativo"],"client_type": ["condutor", "nao_condutor"],"document_status": ["solicitado", "enviado", "em_analise", "aprovado", "reprovado", "reenvio_solicitado"],"document_type": ["rg", "cpf", "cnh", "comprovante_endereco", "laudo_medico", "nota_fiscal", "crlv", "procuracao", "declaracao", "comprovante_renda", "outro"],"event_status": ["agendado", "concluido", "cancelado"],"event_type": ["reuniao", "prazo", "pericia", "protocolo", "retorno", "outro"],"financial_status": ["pendente", "parcial", "pago", "atrasado", "cancelado"],"movement_type": ["processo_criado", "status_alterado", "etapa_concluida", "documento_solicitado", "documento_enviado", "documento_aprovado", "documento_reprovado", "protocolo_registrado", "observacao", "prazo_alterado", "responsavel_alterado", "mensagem_cliente"],"notification_type": ["info", "sucesso", "alerta", "erro", "documento", "prazo"],"payment_method": ["pix", "cartao", "boleto", "dinheiro", "transferencia"],"priority": ["baixa", "normal", "alta", "urgente"],"process_status": ["em_avaliacao", "em_andamento", "aguardando_cliente", "aguardando_orgao", "concluido", "arquivado", "cancelado"],"step_status": ["pendente", "em_andamento", "concluida", "bloqueada", "nao_aplicavel"],"subprocess_status": ["nao_iniciado", "em_andamento", "aguardando_documentos", "aguardando_orgao", "deferido", "indeferido", "nao_aplicavel", "cancelado"],"subprocess_type": ["avaliacao_inicial", "ipi", "iof", "icms", "ipva", "estacionamento_pcd", "rodizio", "recurso"],"user_role": ["super_admin", "gestor", "analista", "cliente"],"visibility": ["interno", "cliente"]
          }
        }
} as const

