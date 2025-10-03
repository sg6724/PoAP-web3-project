
# Final Deployment Script for RiseIn POAP Smart Contract
echo "🚀 Deploying RiseIn POAP Smart Contract..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}
print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check for Aptos CLI
if ! command -v aptos &> /dev/null; then
  print_error "Aptos CLI not found. Please install it: https://aptos.dev/tools/aptos-cli/install-cli/"
  exit 1
fi
print_status "Aptos CLI detected"

# Ensure devnet profile
CURRENT_NETWORK=$(aptos config show --profile default | grep "network" | awk '{print $2}')
if [[ "$CURRENT_NETWORK" != "devnet" && "$CURRENT_NETWORK" != "Devnet" ]]; then
  print_warning "Current network: $CURRENT_NETWORK"
  print_status "Switching to devnet..."
  aptos init --network devnet --assume-yes
fi

# Read and clean account address
ACCOUNT_ADDRESS=$(aptos config show --profile default \
  | grep '^ *account:' \
  | awk '{print $2}' \
  | tr -d '"' \
)
# Add 0x prefix if missing
if [[ $ACCOUNT_ADDRESS != 0x* ]]; then
  ACCOUNT_ADDRESS="0x$ACCOUNT_ADDRESS"
fi
print_status "Using account: $ACCOUNT_ADDRESS"

# Fund account via faucet if balance is zero
BALANCE=$(aptos account list --account $ACCOUNT_ADDRESS \
  | grep "AptosCoin" \
  | grep -o '"value": "[0-9]*"' \
  | grep -o '[0-9]*' \
  || echo "0"
)
if [[ "$BALANCE" -eq 0 ]]; then
  print_warning "No APT tokens detected. Funding from faucet..."
  aptos account fund-with-faucet --account $ACCOUNT_ADDRESS
  print_status "Faucet funding completed"
else
  print_status "Account balance: $BALANCE APT"
fi

echo
print_status "Step 1: Compiling smart contract"
echo "--------------------------------"
if aptos move compile \
    --package-dir . \
    --named-addresses poap_addr=$ACCOUNT_ADDRESS; then
  print_status "Compilation successful"
else
  print_error "Compilation failed"
  exit 1
fi

echo
print_status "Step 2: Publishing to devnet"
echo "-----------------------------"
if aptos move publish \
    --package-dir . \
    --named-addresses poap_addr=$ACCOUNT_ADDRESS \
    --profile default \
    --assume-yes; then
  print_status "Publish successful"
else
  print_error "Publish failed"
  exit 1
fi

echo
print_status "Step 3: Initializing POAP system"
echo "---------------------------------"
aptos move run \
  --function-id $ACCOUNT_ADDRESS::risein_poap::initialize \
  --profile default \
  --assume-yes || print_warning "Initialization may have been done already"

echo
print_status "Step 4: Creating sample event"
echo "------------------------------"
aptos move run \
  --function-id $ACCOUNT_ADDRESS::risein_poap::create_sample_event \
  --profile default \
  --assume-yes || print_warning "Sample event creation may have been done already"

echo
print_status "Step 5: Verifying deployment"
echo "-----------------------------"
print_status "Listing all events:"
aptos move view \
  --function-id $ACCOUNT_ADDRESS::risein_poap::get_all_events \
  --args address:$ACCOUNT_ADDRESS

EVENT_COUNT=$(aptos move view \
  --function-id $ACCOUNT_ADDRESS::risein_poap::get_event_count \
  --args address:$ACCOUNT_ADDRESS \
  | grep -o '[0-9]\+')
print_status "Total events: ${EVENT_COUNT:-0}"

echo
print_status "🎉 Deployment completed successfully!"
echo "Contract Address: $ACCOUNT_ADDRESS"
echo "================================================"
