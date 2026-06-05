export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advance_deposits: {
        Row: {
          amount: number
          created_at: string
          guest_id: string | null
          id: string
          notes: string | null
          reservation_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          guest_id?: string | null
          id?: string
          notes?: string | null
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          guest_id?: string | null
          id?: string
          notes?: string | null
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_deposits_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_deposits_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_advance_deposits_guest_id"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_advance_deposits_reservation_id"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_notes: {
        Row: {
          amount: number
          cancel_invoice: boolean | null
          created_at: string
          id: string
          invoice_number: string
          issued_at: string
          issued_by: string | null
          number: string
          reason: string | null
          reservation_id: string
        }
        Insert: {
          amount: number
          cancel_invoice?: boolean | null
          created_at?: string
          id?: string
          invoice_number: string
          issued_at?: string
          issued_by?: string | null
          number: string
          reason?: string | null
          reservation_id: string
        }
        Update: {
          amount?: number
          cancel_invoice?: boolean | null
          created_at?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          issued_by?: string | null
          number?: string
          reason?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_credit_notes_reservation_id"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      folio_charges: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          extra: Json | null
          folio_id: string
          id: string
          posted_by: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          extra?: Json | null
          folio_id: string
          id?: string
          posted_by?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          extra?: Json | null
          folio_id?: string
          id?: string
          posted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_folio_charges_folio_id"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folio_charges_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
        ]
      }
      folios: {
        Row: {
          balance: number | null
          created_at: string
          extra: Json | null
          guest_id: string | null
          house_account_id: string | null
          id: string
          reservation_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          extra?: Json | null
          guest_id?: string | null
          house_account_id?: string | null
          id?: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          extra?: Json | null
          guest_id?: string | null
          house_account_id?: string | null
          id?: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_folios_guest_id"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_folios_house_account_id"
            columns: ["house_account_id"]
            isOneToOne: false
            referencedRelation: "house_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_folios_reservation_id"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_masters: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          extra: Json | null
          id: string
          name: string
          notes: string | null
          rate: number | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          extra?: Json | null
          id?: string
          name: string
          notes?: string | null
          rate?: number | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          extra?: Json | null
          id?: string
          name?: string
          notes?: string | null
          rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          address: string | null
          archived: boolean | null
          archived_at: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          do_not_rent: boolean | null
          email: string | null
          extra: Json | null
          gender: string | null
          id: string
          id_number: string | null
          id_type: string | null
          name: string
          nationality: string | null
          notes: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string
          vip: boolean | null
        }
        Insert: {
          address?: string | null
          archived?: boolean | null
          archived_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          do_not_rent?: boolean | null
          email?: string | null
          extra?: Json | null
          gender?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
          vip?: boolean | null
        }
        Update: {
          address?: string | null
          archived?: boolean | null
          archived_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          do_not_rent?: boolean | null
          email?: string | null
          extra?: Json | null
          gender?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
          vip?: boolean | null
        }
        Relationships: []
      }
      hotel_settings: {
        Row: {
          address: string | null
          currency: string | null
          email: string | null
          extra: Json | null
          id: number
          logo_url: string | null
          name: string | null
          phone: string | null
          service_fee_rate: number | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          currency?: string | null
          email?: string | null
          extra?: Json | null
          id?: number
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          service_fee_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          currency?: string | null
          email?: string | null
          extra?: Json | null
          id?: number
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          service_fee_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      house_accounts: {
        Row: {
          balance: number | null
          created_at: string
          credit_limit: number | null
          extra: Json | null
          id: string
          name: string
          notes: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          credit_limit?: number | null
          extra?: Json | null
          id?: string
          name: string
          notes?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          credit_limit?: number | null
          extra?: Json | null
          id?: string
          name?: string
          notes?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      housekeeper_reports: {
        Row: {
          created_at: string
          extra: Json | null
          housekeeper_id: string | null
          id: string
          notes: string | null
          report_date: string
          rooms: Json | null
          total_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          extra?: Json | null
          housekeeper_id?: string | null
          id?: string
          notes?: string | null
          report_date: string
          rooms?: Json | null
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          extra?: Json | null
          housekeeper_id?: string | null
          id?: string
          notes?: string | null
          report_date?: string
          rooms?: Json | null
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_housekeeper_reports_housekeeper_id"
            columns: ["housekeeper_id"]
            isOneToOne: false
            referencedRelation: "housekeepers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeper_reports_housekeeper_id_fkey"
            columns: ["housekeeper_id"]
            isOneToOne: false
            referencedRelation: "housekeepers"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeepers: {
        Row: {
          active: boolean | null
          created_at: string
          extra: Json | null
          id: string
          name: string
          phone: string | null
          source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          extra?: Json | null
          id?: string
          name: string
          phone?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          extra?: Json | null
          id?: string
          name?: string
          phone?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      housekeeping_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          extra: Json | null
          id: string
          notes: string | null
          room_id: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          extra?: Json | null
          id?: string
          notes?: string | null
          room_id?: string | null
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          extra?: Json | null
          id?: string
          notes?: string | null
          room_id?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_housekeeping_tasks_assigned_to"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "housekeepers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_housekeeping_tasks_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_teams: {
        Row: {
          created_at: string
          extra: Json | null
          id: string
          member_ids: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extra?: Json | null
          id?: string
          member_ids?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extra?: Json | null
          id?: string
          member_ids?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string
          extra: Json | null
          id: string
          name: string
          quantity: number | null
          reorder_level: number | null
          sku: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string
          extra?: Json | null
          id?: string
          name: string
          quantity?: number | null
          reorder_level?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string
          extra?: Json | null
          id?: string
          name?: string
          quantity?: number | null
          reorder_level?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lost_found: {
        Row: {
          claimed_at: string | null
          claimed_by_guest_id: string | null
          created_at: string
          description: string
          extra: Json | null
          found_by: string | null
          id: string
          room_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_guest_id?: string | null
          created_at?: string
          description: string
          extra?: Json | null
          found_by?: string | null
          id?: string
          room_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_guest_id?: string | null
          created_at?: string
          description?: string
          extra?: Json | null
          found_by?: string | null
          id?: string
          room_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lost_found_claimed_by_guest_id"
            columns: ["claimed_by_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lost_found_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_claimed_by_guest_id_fkey"
            columns: ["claimed_by_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          reported_by: string | null
          resolved_at: string | null
          room_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          reported_by?: string | null
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          reported_by?: string | null
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenance_tickets_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          guest_id: string | null
          id: string
          meta: Json | null
          method: string
          notes: string | null
          reservation_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          guest_id?: string | null
          id?: string
          meta?: Json | null
          method?: string
          notes?: string | null
          reservation_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          guest_id?: string | null
          id?: string
          meta?: Json | null
          method?: string
          notes?: string | null
          reservation_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_guest_id"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_reservation_id"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_items: {
        Row: {
          active: boolean | null
          category: string | null
          cost: number | null
          created_at: string
          extra: Json | null
          id: string
          name: string
          price: number
          quantity: number | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          cost?: number | null
          created_at?: string
          extra?: Json | null
          id?: string
          name: string
          price?: number
          quantity?: number | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          cost?: number | null
          created_at?: string
          extra?: Json | null
          id?: string
          name?: string
          price?: number
          quantity?: number | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_sales: {
        Row: {
          created_at: string
          extra: Json | null
          guest_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          product_id: string | null
          quantity: number
          reservation_id: string | null
          sold_by: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          extra?: Json | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          quantity?: number
          reservation_id?: string | null
          sold_by?: string | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          extra?: Json | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          quantity?: number
          reservation_id?: string | null
          sold_by?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_sales_guest_id"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_sales_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_sales_reservation_id"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          assigned_to: string | null
          body: string | null
          completed: boolean | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          cancelled_at: string | null
          check_in: string
          check_out: string
          checked_in_at: string | null
          checked_out_at: string | null
          confirmation_number: string | null
          created_at: string
          group_master_id: string | null
          guest_id: string
          id: string
          invoice: Json | null
          last_nightly_charge_date: string | null
          no_show: boolean | null
          notes: string | null
          room_id: string | null
          source: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          confirmation_number?: string | null
          created_at?: string
          group_master_id?: string | null
          guest_id: string
          id?: string
          invoice?: Json | null
          last_nightly_charge_date?: string | null
          no_show?: boolean | null
          notes?: string | null
          room_id?: string | null
          source?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          confirmation_number?: string | null
          created_at?: string
          group_master_id?: string | null
          guest_id?: string
          id?: string
          invoice?: Json | null
          last_nightly_charge_date?: string | null
          no_show?: boolean | null
          notes?: string | null
          room_id?: string | null
          source?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservations_group_master_id"
            columns: ["group_master_id"]
            isOneToOne: false
            referencedRelation: "group_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reservations_guest_id"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reservations_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          accessible: boolean | null
          archived: boolean | null
          archived_at: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_housekeeper_id: string | null
          bed_code: string | null
          building: string | null
          cleaning_finished_at: string | null
          cleaning_started_at: string | null
          cleaning_value: number | null
          created_at: string
          dnd_flag: boolean | null
          floor: number
          housekeeping_notes: string | null
          housekeeping_photos: Json | null
          housekeeping_status: string | null
          id: string
          number: string
          price: number
          refused_service: boolean | null
          smoking_allowed: boolean | null
          status: string
          task_type: string | null
          type: string
          type_code: string | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          accessible?: boolean | null
          archived?: boolean | null
          archived_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_housekeeper_id?: string | null
          bed_code?: string | null
          building?: string | null
          cleaning_finished_at?: string | null
          cleaning_started_at?: string | null
          cleaning_value?: number | null
          created_at?: string
          dnd_flag?: boolean | null
          floor?: number
          housekeeping_notes?: string | null
          housekeeping_photos?: Json | null
          housekeeping_status?: string | null
          id?: string
          number: string
          price?: number
          refused_service?: boolean | null
          smoking_allowed?: boolean | null
          status?: string
          task_type?: string | null
          type: string
          type_code?: string | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          accessible?: boolean | null
          archived?: boolean | null
          archived_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_housekeeper_id?: string | null
          bed_code?: string | null
          building?: string | null
          cleaning_finished_at?: string | null
          cleaning_started_at?: string | null
          cleaning_value?: number | null
          created_at?: string
          dnd_flag?: boolean | null
          floor?: number
          housekeeping_notes?: string | null
          housekeeping_photos?: Json | null
          housekeeping_status?: string | null
          id?: string
          number?: string
          price?: number
          refused_service?: boolean | null
          smoking_allowed?: boolean | null
          status?: string
          task_type?: string | null
          type?: string
          type_code?: string | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rooms_assigned_housekeeper_id"
            columns: ["assigned_housekeeper_id"]
            isOneToOne: false
            referencedRelation: "housekeepers"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          action: Json | null
          active: boolean | null
          conditions: Json | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          action?: Json | null
          active?: boolean | null
          conditions?: Json | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          action?: Json | null
          active?: boolean | null
          conditions?: Json | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          closed_at: string | null
          closing_balance: number | null
          created_at: string
          extra: Json | null
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          extra?: Json | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          extra?: Json | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_in_reservation: {
        Args: { p_reservation_id: string }
        Returns: string
      }
      check_out_reservation: {
        Args: { p_final_amount?: number; p_reservation_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      record_payment_with_audit: {
        Args: {
          p_amount: number
          p_guest_id: string
          p_method?: string
          p_notes?: string
          p_reservation_id: string
          p_status?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "receptionist"
        | "housekeeping"
        | "accountant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "receptionist",
        "housekeeping",
        "accountant",
      ],
    },
  },
} as const
