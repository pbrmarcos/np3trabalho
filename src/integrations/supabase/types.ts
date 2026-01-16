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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_logs: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          user_email: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_email: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_isolated_page: boolean | null
          keywords: string | null
          meta_description: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_isolated_page?: boolean | null
          keywords?: string | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_isolated_page?: boolean | null
          keywords?: string | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_onboarding: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          brand_creation_paid: boolean | null
          brand_current_package: number | null
          brand_revisions_used: number | null
          brand_status: string | null
          brand_versions_used: number | null
          business_description: string | null
          business_email: string | null
          business_hours: string | null
          business_type: string
          company_name: string
          created_at: string | null
          domain_name: string | null
          domain_provider: string | null
          facebook: string | null
          has_brand_identity: boolean | null
          has_domain: boolean | null
          has_logo: boolean | null
          id: string
          inspiration_urls: string[] | null
          instagram: string | null
          is_design_only: boolean | null
          linkedin: string | null
          logo_description: string | null
          logo_url: string | null
          migration_access_notes: string | null
          migration_assistance_level: string | null
          migration_current_domain: string | null
          migration_current_host: string | null
          migration_has_access: boolean | null
          migration_site_type: string | null
          needs_brand_creation: boolean | null
          needs_migration: boolean | null
          onboarding_status: string
          phone_landline: string | null
          preferred_color: string | null
          selected_plan: string
          show_address: boolean | null
          site_expectations: string | null
          stripe_session_id: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string | null
          user_id: string
          whatsapp: string
          youtube: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          brand_creation_paid?: boolean | null
          brand_current_package?: number | null
          brand_revisions_used?: number | null
          brand_status?: string | null
          brand_versions_used?: number | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: string | null
          business_type: string
          company_name: string
          created_at?: string | null
          domain_name?: string | null
          domain_provider?: string | null
          facebook?: string | null
          has_brand_identity?: boolean | null
          has_domain?: boolean | null
          has_logo?: boolean | null
          id?: string
          inspiration_urls?: string[] | null
          instagram?: string | null
          is_design_only?: boolean | null
          linkedin?: string | null
          logo_description?: string | null
          logo_url?: string | null
          migration_access_notes?: string | null
          migration_assistance_level?: string | null
          migration_current_domain?: string | null
          migration_current_host?: string | null
          migration_has_access?: boolean | null
          migration_site_type?: string | null
          needs_brand_creation?: boolean | null
          needs_migration?: boolean | null
          onboarding_status?: string
          phone_landline?: string | null
          preferred_color?: string | null
          selected_plan: string
          show_address?: boolean | null
          site_expectations?: string | null
          stripe_session_id?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp: string
          youtube?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          brand_creation_paid?: boolean | null
          brand_current_package?: number | null
          brand_revisions_used?: number | null
          brand_status?: string | null
          brand_versions_used?: number | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: string | null
          business_type?: string
          company_name?: string
          created_at?: string | null
          domain_name?: string | null
          domain_provider?: string | null
          facebook?: string | null
          has_brand_identity?: boolean | null
          has_domain?: boolean | null
          has_logo?: boolean | null
          id?: string
          inspiration_urls?: string[] | null
          instagram?: string | null
          is_design_only?: boolean | null
          linkedin?: string | null
          logo_description?: string | null
          logo_url?: string | null
          migration_access_notes?: string | null
          migration_assistance_level?: string | null
          migration_current_domain?: string | null
          migration_current_host?: string | null
          migration_has_access?: boolean | null
          migration_site_type?: string | null
          needs_brand_creation?: boolean | null
          needs_migration?: boolean | null
          onboarding_status?: string
          phone_landline?: string | null
          preferred_color?: string | null
          selected_plan?: string
          show_address?: boolean | null
          site_expectations?: string | null
          stripe_session_id?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
          youtube?: string | null
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          client_id: string
          cloud_drive_url: string | null
          cpanel_login: string | null
          cpanel_password: string | null
          cpanel_url: string | null
          created_at: string
          dns_record_1: string | null
          dns_record_2: string | null
          domain: string | null
          domain_notes: string | null
          domain_status: string | null
          id: string
          name: string
          notes: string | null
          plan: string | null
          server_ip: string | null
          site_access_login: string | null
          site_access_password: string | null
          site_access_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          cloud_drive_url?: string | null
          cpanel_login?: string | null
          cpanel_password?: string | null
          cpanel_url?: string | null
          created_at?: string
          dns_record_1?: string | null
          dns_record_2?: string | null
          domain?: string | null
          domain_notes?: string | null
          domain_status?: string | null
          id?: string
          name: string
          notes?: string | null
          plan?: string | null
          server_ip?: string | null
          site_access_login?: string | null
          site_access_password?: string | null
          site_access_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          cloud_drive_url?: string | null
          cpanel_login?: string | null
          cpanel_password?: string | null
          cpanel_url?: string | null
          created_at?: string
          dns_record_1?: string | null
          dns_record_2?: string | null
          domain?: string | null
          domain_notes?: string | null
          domain_status?: string | null
          id?: string
          name?: string
          notes?: string | null
          plan?: string | null
          server_ip?: string | null
          site_access_login?: string | null
          site_access_password?: string | null
          site_access_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cookie_consent_logs: {
        Row: {
          analytics: boolean
          browser_name: string | null
          browser_version: string | null
          consent_type: string
          country: string | null
          created_at: string
          device_type: string | null
          essential: boolean
          id: string
          ip_hash: string | null
          marketing: boolean
          os_name: string | null
          page_url: string | null
          pages_visited: number | null
          preferences: boolean
          referrer_url: string | null
          region: string | null
          session_id: string | null
          time_on_site_seconds: number | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          analytics?: boolean
          browser_name?: string | null
          browser_version?: string | null
          consent_type: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          essential?: boolean
          id?: string
          ip_hash?: string | null
          marketing?: boolean
          os_name?: string | null
          page_url?: string | null
          pages_visited?: number | null
          preferences?: boolean
          referrer_url?: string | null
          region?: string | null
          session_id?: string | null
          time_on_site_seconds?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          analytics?: boolean
          browser_name?: string | null
          browser_version?: string | null
          consent_type?: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          essential?: boolean
          id?: string
          ip_hash?: string | null
          marketing?: boolean
          os_name?: string | null
          page_url?: string | null
          pages_visited?: number | null
          preferences?: boolean
          referrer_url?: string | null
          region?: string | null
          session_id?: string | null
          time_on_site_seconds?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      cookie_definitions: {
        Row: {
          category: string
          created_at: string | null
          duration: string
          id: string
          is_active: boolean
          name: string
          purpose: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          duration?: string
          id?: string
          is_active?: boolean
          name: string
          purpose: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          duration?: string
          id?: string
          is_active?: boolean
          name?: string
          purpose?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      deletion_verification_codes: {
        Row: {
          client_id: string
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          used: boolean | null
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          used?: boolean | null
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      design_deliveries: {
        Row: {
          created_at: string | null
          delivery_notes: string | null
          id: string
          order_id: string
          status: string
          updated_at: string | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          delivery_notes?: string | null
          id?: string
          order_id: string
          status?: string
          updated_at?: string | null
          version_number: number
        }
        Update: {
          created_at?: string | null
          delivery_notes?: string | null
          id?: string
          order_id?: string
          status?: string
          updated_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "design_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      design_delivery_files: {
        Row: {
          created_at: string | null
          delivery_id: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string | null
          delivery_id: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string | null
          delivery_id?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_delivery_files_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "design_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      design_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          delivery_id: string
          feedback_type: string
          id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          delivery_id: string
          feedback_type: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          delivery_id?: string
          feedback_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_feedback_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "design_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      design_orders: {
        Row: {
          brand_colors: string | null
          brand_files: string[] | null
          briefing_data: Json | null
          briefing_type: string | null
          client_id: string
          created_at: string | null
          has_brand_identity: boolean | null
          id: string
          inspiration_urls: string[] | null
          logo_description: string | null
          max_revisions: number | null
          notes: string | null
          package_id: string
          payment_status: string | null
          preferred_color: string | null
          project_id: string | null
          reference_files: string[] | null
          revisions_used: number | null
          status: string
          stripe_session_id: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          brand_colors?: string | null
          brand_files?: string[] | null
          briefing_data?: Json | null
          briefing_type?: string | null
          client_id: string
          created_at?: string | null
          has_brand_identity?: boolean | null
          id?: string
          inspiration_urls?: string[] | null
          logo_description?: string | null
          max_revisions?: number | null
          notes?: string | null
          package_id: string
          payment_status?: string | null
          preferred_color?: string | null
          project_id?: string | null
          reference_files?: string[] | null
          revisions_used?: number | null
          status?: string
          stripe_session_id?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_colors?: string | null
          brand_files?: string[] | null
          briefing_data?: Json | null
          briefing_type?: string | null
          client_id?: string
          created_at?: string | null
          has_brand_identity?: boolean | null
          id?: string
          inspiration_urls?: string[] | null
          logo_description?: string | null
          max_revisions?: number | null
          notes?: string | null
          package_id?: string
          payment_status?: string | null
          preferred_color?: string | null
          project_id?: string | null
          reference_files?: string[] | null
          revisions_used?: number | null
          status?: string
          stripe_session_id?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_packages: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          estimated_days: number | null
          id: string
          includes: string[] | null
          is_active: boolean | null
          is_bundle: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_days?: number | null
          id: string
          includes?: string[] | null
          is_active?: boolean | null
          is_bundle?: boolean | null
          name: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_days?: number | null
          id?: string
          includes?: string[] | null
          is_active?: boolean | null
          is_bundle?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "design_service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      design_service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          resend_id: string | null
          status: string
          subject: string
          template_name: string | null
          template_slug: string | null
          triggered_by: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          resend_id?: string | null
          status?: string
          subject: string
          template_name?: string | null
          template_slug?: string | null
          triggered_by?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          resend_id?: string | null
          status?: string
          subject?: string
          template_name?: string | null
          template_slug?: string | null
          triggered_by?: string
          variables?: Json | null
        }
        Relationships: []
      }
      help_article_feedback: {
        Row: {
          article_id: string
          created_at: string
          id: string
          is_helpful: boolean
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          is_helpful: boolean
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          is_helpful?: boolean
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category_id: string
          content: string
          created_at: string
          display_order: number | null
          excerpt: string | null
          id: string
          is_published: boolean | null
          keywords: string | null
          meta_description: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          slug: string
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          category_id: string
          content?: string
          created_at?: string
          display_order?: number | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          keywords?: string | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          slug: string
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string
          display_order?: number | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          keywords?: string | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_content: {
        Row: {
          content: string | null
          id: string
          metadata: Json | null
          section_key: string
          subtitle: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          metadata?: Json | null
          section_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          metadata?: Json | null
          section_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      media_files: {
        Row: {
          category: string | null
          created_at: string
          display_name: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          display_name: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          display_name?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      migration_messages: {
        Row: {
          admin_id: string | null
          attachment_name: string | null
          attachment_url: string | null
          client_id: string | null
          created_at: string
          id: string
          message: string
          migration_id: string
          sender_type: string
        }
        Insert: {
          admin_id?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          message: string
          migration_id: string
          sender_type?: string
        }
        Update: {
          admin_id?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string
          migration_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_messages_migration_id_fkey"
            columns: ["migration_id"]
            isOneToOne: false
            referencedRelation: "migration_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_requests: {
        Row: {
          additional_info: string | null
          assigned_to: string | null
          client_notes: string | null
          created_at: string
          current_domain: string
          current_host: string | null
          email: string
          id: string
          name: string
          notes: string | null
          payment_status: string
          site_type: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          additional_info?: string | null
          assigned_to?: string | null
          client_notes?: string | null
          created_at?: string
          current_domain: string
          current_host?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          payment_status?: string
          site_type?: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          additional_info?: string | null
          assigned_to?: string | null
          client_notes?: string | null
          created_at?: string
          current_domain?: string
          current_host?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          payment_status?: string
          site_type?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          created_by: string | null
          dedup_key: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          metadata: Json | null
          processed_at: string | null
          recipients: string[]
          status: string | null
          template_slug: string
          variables: Json | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          created_by?: string | null
          dedup_key?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          processed_at?: string | null
          recipients: string[]
          status?: string | null
          template_slug: string
          variables?: Json | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          created_by?: string | null
          dedup_key?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          processed_at?: string | null
          recipients?: string[]
          status?: string | null
          template_slug?: string
          variables?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_seo: {
        Row: {
          created_at: string | null
          id: string
          keywords: string | null
          meta_description: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_key: string
          page_name: string
          page_route: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          keywords?: string | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_key: string
          page_name: string
          page_route: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          keywords?: string | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_key?: string
          page_name?: string
          page_route?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      processed_webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_credentials: {
        Row: {
          created_at: string
          credential_type: string
          id: string
          label: string
          notes: string | null
          password: string | null
          project_id: string
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          credential_type: string
          id?: string
          label: string
          notes?: string | null
          password?: string | null
          project_id: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          credential_type?: string
          id?: string
          label?: string
          notes?: string | null
          password?: string | null
          project_id?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          project_id: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          project_id: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          project_id?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_email_templates: {
        Row: {
          copy_to_admins: boolean | null
          created_at: string | null
          description: string | null
          html_template: string
          id: string
          is_active: boolean | null
          name: string
          sender_email: string | null
          sender_name: string | null
          slug: string
          subject: string
          trigger: string
          updated_at: string | null
        }
        Insert: {
          copy_to_admins?: boolean | null
          created_at?: string | null
          description?: string | null
          html_template: string
          id?: string
          is_active?: boolean | null
          name: string
          sender_email?: string | null
          sender_name?: string | null
          slug: string
          subject: string
          trigger: string
          updated_at?: string | null
        }
        Update: {
          copy_to_admins?: boolean | null
          created_at?: string | null
          description?: string | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sender_email?: string | null
          sender_name?: string | null
          slug?: string
          subject?: string
          trigger?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "project_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_messages: {
        Row: {
          admin_id: string | null
          client_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          project_id: string | null
          read_at: string | null
          sender_type: string
        }
        Insert: {
          admin_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string
          project_id?: string | null
          read_at?: string | null
          sender_type?: string
        }
        Update: {
          admin_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          project_id?: string | null
          read_at?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
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
      user_subscriptions: {
        Row: {
          billing_type: string | null
          current_period_end: string | null
          id: string
          one_time_expiry: string | null
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_type?: string | null
          current_period_end?: string | null
          id?: string
          one_time_expiry?: string | null
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_type?: string | null
          current_period_end?: string | null
          id?: string
          one_time_expiry?: string | null
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project_features: {
        Args: { _user_id: string }
        Returns: boolean
      }
      cleanup_old_notification_queue: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      get_admin_user_ids: { Args: never; Returns: string[] }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
