import express from 'express';
import cors from 'cors';
import { getVedicAstrologyData } from './vedic';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Simple memory monitoring for logs
function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024), // Resident Set Size in MB
    heapUsed: Math.round(used.heapUsed / 1024 / 1024), // Heap used in MB
    heapTotal: Math.round(used.heapTotal / 1024 / 1024), // Total heap in MB
    external: Math.round(used.external / 1024 / 1024), // External memory in MB
  };
}

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const memory = getMemoryUsage();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${clientIp} - Memory: ${memory.heapUsed}MB`);
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const finalMemory = getMemoryUsage();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Memory: ${finalMemory.heapUsed}MB`);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const memory = getMemoryUsage();
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory
  });
});

// Input validation helper
function validateInput(dateOfBirth: any, timeOfBirth: any, lat: any, lng: any) {
  const errors: string[] = [];
  
  // Validate date of birth
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    errors.push('dateOfBirth is required and must be a string');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      errors.push('dateOfBirth must be in YYYY-MM-DD format');
    } else {
      const date = new Date(dateOfBirth);
      if (isNaN(date.getTime())) {
        errors.push('dateOfBirth must be a valid date');
      }
    }
  }
  
  // Validate time of birth
  if (!timeOfBirth || typeof timeOfBirth !== 'string') {
    errors.push('timeOfBirth is required and must be a string');
  } else {
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(timeOfBirth)) {
      errors.push('timeOfBirth must be in HH:MM:SS format');
    }
  }
  
  // Validate latitude
  if (lat == null || typeof lat !== 'number') {
    errors.push('lat is required and must be a number');
  } else if (lat < -90 || lat > 90) {
    errors.push('lat must be between -90 and 90');
  }
  
  // Validate longitude
  if (lng == null || typeof lng !== 'number') {
    errors.push('lng is required and must be a number');
  } else if (lng < -180 || lng > 180) {
    errors.push('lng must be between -180 and 180');
  }
  
  return errors;
}

// Main astrology endpoint
app.post('/astrology-data', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    console.log(`[${new Date().toISOString()}] Processing astrology request from ${clientIp}`);
    console.log(`[${new Date().toISOString()}] Request body:`, {
      dateOfBirth: req.body.dateOfBirth,
      timeOfBirth: req.body.timeOfBirth,
      lat: req.body.lat,
      lng: req.body.lng
    });
    
    const { dateOfBirth, timeOfBirth, lat, lng } = req.body;
    
    // Validate input
    const validationErrors = validateInput(dateOfBirth, timeOfBirth, lat, lng);
    if (validationErrors.length > 0) {
      console.warn(`[${new Date().toISOString()}] Validation errors for ${clientIp}:`, validationErrors);
      return res.status(400).json({ 
        error: 'Invalid input',
        details: validationErrors
      });
    }
    
    console.log(`[${new Date().toISOString()}] Input validation passed, calling vedic astrology service...`);
    
    // Call the astrology service
    const result = await getVedicAstrologyData(dateOfBirth, timeOfBirth, lat, lng);
    
    const processingTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Successfully processed astrology data for ${clientIp} in ${processingTime}ms`);
    console.log(`[${new Date().toISOString()}] Result summary:`, {
      moonSign: result.moonSign,
      sunSign: result.sunSign,
      ascendant: result.ascendant,
      atmakarak: result.atmakarak,
      hasBirthChart: !!result.birthChart
    });
    
    res.json(result);
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Error processing astrology data for ${clientIp} after ${processingTime}ms:`, error);
    
    // Log error details
    if (error instanceof Error) {
      console.error(`[${new Date().toISOString()}] Error name: ${error.name}`);
      console.error(`[${new Date().toISOString()}] Error message: ${error.message}`);
      console.error(`[${new Date().toISOString()}] Error stack: ${error.stack}`);
    }
    
    // Determine error type and provide appropriate response
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Invalid date') || error.message.includes('Invalid time')) {
        return res.status(400).json({ 
          error: 'Invalid date or time format',
          message: error.message
        });
      }
      
      if (error.message.includes('coordinates') || error.message.includes('latitude') || error.message.includes('longitude')) {
        return res.status(400).json({ 
          error: 'Invalid coordinates',
          message: error.message
        });
      }
      
      if (error.message.includes('Input validation failed')) {
        return res.status(400).json({ 
          error: 'Invalid input parameters',
          message: error.message
        });
      }
      
      if (error.message.includes('vedic-astrology') || error.message.includes('package')) {
        return res.status(503).json({ 
          error: 'Astrology service unavailable',
          message: 'The astrology calculation service is currently unavailable. Please try again later.'
        });
      }
      
      // Generic server error
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to calculate astrology data. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Unknown error type
    res.status(500).json({ 
      error: 'Unknown server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Handle 404 for unknown routes
app.use('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] Unhandled error on ${req.method} ${req.path}:`, err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on the server'
  });
});

const PORT = process.env.PORT || 4000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] SIGINT received, shutting down gracefully`);
  process.exit(0);
});

// Log startup info
const startupMemory = getMemoryUsage();
console.log(`[${new Date().toISOString()}] Server starting...`);
console.log(`[${new Date().toISOString()}] Node.js version: ${process.version}`);
console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[${new Date().toISOString()}] Startup memory usage:`, startupMemory);

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Health check available at http://localhost:${PORT}/health`);
  console.log(`[${new Date().toISOString()}] Ready to accept requests`);
}); 