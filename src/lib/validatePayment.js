/**
 * Validates a payment transaction for collection creation
 * @param {string} txHash - The transaction hash to validate
 * @param {string} expectedSender - The expected sender address (creator_address)
 * @param {number} ethPriceUSD - Current ETH price in USD
 * @returns {Promise<{valid: boolean, amount?: string, error?: string}>}
 */
export async function validatePayment(txHash, expectedSender, ethPriceUSD) {
  try {
    // Validate txHash format
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return {
        valid: false,
        error: 'Invalid transaction hash format'
      };
    }

    // Validate sender address format
    if (!expectedSender || !/^0x[a-fA-F0-9]{40}$/.test(expectedSender)) {
      return {
        valid: false,
        error: 'Invalid sender address format'
      };
    }

    // Get Alchemy API key
    const alchemyApiKey = process.env.ALCHEMY_API_KEY;
    if (!alchemyApiKey) {
      console.error('ALCHEMY_API_KEY is not defined');
      return {
        valid: false,
        error: 'Server configuration error'
      };
    }

    // Alchemy RPC endpoint for Base mainnet
    const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

    // Expected payment recipient
    const PAYMENT_RECIPIENT = '0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7';

    // Expected payment amount in USD
    const EXPECTED_PAYMENT_USD = 5;

    // Tolerance for price drift (25% = 0.25)
    const PRICE_TOLERANCE = 0.25;

    // Fetch transaction and receipt in parallel
    const [txResponse, receiptResponse] = await Promise.all([
      fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionByHash',
          params: [txHash]
        })
      }),
      fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        })
      })
    ]);

    if (!txResponse.ok || !receiptResponse.ok) {
      console.error('Alchemy RPC error');
      return {
        valid: false,
        error: 'Failed to verify transaction'
      };
    }

    const txData = await txResponse.json();
    const receiptData = await receiptResponse.json();

    // Check for RPC errors
    if (txData.error || receiptData.error) {
      console.error('RPC call error:', {
        txError: txData.error,
        receiptError: receiptData.error
      });
      return {
        valid: false,
        error: 'Failed to retrieve transaction data'
      };
    }

    // Check if transaction exists
    if (!txData.result) {
      return {
        valid: false,
        error: 'Transaction not found'
      };
    }

    // Check if transaction is confirmed (has receipt)
    if (!receiptData.result) {
      return {
        valid: false,
        error: 'Transaction not yet confirmed'
      };
    }

    const tx = txData.result;
    const receipt = receiptData.result;

    // Validate transaction succeeded
    if (receipt.status !== '0x1') {
      return {
        valid: false,
        error: 'Transaction failed'
      };
    }

    // Validate recipient (convert both to lowercase for comparison)
    if (tx.to?.toLowerCase() !== PAYMENT_RECIPIENT.toLowerCase()) {
      return {
        valid: false,
        error: 'Payment sent to wrong address'
      };
    }

    // Validate sender matches creator address (convert both to lowercase)
    if (tx.from?.toLowerCase() !== expectedSender.toLowerCase()) {
      return {
        valid: false,
        error: 'Payment sender does not match creator address'
      };
    }

    // Validate transaction value
    const valueWei = BigInt(tx.value);
    const valueEth = Number(valueWei) / 1e18;
    const valueUSD = valueEth * ethPriceUSD;

    // Check if payment is within tolerance
    const minPayment = EXPECTED_PAYMENT_USD * (1 - PRICE_TOLERANCE);
    const maxPayment = EXPECTED_PAYMENT_USD * (1 + PRICE_TOLERANCE);

    if (valueUSD < minPayment || valueUSD > maxPayment) {
      return {
        valid: false,
        error: `Payment amount $${valueUSD.toFixed(2)} is outside acceptable range ($${minPayment.toFixed(2)} - $${maxPayment.toFixed(2)})`
      };
    }

    // All validations passed
    return {
      valid: true,
      amount: valueEth.toString()
    };

  } catch (error) {
    console.error('Error validating payment:', error);
    return {
      valid: false,
      error: 'Payment validation failed: ' + error.message
    };
  }
}
