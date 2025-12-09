#!/bin/bash

# Quick validation script for Critical Fixes
# Run this after refreshing page to verify fixes work

echo "🔍 Validating Critical Fixes..."
echo "================================"
echo ""

# Check 1: Safe address in localStorage
echo "✓ Check 1: Safe Address Persistence"
if command -v jq &> /dev/null; then
    SAFE=$(cat ~/Library/Application\ Support/Google/Chrome/Default/Local\ Storage/leveldb/*.log 2>/dev/null | strings | grep -o '"safeAddress":"0x[^"]*' | head -1 || echo "")
    if [ -n "$SAFE" ]; then
        echo "  ✅ Safe address found: ${SAFE:15}"
    else
        echo "  ⚠️  Safe address not found in localStorage"
    fi
else
    echo "  ℹ️  Check manually: DevTools → Application → Local Storage → polymarket-storage"
fi
echo ""

# Check 2: Credentials in localStorage
echo "✓ Check 2: Credentials Persistence"
echo "  ℹ️  Open DevTools → Application → Local Storage"
echo "  ℹ️  Look for 'polymarket-storage' key"
echo "  ℹ️  Should contain: credentials, safeAddress, walletType"
echo ""

# Check 3: Console logs to look for
echo "✓ Check 3: Console Logs After Page Reload"
echo "  Expected logs:"
echo "    1. [useAutoRestoreClobClient] Conditions met, restoring..."
echo "    2. [Polymarket] Restoring ClobClient from saved credentials..."
echo "    3. [ClobClient] Is Safe wallet: true/false"
echo "    4. [ClobClient] Signature type: EOA or POLY_GNOSIS_SAFE"
echo "    5. [useAutoRestoreClobClient] ✅ ClobClient restored successfully"
echo ""

# Check 4: Order placement
echo "✓ Check 4: Order Placement Test"
echo "  Steps:"
echo "    1. Go to any market page"
echo "    2. Open browser console"
echo "    3. Try to place an order"
echo "    4. Check for these logs:"
echo "       - [ClobClient] Is Safe wallet: true"
echo "       - [ClobClient] Funder address: 0x..."
echo "       - No '401 Unauthorized' errors"
echo "       - No 'Insufficient balance' errors (if you have USDC)"
echo ""

echo "================================"
echo ""
echo "📝 Manual Test Checklist:"
echo ""
echo "  [ ] 1. Refresh page (F5)"
echo "  [ ] 2. Check console for auto-restore logs"
echo "  [ ] 3. Verify ClobClient shows 'Is Safe wallet: true'"
echo "  [ ] 4. Verify signature type matches wallet (EOA or POLY_GNOSIS_SAFE)"
echo "  [ ] 5. Try placing an order without re-setup"
echo "  [ ] 6. Verify balance shows correct amount"
echo "  [ ] 7. Verify order placement succeeds"
echo ""
echo "🐛 If Issues:"
echo ""
echo "  1. Clear everything:"
echo "     - DevTools → Application → Clear Site Data"
echo "     - Disconnect wallet"
echo "     - Refresh page"
echo ""
echo "  2. Fresh start:"
echo "     - Connect wallet"
echo "     - Setup Trading"
echo "     - Place test order"
echo "     - Refresh page"
echo "     - Try order again (should work immediately)"
echo ""
echo "================================"
