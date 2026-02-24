#!/usr/bin/env node

/**
 * Standalone Local Server for testing
 * Runs on port 34567 to receive streams from extension
 */

import http from 'http'

const PORT = 34567
const HOST = 'localhost'

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = req.url || '/'

  // Health check
  if (url === '/api/health' && req.method === 'GET') {
    console.log('✅ Health check received')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      success: true, 
      message: 'OK',
      timestamp: new Date().toISOString()
    }))
    return
  }

  // Receive stream
  if (url === '/api/stream' && req.method === 'POST') {
    let body = ''
    
    req.on('data', chunk => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        console.log('📥 Received stream:')
        console.log('   URL:', data.data?.url)
        console.log('   Type:', data.data?.type)
        console.log('   Title:', data.data?.title)
        console.log('')
        
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Stream received',
          data: data.data
        }))
      } catch (error) {
        console.error('❌ Error parsing body:', error.message)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }))
      }
    })
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }))
    })
    
    return
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(PORT, HOST, () => {
  console.log('')
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║   🚀 Stream Downloader - Test Server                  ║')
  console.log('╠════════════════════════════════════════════════════════╣')
  console.log(`║   📡 Running on http://${HOST}:${PORT}                      ║`)
  console.log('║   ✅ Health: GET  /api/health                          ║')
  console.log('║   ✅ Stream: POST /api/stream                          ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('')
  console.log('Waiting for streams from extension...')
  console.log('')
})

process.on('SIGINT', () => {
  console.log('')
  console.log('👋 Server shutting down...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
