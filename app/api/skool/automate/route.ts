import { NextResponse } from 'next/server'
import { chromium } from 'playwright'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, password, keywords, message, action, testMode, recipient, keyword } = await request.json()
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // Verify the session and get user in one step
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // Store session cookies in Supabase
    const storeCookies = async (cookies: any[]) => {
      await supabase
        .from('skool_session')
        .upsert({
          user_id: user.id,
          cookies: JSON.stringify(cookies),
          updated_at: new Date().toISOString()
        })
    }

    // Get stored cookies if they exist
    const { data: sessionData } = await supabase
      .from('skool_session')
      .select('cookies')
      .eq('user_id', user.id)
      .single()

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    
    // Restore cookies if they exist
    if (sessionData?.cookies) {
      await context.addCookies(JSON.parse(sessionData.cookies))
    }

    const page = await context.newPage()

    // Only perform login if we don't have valid cookies
    if (!sessionData?.cookies) {
      try {
        console.log('Starting Skool login process...')
        
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
          throw new Error('Failed to save Skool credentials')
        }
        
        // Clear any existing cookies
        console.log('Clearing existing cookies...')
        await context.clearCookies()
        
        // Set up the page with proper timeouts
        console.log('Setting up page...')
        page.setDefaultNavigationTimeout(30000)
        page.setDefaultTimeout(30000)

        // Navigate to Skool login page
        console.log('Navigating to Skool login page...')
        await page.goto('https://www.skool.com/login', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })

        // Wait for and fill in the login form
        console.log('Waiting for login form...')
        await page.waitForSelector('input[name="email"]', { timeout: 10000 })
        await page.fill('input[name="email"]', email)
        await page.fill('input[type="password"]', password)

        // Click the login button and wait for navigation
        console.log('Submitting login form...')
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
        ])

        // Verify we're logged in by checking for dashboard elements
        console.log('Verifying login...')
        const isLoggedIn = await page.evaluate(() => {
          return document.querySelector('[data-testid="dashboard"]') !== null ||
                 document.querySelector('nav[aria-label="Main navigation"]') !== null
        })

        if (!isLoggedIn) {
          throw new Error('Failed to log in to Skool. Please check your credentials.')
        }

        console.log('Login successful, storing cookies...')
        const cookies = await context.cookies()
        await storeCookies(cookies)

        // Close the browser
        await browser.close()

        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to Skool' 
        })
      } catch (error) {
        console.error('Login error:', error)
        await browser.close()
        return NextResponse.json({ 
          error: 'Failed to login to Skool. Please check your credentials and try again.',
          details: error.message
        }, { status: 401 })
      }
    }

    // If action is just connect, verify we have valid cookies
    if (action === 'connect') {
      try {
        // Verify the cookies are still valid
        const page = await context.newPage()
        await page.goto('https://www.skool.com/dashboard', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000
        })

        const isLoggedIn = await page.evaluate(() => {
          return document.querySelector('[data-testid="dashboard"]') !== null ||
                 document.querySelector('nav[aria-label="Main navigation"]') !== null
        })

        if (!isLoggedIn) {
          throw new Error('Session expired. Please log in again.')
        }

        await browser.close()
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to Skool' 
        })
      } catch (error) {
        console.error('Session verification error:', error)
        await browser.close()
        return NextResponse.json({ 
          error: 'Session expired. Please log in again.',
          details: error.message
        }, { status: 401 })
      }
    }

    // Function to send DM and track it
    const sendDM = async (recipientName: string, keyword: string, postId?: string, commentId?: string) => {
      try {
        // Check if DM was already sent
        const { data: existingDM } = await supabase
          .from('sent_dms')
          .select('*')
          .eq('user_id', user.id)
          .eq('recipient_name', recipientName)
          .eq('keyword', keyword)
          .single()

        if (existingDM) {
          await supabase.from('skool_activity').insert({
            user_id: user.id,
            action: 'dm_skip',
            status: 'info',
            details: `Skipping DM to ${recipientName} for keyword "${keyword}" - already sent`
          })
          return
        }

        // Record DM attempt
        const { data: dmRecord } = await supabase
          .from('sent_dms')
          .insert({
            user_id: user.id,
            recipient_name: recipientName,
            message,
            keyword,
            post_id: postId,
            comment_id: commentId,
            status: 'pending'
          })
          .select()
          .single()

        if (!dmRecord) {
          throw new Error('Failed to create DM record')
        }

        // In test mode, just log the attempt
        if (testMode) {
          await supabase
            .from('sent_dms')
            .update({ status: 'tested' })
            .eq('id', dmRecord.id)

          await supabase.from('skool_activity').insert({
            user_id: user.id,
            action: 'dm_test',
            status: 'success',
            details: `Test DM to ${recipientName} for keyword "${keyword}"`
          })
          return
        }

        // Send actual DM
        await page.goto(`https://www.skool.com/messages/new`)
        await page.waitForSelector('[data-testid="message-recipient"]')
        await page.fill('[data-testid="message-recipient"]', recipientName)
        await page.waitForTimeout(1000) // Wait for search results
        
        // Click the first search result
        await page.click('[data-testid="search-result"]')
        
        // Fill in the message
        await page.waitForSelector('[data-testid="message-input"]')
        await page.fill('[data-testid="message-input"]', message)
        
        // Send the message
        await page.click('[data-testid="send-message"]')
        
        // Wait for confirmation
        await page.waitForSelector('[data-testid="message-sent"]', { timeout: 5000 })
        
        // Update DM record
        await supabase
          .from('sent_dms')
          .update({ status: 'sent' })
          .eq('id', dmRecord.id)

        // Log the DM
        await supabase.from('skool_activity').insert({
          user_id: user.id,
          action: 'dm_sent',
          status: 'success',
          details: `Sent DM to ${recipientName} for keyword "${keyword}"`
        })
      } catch (error) {
        console.error('Error sending DM:', error)
        await supabase.from('skool_activity').insert({
          user_id: user.id,
          action: 'dm_error',
          status: 'error',
          details: `Error sending DM to ${recipientName}: ${error.message}`
        })
      }
    }

    if (action === 'test_dm') {
      // Send test DM to specific user
      await sendDM(recipient, keyword)
      
      await browser.close()
      return NextResponse.json({ 
        success: true, 
        message: 'Test DM sent successfully',
        testMode
      })
    }

    if (action === 'monitor') {
      // Navigate to the community page
      await page.goto('https://www.skool.com/community')

      // Function to check for new comments with keywords
      const checkForNewComments = async () => {
        try {
          // Get all posts on the page
          const posts = await page.$$('[data-testid="post"]')
          
          for (const post of posts) {
            try {
              // Get post content and ID
              const postId = await post.getAttribute('data-post-id')
              const content = await post.$eval('[data-testid="post-content"]', el => el.textContent)
              
              // Log post content for debugging
              await supabase.from('skool_activity').insert({
                user_id: user.id,
                action: 'post_check',
                status: 'info',
                details: `Checking post ${postId}: ${content?.substring(0, 100)}...`
              })
              
              // Check if post contains any keywords
              const matchingKeywords = keywords.filter(keyword => 
                content?.toLowerCase().includes(keyword.toLowerCase())
              )
              
              if (matchingKeywords.length > 0) {
                // Get comments
                const comments = await post.$$('[data-testid="comment"]')
                
                for (const comment of comments) {
                  try {
                    const commentId = await comment.getAttribute('data-comment-id')
                    const commentText = await comment.$eval('[data-testid="comment-text"]', el => el.textContent)
                    const commenterName = await comment.$eval('[data-testid="comment-author"]', el => el.textContent)
                    
                    // Log comment content for debugging
                    await supabase.from('skool_activity').insert({
                      user_id: user.id,
                      action: 'comment_check',
                      status: 'info',
                      details: `Checking comment ${commentId} by ${commenterName}: ${commentText?.substring(0, 100)}...`
                    })
                    
                    // Check if comment contains any matching keywords
                    for (const keyword of matchingKeywords) {
                      if (commentText?.toLowerCase().includes(keyword.toLowerCase())) {
                        // Send DM for this keyword match
                        await sendDM(commenterName!, keyword, postId!, commentId!)
                      }
                    }
                  } catch (error) {
                    console.error('Error processing comment:', error)
                    await supabase.from('skool_activity').insert({
                      user_id: user.id,
                      action: 'comment_error',
                      status: 'error',
                      details: `Error processing comment: ${error.message}`
                    })
                  }
                }
              }
            } catch (error) {
              console.error('Error processing post:', error)
              await supabase.from('skool_activity').insert({
                user_id: user.id,
                action: 'post_error',
                status: 'error',
                details: `Error processing post: ${error.message}`
              })
            }
          }
        } catch (error) {
          console.error('Error checking comments:', error)
          await supabase.from('skool_activity').insert({
            user_id: user.id,
            action: 'check_error',
            status: 'error',
            details: `Error checking comments: ${error.message}`
          })
        }
      }

      // Initial check
      await checkForNewComments()

      // Set up polling
      setInterval(async () => {
        await page.reload()
        await checkForNewComments()
      }, 30000) // Check every 30 seconds

      return NextResponse.json({ 
        success: true, 
        message: 'Monitoring started successfully',
        testMode
      })
    }

    await browser.close()
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Automation error:', error)
    return NextResponse.json({ 
      error: error.message || 'An error occurred during automation' 
    }, { status: 500 })
  }
} 