const https = require('https');
const querystring = require('querystring');
const { queryOne, runSql, dbReady } = require('../database/init');
const processorConfig = require('./processorConfig');

/**
 * NMI Gateway Integration Service
 * Handles all payment processing through NMI Gateway with load balancing,
 * cascading fallbacks, and MDR optimization
 */

/**
 * Get current month volume for a processor
 */
async function getMonthlyVolume(processorId) {
  try {
    await dbReady;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    const result = queryOne(`
      SELECT total_amount, transaction_count
      FROM monthly_volume
      WHERE processor_id = ? AND month = ?
    `, [processorId, currentMonth]);

    return {
      amount: result?.total_amount || 0,
      transactionCount: result?.transaction_count || 0
    };
  } catch (error) {
    console.error('Error fetching monthly volume:', error);
    return { amount: 0, transactionCount: 0 };
  }
}

/**
 * Update monthly volume for a processor
 */
async function updateMonthlyVolume(processorId, amount) {
  try {
    await dbReady;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    runSql(`
      INSERT INTO monthly_volume (processor_id, month, total_amount, transaction_count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(processor_id, month) DO UPDATE SET
        total_amount = total_amount + excluded.total_amount,
        transaction_count = transaction_count + 1
    `, [processorId, currentMonth, amount]);
  } catch (error) {
    console.error('Error updating monthly volume:', error);
  }
}

/**
 * Determine processor chain for cascading fallback
 */
async function buildProcessorChain(amount, country) {
  const currentMonthlyVolume = {};

  // Get current volumes for all processors
  const allProcessors = processorConfig.listActiveProcessors();
  for (const proc of allProcessors) {
    const volume = await getMonthlyVolume(proc.key);
    currentMonthlyVolume[proc.key] = volume.amount;
  }

  // Get recommended processor chain
  const chain = processorConfig.determineProcessorChain(
    amount,
    currentMonthlyVolume.paymentcloud || 0,
    country
  );

  return chain;
}

/**
 * Make NMI API call (simulated in dev, real in production)
 */
function makeNmiApiCall(paymentData) {
  return new Promise((resolve, reject) => {
    // In development mode, simulate API response
    if (process.env.NODE_ENV === 'development') {
      // Simulate random success/failure for testing
      const random = Math.random();
      
      if (random > 0.1) { // 90% success rate in dev
        resolve({
          response: '1', // 1 = approved
          transactionid: `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          authcode: 'SIM123456',
          avsresponse: 'M',
          cvvresponse: 'M'
        });
      } else {
        resolve({
          response: '2', // 2 = declined
          responsetext: 'Simulated decline for testing'
        });
      }
      return;
    }

    // Production: make real API call to NMI
    const postData = querystring.stringify(paymentData);

    const options = {
      hostname: 'secure.nmi.com',
      path: '/api/transact.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Parse response - NMI returns ampersand-separated key=value pairs
        const response = {};
        data.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          response[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        resolve(response);
      });
    });

    req.on('error', (error) => {
      console.error('NMI API error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Process payment through NMI with cascading processor support
 */
async function processPayment(paymentDetails) {
  const {
    cardNumber,
    cardExp,
    cardCvv,
    amount,
    email,
    firstName,
    lastName,
    address1,
    address2,
    city,
    state,
    postalCode,
    country = 'AU',
    phone,
    customerIp,
    orderId,
    productCategory = 'vape'
  } = paymentDetails;

  // Build processor chain based on current volume and transaction characteristics
  const processorChain = await buildProcessorChain(amount, country);

  if (processorChain.length === 0) {
    return {
      success: false,
      error: 'No available processors',
      transactionId: null,
      processor: null
    };
  }

  let lastError = null;

  // Try each processor in chain
  for (const processorConfig of processorChain) {
    try {
      console.log(`Attempting payment with processor: ${processorConfig.name}`);

      // Build NMI API request
      const nmiRequest = {
        // Authentication
        security_key: process.env.NMI_SECURITY_KEY || 'test_security_key',
        type: 'sale',

        // Card details
        ccnumber: cardNumber.replace(/\s/g, ''),
        ccexp: cardExp.replace('/', ''),
        cvv: cardCvv,

        // Amount
        amount: amount.toFixed(2),

        // Customer info
        firstname: firstName,
        lastname: lastName,
        email: email,
        address1: address1,
        address2: address2 || '',
        city: city,
        state: state,
        zip: postalCode,
        country: country,
        phone: phone || '',

        // Level 2/3 data for MDR optimization
        merchant_defined_field_1: processorConfig.key, // Processor routing
        merchant_defined_field_2: orderId || 'unknown',
        merchant_defined_field_3: productCategory,
        
        // Customer behavioral data (MDR optimization)
        ipaddress: customerIp || '0.0.0.0',
        
        // Invoice info
        orderid: orderId || 'unknown',
        invoice_num: orderId || 'unknown',
        product_description: `Vaperoo - ${productCategory}`,
        
        // Tax and shipping for Level 2 data
        tax: (amount * 0.1).toFixed(2), // Assume 10% tax
        shipping: '10.00' // Standard shipping
      };

      // Make NMI API call
      const nmiResponse = await makeNmiApiCall(nmiRequest);

      // Check if transaction was approved
      if (nmiResponse.response === '1' || nmiResponse.response === 'Approved') {
        // Success - update monthly volume and return
        await updateMonthlyVolume(processorConfig.key, amount);

        console.log(`Payment approved with ${processorConfig.name}`);

        return {
          success: true,
          transactionId: nmiResponse.transactionid,
          authCode: nmiResponse.authcode,
          processor: processorConfig.key,
          processorName: processorConfig.name,
          avsResponse: nmiResponse.avsresponse,
          cvvResponse: nmiResponse.cvvresponse,
          timestamp: new Date().toISOString()
        };
      } else {
        // Transaction declined - log and try next processor
        lastError = nmiResponse.responsetext || 'Transaction declined';
        console.log(`Payment declined with ${processorConfig.name}: ${lastError}`);
        continue;
      }
    } catch (error) {
      console.error(`Error processing with ${processorConfig.name}:`, error);
      lastError = error.message;
      continue;
    }
  }

  // All processors failed
  return {
    success: false,
    error: lastError || 'Payment processing failed',
    transactionId: null,
    processor: null
  };
}

/**
 * Get processor status and volume info
 */
async function getProcessorStatus() {
  const statuses = {};

  for (const proc of processorConfig.listActiveProcessors()) {
    const volume = await getMonthlyVolume(proc.key);
    const canProcess = processorConfig.canProcessorHandle(
      proc.key,
      0,
      volume.amount
    );

    statuses[proc.key] = {
      name: proc.name,
      active: canProcess,
      monthlyVolume: volume.amount,
      monthlyTransactions: volume.transactionCount,
      monthlyLimit: proc.monthlyLimit,
      utilizationPercent: proc.monthlyLimit
        ? Math.round((volume.amount / proc.monthlyLimit) * 100)
        : 'unlimited'
    };
  }

  return statuses;
}

module.exports = {
  processPayment,
  getProcessorStatus,
  getMonthlyVolume,
  updateMonthlyVolume,
  buildProcessorChain
};
