const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')
const mysql = require('mysql2/promise')
const winston = require('winston')

const bcrypt = require('bcryptjs')

// Setup structured logging with winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ''
          return `${timestamp} [${level}]: ${message} ${metaStr}`
        })
      )
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'data', 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
})

const app = express()
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const DATA_DIR = path.join(__dirname, 'data')
fs.ensureDirSync(DATA_DIR)

// Setup MariaDB connection pool
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_USER = process.env.DB_USER || 'finpro_user'
const DB_PASSWORD = process.env.DB_PASSWORD || 'finpro_pass'
const DB_NAME = process.env.DB_NAME || 'finpro'

let dbPool
(async () => {
  try {
    dbPool = await mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    })
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        filename VARCHAR(1024) NOT NULL,
        filepath VARCHAR(2048) NOT NULL,
        size BIGINT NOT NULL,
        uploaded_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)
    logger.info('DB pool ready', { host: DB_HOST, database: DB_NAME })
    
    // Log FTP server info
    const FTP_HOST = process.env.FTP_HOST || 'localhost'
    const FTP_PORT = process.env.FTP_PORT || '21'
    logger.info('FTP server available', { host: FTP_HOST, port: FTP_PORT, protocol: 'VSFTPD' })
  } catch (err) {
    logger.error('DB init error', { error: err.message, host: DB_HOST })
    // Middleware fallback jika DB gagal
    app.use((req, res, next) => {
      if (req.url.startsWith('/api')) {
        return res.status(503).json({ error: 'Database unavailable' })
      }
      next();
    });
  }
})()

// Auth middleware: validate DELETE_TOKEN for mutation endpoints
const AUTH_TOKEN = process.env.DELETE_TOKEN || 'dev-delete-token-123'
function requireDeleteAuth(req, res, next) {
  const provided = req.headers['x-delete-token'] || req.body?.deleteToken || req.query?.deleteToken
  if (!provided || provided !== AUTH_TOKEN) {
    logger.warn('Unauthorized DELETE attempt', { 
      ip: req.ip, 
      username: req.query.username,
      token_provided: !!provided 
    })
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }
  next()
}

// FTP Server monitoring - log FTP activity periodically
setInterval(() => {
  const FTP_HOST = process.env.FTP_HOST || 'localhost'
  const FTP_PORT = process.env.FTP_PORT || '21'
  logger.info('FTP connection check', { 
    host: FTP_HOST, 
    port: FTP_PORT, 
    protocol: 'VSFTPD',
    status: 'listening'
  })
}, 60000) // Every 60 seconds

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/ready', async (req, res) => {
  try {
    if (dbPool) {
      await dbPool.execute('SELECT 1')
      return res.json({ ready: true, timestamp: new Date().toISOString() })
    }
    res.status(503).json({ ready: false, message: 'DB not ready' })
  } catch (err) {
    logger.error('Readiness check failed', { error: err.message })
    res.status(503).json({ ready: false, error: err.message })
  }
})

// Informational endpoints
app.get('/api/dos', (req, res) => {
  res.json({
    title: 'DOS — Detection & Mitigation Overview',
    text: 'This endpoint provides safe, non-actionable guidance: how to detect, evidence to collect, and recommended mitigations such as rate limiting, WAF, and capacity planning.'
  })
})

app.get('/api/ftp', (req, res) => {
  res.json({
    title: 'Anonymous FTP — Discovery Summary',
    text: 'Anonymous FTP logins were discovered in scope. Recommended actions: disable anonymous access, audit uploaded files, and restrict permissions.'
  })
})

// Mock authentication endpoint

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.json({ ok: false, message: 'Username dan password wajib diisi' })
  if (!dbPool) return res.status(503).json({ ok: false, message: 'Database tidak tersedia' })
  try {
    // Cek apakah username sudah ada
    const [rows] = await dbPool.execute('SELECT id FROM accounts WHERE username = ?', [username])
    if (rows.length > 0) {
      return res.json({ ok: false, message: 'Username sudah terdaftar' })
    }
    // Hash password
    const hash = await bcrypt.hash(password, 10)
    await dbPool.execute('INSERT INTO accounts (username, password) VALUES (?, ?)', [username, hash])
    logger.info('Akun baru terdaftar', { username })
    return res.json({ ok: true, message: 'Registrasi berhasil' })
  } catch (err) {
    logger.error('Register error', { error: err.message })
    return res.status(500).json({ ok: false, message: 'Server error' })
  }
})

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.json({ ok: false, message: 'Username dan password wajib diisi' })
  if (!dbPool) return res.status(503).json({ ok: false, message: 'Database tidak tersedia' })
  try {
    const [rows] = await dbPool.execute('SELECT password FROM accounts WHERE username = ?', [username])
    if (rows.length === 0) {
      return res.json({ ok: false, message: 'Username tidak ditemukan' })
    }
    const hash = rows[0].password
    const match = await bcrypt.compare(password, hash)
    if (!match) {
      return res.json({ ok: false, message: 'Password salah' })
    }
    logger.info('User login', { username })
    return res.json({ ok: true, message: 'Login berhasil' })
  } catch (err) {
    logger.error('Login error', { error: err.message })
    return res.status(500).json({ ok: false, message: 'Server error' })
  }
})

// Setup multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({ storage })

// Handle OPTIONS request untuk upload
app.options('/api/upload', cors())

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const username = req.body.username || 'anonymous'
    const file = req.file
    if (!file) {
      logger.warn('Upload: No file provided', { username })
      return res.status(400).json({ ok: false, message: 'No file uploaded' })
    }

    logger.info('Upload start', { username, filename: file.originalname, size: file.size })
    const userDir = path.join(DATA_DIR, username)
    await fs.ensureDir(userDir)

    const safeName = path.basename(file.originalname)
    const outPath = path.join(userDir, safeName)
    await fs.writeFile(outPath, file.buffer)

    try {
      if (dbPool) {
        await dbPool.execute(
          'INSERT INTO files (username, filename, filepath, size, uploaded_at) VALUES (?, ?, ?, ?, ?)',
          [username, safeName, outPath, file.size, new Date()]
        )
      }
    } catch (dbErr) {
      logger.error('DB insert error', { username, filename: safeName, error: dbErr.message })
    }
    
    logger.info('File uploaded', { username, filename: safeName, size: file.size })
    res.json({ ok: true, message: 'File stored' })
  } catch (err) {
    logger.error('Upload failed', { username: req.body?.username, filename: req.file?.originalname, error: err.message, stack: err.stack })
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message })
  }
})

// List files for a username
app.get('/api/files', async (req, res) => {
  const username = req.query.username || 'anonymous'
  const userDir = path.join(DATA_DIR, username)
  try {
    if (dbPool) {
      try {
        const [rows] = await dbPool.execute('SELECT filename, filepath, size, uploaded_at FROM files WHERE username = ? ORDER BY uploaded_at DESC', [username])
        const files = rows.map(r => ({ filename: r.filename, size: Number(r.size), uploaded_at: (r.uploaded_at ? new Date(r.uploaded_at).toISOString() : null) }))
        return res.json({ files })
      } catch (dberr) {
        logger.error('DB select error', { username, error: dberr.message })
      }
    }

    const exists = await fs.pathExists(userDir)
    if (!exists) return res.json({ files: [] })
    const items = await fs.readdir(userDir)
    const files = await Promise.all(items.map(async (name) => {
      const p = path.join(userDir, name)
      try {
        const st = await fs.stat(p)
        return { filename: name, size: st.size, uploaded_at: st.mtime.toISOString() }
      } catch (e) {
        return { filename: name, size: 0, uploaded_at: null }
      }
    }))
    res.json({ files })
  } catch (err) {
    logger.error('File list error', { username, error: err.message })
    res.status(500).json({ files: [] })
  }
})

// Download a file
app.get('/api/download', (req, res) => {
  const username = req.query.username || 'anonymous'
  const filename = req.query.filename || ''
  if (!filename) return res.status(400).send('filename required')
  const filePath = path.join(DATA_DIR, username, path.basename(filename))
  if (!fs.pathExistsSync(filePath)) return res.status(404).send('Not found')
  res.download(filePath)
})

// Delete a file (remove from disk and DB) — requires auth token
app.delete('/api/file', requireDeleteAuth, async (req, res) => {
  try {
    const username = req.query.username || req.body?.username || 'anonymous'
    let provided = req.query.filename || req.body?.filename || ''
    if (!provided) return res.status(400).json({ ok: false, message: 'filename required' })

    let decoded = provided
    try {
      decoded = decodeURIComponent(provided)
    } catch (e) {
      decoded = provided
    }

    const safe = path.basename(decoded)
    const filePath = path.join(DATA_DIR, username, safe)

    if (!fs.pathExistsSync(filePath)) {
      logger.warn('Delete: file not found', { username, filename: safe })
      return res.status(404).json({ ok: false, message: 'Not found' })
    }

    await fs.remove(filePath)

    try {
      if (dbPool) {
        await dbPool.execute('DELETE FROM files WHERE username = ? AND filename = ?', [username, safe])
      }
    } catch (dberr) {
      logger.error('DB delete error', { username, filename: safe, error: dberr.message })
    }

    logger.info('File deleted', { username, filename: safe })
    res.json({ ok: true, message: 'Deleted' })
  } catch (err) {
    logger.error('Delete failed', { username: req.query.username, error: err.message })
    res.status(500).json({ ok: false, message: 'Server error' })
  }
})

// Logs endpoint (protected by token)
app.get('/api/logs', async (req, res) => {
  const logsToken = process.env.LOGS_TOKEN || 'devtoken123'
  const provided = req.query.token || req.headers['x-logs-token']
  
  // Allow jika ada token yang match, atau allow untuk development
  const isAuthorized = provided === logsToken || req.query.debug === 'true'
  if (!isAuthorized) {
    return res.status(403).json({ ok: false, message: 'Forbidden' })
  }
  
  const pathLog = path.join(DATA_DIR, 'app.log')
  try {
    const exists = await fs.pathExists(pathLog)
    if (!exists) return res.send('')
    const txt = await fs.readFile(pathLog, 'utf8')
    res.type('text/plain').send(txt)
  } catch (err) {
    logger.error('Logs read failed', { error: err.message })
    res.status(500).send('Unable to read logs')
  }
})

// Report endpoint
app.post('/api/report', (req, res) => {
  const { title, body } = req.body || {}
  logger.info('Report received', { title, body })
  res.json({ message: 'Report received. Thank you.' })
})

app.get('/api/flow', (req, res) => {
  res.json({ flow: ['landing','dos','ftp','report'] })
})

// FTP Status endpoint - shows FTP server details for reconnaissance
app.get('/api/ftp-status', async (req, res) => {
  logger.info('FTP status queried', { ip: req.ip })
  const FTP_HOST = process.env.FTP_HOST || 'localhost'
  const FTP_PORT = process.env.FTP_PORT || '21'
  res.json({
    ftp_available: true,
    ftp_server: 'VSFTPD',
    ftp_host: FTP_HOST,
    ftp_port: FTP_PORT,
    ftp_user: 'ftpuser',
    protocol: 'FTP/SFTP',
    data_dir: '/home/vsftpd/ftp'
  })
})

// Remote file access endpoints - for friend to access files via HTTP/ngrok
app.get('/api/remote-files', async (req, res) => {
  const username = req.query.username || 'anonymous'
  const token = req.query.token || req.headers['x-remote-token'] || ''
  
  // Simple token auth
  if (token !== 'remote-access-2024') {
    logger.warn('Remote files: unauthorized access attempt', { username, ip: req.ip })
    return res.status(401).json({ ok: false, message: 'Invalid token' })
  }
  
  const userDir = path.join(DATA_DIR, username)
  try {
    if (dbPool) {
      try {
        const [rows] = await dbPool.execute('SELECT filename, size, uploaded_at FROM files WHERE username = ? ORDER BY uploaded_at DESC LIMIT 100', [username])
        const files = rows.map(r => ({ 
          filename: r.filename, 
          size: Number(r.size), 
          uploaded_at: (r.uploaded_at ? new Date(r.uploaded_at).toISOString() : null),
          download_url: `/api/remote-download?username=${encodeURIComponent(username)}&filename=${encodeURIComponent(r.filename)}&token=remote-access-2024`
        }))
        logger.info('Remote files listed', { username, count: files.length })
        return res.json({ ok: true, files, count: files.length })
      } catch (dberr) {
        logger.error('Remote files DB error', { username, error: dberr.message })
      }
    }

    const exists = await fs.pathExists(userDir)
    if (!exists) return res.json({ ok: true, files: [], count: 0 })
    
    const items = await fs.readdir(userDir)
    const files = await Promise.all(items.map(async (name) => {
      const p = path.join(userDir, name)
      try {
        const st = await fs.stat(p)
        return { 
          filename: name, 
          size: st.size, 
          uploaded_at: st.mtime.toISOString(),
          download_url: `/api/remote-download?username=${encodeURIComponent(username)}&filename=${encodeURIComponent(name)}&token=remote-access-2024`
        }
      } catch (e) {
        return { filename: name, size: 0, uploaded_at: null }
      }
    }))
    logger.info('Remote files listed (filesystem)', { username, count: files.length })
    res.json({ ok: true, files, count: files.length })
  } catch (err) {
    logger.error('Remote files list error', { username, error: err.message })
    res.status(500).json({ ok: false, files: [] })
  }
})

// Remote file download
app.get('/api/remote-download', (req, res) => {
  const username = req.query.username || 'anonymous'
  const filename = req.query.filename || ''
  const token = req.query.token || req.headers['x-remote-token'] || ''
  
  if (token !== 'remote-access-2024') {
    logger.warn('Remote download: unauthorized', { username, filename, ip: req.ip })
    return res.status(401).json({ ok: false, message: 'Invalid token' })
  }
  
  if (!filename) return res.status(400).json({ ok: false, message: 'filename required' })
  
  const filePath = path.join(DATA_DIR, username, path.basename(filename))
  if (!fs.pathExistsSync(filePath)) {
    logger.warn('Remote download: file not found', { username, filename })
    return res.status(404).json({ ok: false, message: 'Not found' })
  }
  
  logger.info('Remote file downloaded', { username, filename })
  res.download(filePath)
})

// Remote upload endpoint - for friend to upload files
app.options('/api/remote-upload', cors())
app.post('/api/remote-upload', upload.single('file'), async (req, res) => {
  const username = req.body.username || 'anonymous'
  const token = req.body.token || req.headers['x-remote-token'] || ''
  
  if (token !== 'remote-access-2024') {
    logger.warn('Remote upload: unauthorized', { username, ip: req.ip })
    return res.status(401).json({ ok: false, message: 'Invalid token' })
  }
  
  try {
    const file = req.file
    if (!file) {
      logger.warn('Remote upload: No file provided', { username })
      return res.status(400).json({ ok: false, message: 'No file uploaded' })
    }

    logger.info('Remote upload start', { username, filename: file.originalname, size: file.size })
    const userDir = path.join(DATA_DIR, username)
    await fs.ensureDir(userDir)

    const safeName = path.basename(file.originalname)
    const outPath = path.join(userDir, safeName)
    await fs.writeFile(outPath, file.buffer)

    try {
      if (dbPool) {
        await dbPool.execute(
          'INSERT INTO files (username, filename, filepath, size, uploaded_at) VALUES (?, ?, ?, ?, ?)',
          [username, safeName, outPath, file.size, new Date()]
        )
      }
    } catch (dbErr) {
      logger.error('DB insert error', { username, filename: safeName, error: dbErr.message })
    }
    
    logger.info('Remote file uploaded', { username, filename: safeName, size: file.size })
    res.json({ ok: true, message: 'File uploaded' })
  } catch (err) {
    logger.error('Remote upload failed', { username: req.body?.username, error: err.message })
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message })
  }
})

// Remote access info endpoint
app.get('/api/remote-info', (req, res) => {
  res.json({
    service: 'Remote File Access API',
    endpoints: [
      {
        method: 'GET',
        path: '/api/remote-files',
        description: 'List files',
        query: 'username=xxx&token=remote-access-2024'
      },
      {
        method: 'GET',
        path: '/api/remote-download',
        description: 'Download a file',
        query: 'username=xxx&filename=xxx&token=remote-access-2024'
      },
      {
        method: 'POST',
        path: '/api/remote-upload',
        description: 'Upload a file',
        body: 'multipart/form-data: file + username + token'
      }
    ],
    auth_token: 'remote-access-2024',
    note: 'Token header alternative: x-remote-token'
  })
})

// OPTIONS handlers for preflight requests from ngrok
app.options('/api/register', cors())
app.options('/api/login', cors())
app.options('/api/upload', cors())
app.options('/api/file', cors())
app.options('/api/files', cors())
app.options('/api/report', cors())
app.options('/api/ftp-status', cors())
app.options('/api/remote-files', cors())
app.options('/api/remote-download', cors())
app.options('/api/remote-upload', cors())
app.options('/api/remote-info', cors())

const port = process.env.PORT || 4000
app.listen(port, () => logger.info('Backend listening', { port }))
