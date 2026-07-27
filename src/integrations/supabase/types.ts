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
      clients: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          complemento: string | null
          contato_nome: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          phone: string | null
          razao_social: string
          tipo: Database["public"]["Enums"]["client_type"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          phone?: string | null
          razao_social: string
          tipo?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          phone?: string | null
          razao_social?: string
          tipo?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          condicao_pagamento_padrao: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          logo_url: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes_padrao: string | null
          phone: string | null
          razao_social: string | null
          updated_at: string
          validade_padrao_dias: number
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicao_pagamento_padrao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_padrao?: string | null
          phone?: string | null
          razao_social?: string | null
          updated_at?: string
          validade_padrao_dias?: number
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicao_pagamento_padrao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_padrao?: string | null
          phone?: string | null
          razao_social?: string | null
          updated_at?: string
          validade_padrao_dias?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      machines: {
        Row: {
          ano: number | null
          client_id: string | null
          created_at: string
          foto_url: string | null
          horimetro: number | null
          id: string
          km: number | null
          marca: string
          modelo: string
          numero_serie: string | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          client_id?: string | null
          created_at?: string
          foto_url?: string | null
          horimetro?: number | null
          id?: string
          km?: number | null
          marca: string
          modelo: string
          numero_serie?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          client_id?: string | null
          created_at?: string
          foto_url?: string | null
          horimetro?: number | null
          id?: string
          km?: number | null
          marca?: string
          modelo?: string
          numero_serie?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string | null
          created_at: string
          descricao: string
          estoque: number
          id: string
          marca: string | null
          observacoes: string | null
          preco_custo: number | null
          preco_venda: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao: string
          estoque?: number
          id?: string
          marca?: string | null
          observacoes?: string | null
          preco_custo?: number | null
          preco_venda?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string
          estoque?: number
          id?: string
          marca?: string | null
          observacoes?: string | null
          preco_custo?: number | null
          preco_venda?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          condicao_pagamento_padrao: string | null
          created_at: string
          email: string
          empresa_nome: string | null
          endereco: string | null
          estado: string | null
          facebook: string | null
          full_name: string
          id: string
          instagram: string | null
          linkedin: string | null
          logo_url: string | null
          mensagem_padrao: string | null
          nome_pdf: string | null
          observacao_padrao: string | null
          phone: string | null
          phone_comercial: string | null
          pix_key: string | null
          prazo_entrega_padrao: string | null
          signature_url: string | null
          site: string | null
          updated_at: string
          validade_padrao_dias: number | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          condicao_pagamento_padrao?: string | null
          created_at?: string
          email: string
          empresa_nome?: string | null
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          full_name?: string
          id: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          mensagem_padrao?: string | null
          nome_pdf?: string | null
          observacao_padrao?: string | null
          phone?: string | null
          phone_comercial?: string | null
          pix_key?: string | null
          prazo_entrega_padrao?: string | null
          signature_url?: string | null
          site?: string | null
          updated_at?: string
          validade_padrao_dias?: number | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          condicao_pagamento_padrao?: string | null
          created_at?: string
          email?: string
          empresa_nome?: string | null
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          mensagem_padrao?: string | null
          nome_pdf?: string | null
          observacao_padrao?: string | null
          phone?: string | null
          phone_comercial?: string | null
          pix_key?: string | null
          prazo_entrega_padrao?: string | null
          signature_url?: string | null
          site?: string | null
          updated_at?: string
          validade_padrao_dias?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          codigo: string | null
          codigo_interno: string | null
          desconto_percentual: number
          descricao: string | null
          id: string
          marca: string | null
          ordem: number
          preco_unitario: number
          product_id: string | null
          quantidade: number
          quote_id: string
          total: number
        }
        Insert: {
          codigo?: string | null
          codigo_interno?: string | null
          desconto_percentual?: number
          descricao?: string | null
          id?: string
          marca?: string | null
          ordem?: number
          preco_unitario?: number
          product_id?: string | null
          quantidade?: number
          quote_id: string
          total?: number
        }
        Update: {
          codigo?: string | null
          codigo_interno?: string | null
          desconto_percentual?: number
          descricao?: string | null
          id?: string
          marca?: string | null
          ordem?: number
          preco_unitario?: number
          product_id?: string | null
          quantidade?: number
          quote_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          client_id: string
          condicao_pagamento: string | null
          created_at: string
          data_emissao: string
          desconto_percentual: number
          desconto_valor: number
          frete: number
          id: string
          machine_id: string | null
          numero: number
          observacoes: string | null
          pdf_template: string
          prazo_entrega: string | null
          sales_rep_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tipo_frete: string | null
          total: number
          updated_at: string
          validade_dias: number
          vendedor_id: string
          vendedor_snapshot: Json | null
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          condicao_pagamento?: string | null
          created_at?: string
          data_emissao?: string
          desconto_percentual?: number
          desconto_valor?: number
          frete?: number
          id?: string
          machine_id?: string | null
          numero?: number
          observacoes?: string | null
          pdf_template?: string
          prazo_entrega?: string | null
          sales_rep_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tipo_frete?: string | null
          total?: number
          updated_at?: string
          validade_dias?: number
          vendedor_id: string
          vendedor_snapshot?: Json | null
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          condicao_pagamento?: string | null
          created_at?: string
          data_emissao?: string
          desconto_percentual?: number
          desconto_valor?: number
          frete?: number
          id?: string
          machine_id?: string | null
          numero?: number
          observacoes?: string | null
          pdf_template?: string
          prazo_entrega?: string | null
          sales_rep_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tipo_frete?: string | null
          total?: number
          updated_at?: string
          validade_dias?: number
          vendedor_id?: string
          vendedor_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          created_at: string
          email: string | null
          empresa_nome: string | null
          endereco: string | null
          estado: string | null
          facebook: string | null
          full_name: string | null
          id: string
          instagram: string | null
          is_default: boolean
          linkedin: string | null
          logo_url: string | null
          mensagem_padrao: string | null
          nome_pdf: string | null
          owner_id: string
          phone: string | null
          phone_comercial: string | null
          pix_key: string | null
          signature_url: string | null
          site: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_default?: boolean
          linkedin?: string | null
          logo_url?: string | null
          mensagem_padrao?: string | null
          nome_pdf?: string | null
          owner_id: string
          phone?: string | null
          phone_comercial?: string | null
          pix_key?: string | null
          signature_url?: string | null
          site?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_default?: boolean
          linkedin?: string | null
          logo_url?: string | null
          mensagem_padrao?: string | null
          nome_pdf?: string | null
          owner_id?: string
          phone?: string | null
          phone_comercial?: string | null
          pix_key?: string | null
          signature_url?: string | null
          site?: string | null
          updated_at?: string
          whatsapp?: string | null
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
      create_quote_with_items: { Args: { _payload: Json }; Returns: string }
      get_public_quote: { Args: { _quote_id: string }; Returns: Json }
      update_quote_with_items: {
        Args: { _payload: Json; _quote_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "vendedor"
      client_type: "juridica" | "fisica"
      quote_status:
        | "rascunho"
        | "enviado"
        | "aprovado"
        | "recusado"
        | "expirado"
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
      app_role: ["admin", "vendedor"],
      client_type: ["juridica", "fisica"],
      quote_status: ["rascunho", "enviado", "aprovado", "recusado", "expirado"],
    },
  },
} as const
