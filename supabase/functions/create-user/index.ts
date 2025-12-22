import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, user_metadata } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: user_metadata
    })

    if (error) {
      console.error('Error creating user:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      )
    }

    return new Response(
      JSON.stringify({ user: data.user }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})