/**
 * Processor Configuration Service
 * Manages payment processor configuration and routing logic
 */

const processors = {
  paymentcloud: {
    id: process.env.PROCESSOR_PAYMENTCLOUD_ID || 'paymentcloud_merchant_id',
    name: 'PaymentCloud',
    role: 'entry',
    monthlyLimit: parseInt(process.env.LOAD_BALANCE_TIER1_MAX) || 30000,
    feeRange: '3.5% - 5.0% + $0.30/tx',
    priority: 1, // Primary for low volume
    supportsCrossBorder: false
  },
  directpaynet: {
    id: process.env.PROCESSOR_DIRECTPAYNET_ID || 'directpaynet_merchant_id',
    name: 'DirectPayNet',
    role: 'scaler',
    monthlyLimit: parseInt(process.env.LOAD_BALANCE_TIER2_MAX) || 80000,
    feeRange: '2.5% - 3.8%',
    priority: 2, // Secondary for higher volume
    supportsCrossBorder: false
  },
  instabill: {
    id: process.env.PROCESSOR_INSTABILL_ID || 'instabill_merchant_id',
    name: 'Instabill/EMB',
    role: 'offshore',
    monthlyLimit: null, // No hard limit
    feeRange: '4.0% - 6.0%',
    priority: 3, // Fallback for cross-border/high-risk
    supportsCrossBorder: true
  }
};

/**
 * Get processor by key
 */
function getProcessor(key) {
  return processors[key] || null;
}

/**
 * Get processor by role
 */
function getProcessorByRole(role) {
  return Object.values(processors).find(p => p.role === role) || null;
}

/**
 * List all active processors
 */
function listActiveProcessors() {
  return Object.entries(processors).map(([key, config]) => ({
    key,
    ...config
  }));
}

/**
 * Get processor by priority order
 */
function getProcessorsByPriority() {
  return Object.entries(processors)
    .map(([key, config]) => ({
      key,
      ...config
    }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Determine which processor to use based on transaction characteristics
 * @param {number} amount - Transaction amount in USD
 * @param {number} currentMonthlyVolume - Current monthly volume in USD
 * @param {string} country - Customer country code
 * @returns {array} Array of processors in order of preference
 */
function determineProcessorChain(amount, currentMonthlyVolume = 0, country = 'AU') {
  const chain = [];
  const isCrossBorder = country !== 'AU';
  const projectedVolume = currentMonthlyVolume + amount;

  // If cross-border, always include offshore option in chain
  if (isCrossBorder) {
    // Try standard processors first, but have offshore as fallback
    if (projectedVolume <= processors.paymentcloud.monthlyLimit) {
      chain.push({ key: 'paymentcloud', ...processors.paymentcloud });
    }
    if (projectedVolume <= processors.directpaynet.monthlyLimit) {
      chain.push({ key: 'directpaynet', ...processors.directpaynet });
    }
    // Always include offshore for cross-border
    chain.push({ key: 'instabill', ...processors.instabill });
  } else {
    // Domestic transactions: use tier-based routing
    if (projectedVolume <= processors.paymentcloud.monthlyLimit) {
      chain.push({ key: 'paymentcloud', ...processors.paymentcloud });
      chain.push({ key: 'directpaynet', ...processors.directpaynet });
      chain.push({ key: 'instabill', ...processors.instabill });
    } else if (projectedVolume <= processors.directpaynet.monthlyLimit) {
      chain.push({ key: 'directpaynet', ...processors.directpaynet });
      chain.push({ key: 'paymentcloud', ...processors.paymentcloud });
      chain.push({ key: 'instabill', ...processors.instabill });
    } else {
      chain.push({ key: 'instabill', ...processors.instabill });
      chain.push({ key: 'directpaynet', ...processors.directpaynet });
    }
  }

  return chain;
}

/**
 * Check if processor can handle transaction
 */
function canProcessorHandle(processorKey, amount, monthlyVolume) {
  const processor = processors[processorKey];
  if (!processor) return false;

  if (processor.monthlyLimit === null) {
    return true; // No limit for this processor
  }

  return (monthlyVolume + amount) <= processor.monthlyLimit;
}

module.exports = {
  processors,
  getProcessor,
  getProcessorByRole,
  listActiveProcessors,
  getProcessorsByPriority,
  determineProcessorChain,
  canProcessorHandle
};
