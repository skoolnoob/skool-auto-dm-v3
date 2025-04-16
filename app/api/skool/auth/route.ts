import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { chromium } from 'playwright'

export async function POST(request: Request) {
  console.log('Starting Skool auth process...')
  
  try {
    const { email, password } = await request.json()
    console.log('Received credentials for email:', email)
    
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get the session from the request headers
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found')
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Verifying session token...')
    
    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      console.error('User verification failed:', userError)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    console.log('User verified:', user.id)
    
    // First, save the credentials
    console.log('Saving Skool credentials...')
    const { error: saveError } = await supabase
      .from('skool_credentials')
      .upsert({
        user_id: user.id,
        email,
        password
      })

    if (saveError) {
      console.error('Failed to save credentials:', saveError)
      throw new Error('Failed to save Skool credentials')
    }

    console.log('Credentials saved successfully')

    console.log('Launching browser...')
    let browser
    try {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      console.log('Browser launched successfully')
    } catch (error) {
      console.error('Failed to launch browser:', error)
      throw new Error('Failed to start browser. Please try again.')
    }

    console.log('Creating new browser context...')
    let context
    try {
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      console.log('Browser context created successfully')
    } catch (error) {
      console.error('Failed to create browser context:', error)
      await browser.close()
      throw new Error('Failed to create browser context. Please try again.')
    }

    console.log('Creating new page...')
    let page
    try {
      page = await context.newPage()
      console.log('Page created successfully')
    } catch (error) {
      console.error('Failed to create page:', error)
      await browser.close()
      throw new Error('Failed to create page. Please try again.')
    }

    try {
      // Set up the page with proper timeouts
      console.log('Setting up page with timeouts...')
      page.setDefaultNavigationTimeout(60000)
      page.setDefaultTimeout(60000)

      // Navigate to Skool login page
      console.log('Navigating to Skool login page...')
      try {
        const response = await page.goto('https://www.skool.com/login', { 
          waitUntil: 'networkidle',
          timeout: 60000
        })
        
        if (!response) {
          throw new Error('No response received from Skool login page')
        }
        
        console.log('Navigation response status:', response.status())
        if (!response.ok()) {
          throw new Error(`Failed to load Skool login page: ${response.status()} ${response.statusText()}`)
        }
        
        console.log('Successfully navigated to Skool login page')
      } catch (error) {
        console.error('Navigation error:', error)
        throw new Error('Failed to navigate to Skool login page. Please try again.')
      }

      // Wait for the page to be fully loaded
      console.log('Waiting for page to be fully loaded...')
      try {
        await page.waitForLoadState('networkidle')
        console.log('Page loaded successfully')
      } catch (error) {
        console.error('Page load error:', error)
        throw new Error('Failed to load Skool login page. Please try again.')
      }

      // Check if we're already logged in
      console.log('Checking if already logged in...')
      const isAlreadyLoggedIn = await page.evaluate(() => {
        return document.querySelector('[data-testid="dashboard"]') !== null ||
               document.querySelector('nav[aria-label="Main navigation"]') !== null ||
               window.location.href.includes('/dashboard')
      })

      if (isAlreadyLoggedIn) {
        console.log('Already logged in, storing cookies...')
        const cookies = await context.cookies()
        
        // Store cookies in Supabase
        const { error: cookieError } = await supabase
          .from('skool_session')
          .upsert({
            user_id: user.id,
            cookies: JSON.stringify(cookies),
            updated_at: new Date().toISOString()
          })

        if (cookieError) {
          console.error('Failed to store cookies:', cookieError)
          throw new Error('Failed to store session cookies')
        }

        console.log('Session stored successfully')
        await browser.close()
        
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to Skool' 
        })
      }

      // Try multiple selectors for the email input
      console.log('Looking for email input field...')
      const emailSelectors = [
        'input[name="email"]',
        'input[type="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]'
      ]

      let emailInput = null
      for (const selector of emailSelectors) {
        try {
          emailInput = await page.waitForSelector(selector, { timeout: 10000 })
          if (emailInput) {
            console.log(`Found email input with selector: ${selector}`)
            break
          }
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`)
        }
      }

      if (!emailInput) {
        console.error('Could not find email input field')
        throw new Error('Could not find login form. Please try again.')
      }

      // Try multiple selectors for the password input
      console.log('Looking for password input field...')
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="password" i]',
        'input[placeholder*="Password" i]'
      ]

      let passwordInput = null
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await page.waitForSelector(selector, { timeout: 10000 })
          if (passwordInput) {
            console.log(`Found password input with selector: ${selector}`)
            break
          }
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`)
        }
      }

      if (!passwordInput) {
        console.error('Could not find password input field')
        throw new Error('Could not find login form. Please try again.')
      }

      // Fill in the credentials
      console.log('Filling in credentials...')
      await emailInput.fill(email)
      await passwordInput.fill(password)

      // Try multiple selectors for the submit button
      console.log('Looking for submit button...')
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Login")',
        'button:has-text("Log in")',
        'form button',
        'form input[type="submit"]'
      ]

      let submitButton = null
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.waitForSelector(selector, { timeout: 10000 })
          if (submitButton) {
            console.log(`Found submit button with selector: ${selector}`)
            break
          }
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`)
        }
      }

      if (!submitButton) {
        console.error('Could not find submit button')
        throw new Error('Could not find login button. Please try again.')
      }

      // Click the login button and handle navigation
      console.log('Submitting login form...')
      try {
        // First try clicking the button
        await submitButton.click()
        
        // Wait for either navigation or a potential error message
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
          page.waitForSelector('.error-message, [role="alert"], .alert-error', { timeout: 10000 })
        ])

        // Check for error messages
        const errorMessage = await page.evaluate(() => {
          const errorElements = [
            document.querySelector('.error-message'),
            document.querySelector('[role="alert"]'),
            document.querySelector('.alert-error'),
            document.querySelector('form .error')
          ].filter(el => el !== null)
          
          return errorElements.length > 0 ? errorElements[0].textContent : null
        })

        if (errorMessage) {
          console.error('Login error message found:', errorMessage)
          throw new Error(`Login failed: ${errorMessage}`)
        }

        // Verify we're logged in by checking multiple indicators
        console.log('Verifying login status...')
        const isLoggedIn = await page.evaluate(() => {
          // Check for dashboard elements
          const dashboardElements = [
            '[data-testid="dashboard"]',
            'nav[aria-label="Main navigation"]',
            '[data-testid="user-menu"]',
            '.dashboard',
            'a[href*="/dashboard"]',
            'a[href*="/profile"]'
          ]

          // Check URL
          const url = window.location.href
          const isDashboardUrl = url.includes('/dashboard') || 
                               url.includes('/home') || 
                               url.includes('/profile')

          // Check for any of the dashboard elements
          const hasDashboardElement = dashboardElements.some(selector => 
            document.querySelector(selector) !== null
          )

          return isDashboardUrl || hasDashboardElement
        })

        if (!isLoggedIn) {
          console.error('Login verification failed - not on dashboard')
          throw new Error('Failed to log in to Skool. Please check your credentials.')
        }

        console.log('Login successful, storing cookies...')
        const cookies = await context.cookies()
        
        // Store cookies in Supabase
        const { error: cookieError } = await supabase
          .from('skool_session')
          .upsert({
            user_id: user.id,
            cookies: JSON.stringify(cookies),
            updated_at: new Date().toISOString()
          })

        if (cookieError) {
          console.error('Failed to store cookies:', cookieError)
          throw new Error('Failed to store session cookies')
        }

        console.log('Session stored successfully')
        await browser.close()
        
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to Skool' 
        })
      } catch (error) {
        console.error('Login submission error:', error)
        throw new Error('Failed to submit login form. Please try again.')
      }
    } catch (error) {
      console.error('Login process error:', error)
      await browser.close()
      return NextResponse.json({ 
        error: 'Failed to login to Skool. Please check your credentials and try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 401 })
    }
  } catch (error) {
    console.error('Skool auth error:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    return NextResponse.json(
      { 
        error: 'Failed to authenticate with Skool. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 