import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_id, full_name, email, password } = body

    // Validate input
    if (!business_id || !email || !password) {
      console.error('Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if business exists
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name')
      .eq('id', business_id)
      .single()

    if (businessError || !business) {
      console.error('Business not found:', business_id)
      return NextResponse.json(
        { error: 'Business not found. Please create business first.' },
        { status: 404 }
      )
    }

    // First, try to sign in (check if user exists)
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (!signInError && signInData.user) {
      // User exists and password is correct
      const userId = signInData.user.id
      // Check if user is already linked to this business
      const { data: existingLink } = await supabaseAdmin
        .from('business_users')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', business_id)
        .single()

      if (existingLink) {
        return NextResponse.json({
          user_id: userId,
          email: email,
          isNew: false
        })
      }

      // Link existing user to business
      const { error: linkError } = await supabaseAdmin
        .from('business_users')
        .insert([{
          business_id,
          user_id: userId,
          role: 'owner'
        }])

      if (linkError) {
        console.error('Link error:', linkError.message)
        throw new Error(linkError.message)
      }

      return NextResponse.json({
        user_id: userId,
        email: email,
        isNew: false
      })
    }

    // User doesn't exist or wrong password, try to create
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      
      // Handle specific error cases
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Email already registered. Please use a different email or login.' },
          { status: 409 }
        )
      }
      
      if (authError.message?.includes('Invalid token') || authError.message?.includes('permission')) {
        // Fallback: Use regular signup instead of admin.createUser
        const { data: signupData, error: signupError } = await supabaseAdmin.auth.signUp({
          email,
          password,
          options: {
            data: { full_name }
          }
        })
        
        if (signupError) {
          throw new Error(signupError.message)
        }
        
        if (signupData.user) {
          const userId = signupData.user.id

          // Link user to business
          const { error: linkError } = await supabaseAdmin
            .from('business_users')
            .insert([{
              business_id,
              user_id: userId,
              role: 'owner'
            }])
          
          if (linkError) {
            console.error('Link error:', linkError.message)
          }
          
          return NextResponse.json({
            user_id: userId,
            email: email,
            isNew: true
          })
        }
      }
      
      throw new Error(authError.message)
    }

    const userId = authData.user.id

    // Link user to business
    const { error: userError } = await supabaseAdmin
      .from('business_users')
      .insert([{
        business_id,
        user_id: userId,
        role: 'owner'
      }])

    if (userError) {
      console.error('Business user error:', userError.message)
      throw new Error(userError.message)
    }

    return NextResponse.json({
      user_id: userId,
      email: email,
      isNew: true
    })
  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}
