#!/bin/bash

# Script to interact with the deployed contract
ORGANIZER_ADDR="d97248e5d29be6dd506d19a9ba6d40d7317c183de20aac4facbb025be0a5dfe6"

echo "Interacting with RiseIn POAP Contract..."

# Initialize POAP
echo "1. Initializing POAP..."
aptos move run --function-id poap_addr::risein_poap::initialize --profile default

# Create sample event
echo "2. Creating sample RiseIn Web3 meetup..."
aptos move run --function-id poap_addr::risein_poap::create_sample_event --profile default

# View events
echo "3. Viewing all events..."
aptos move view --function-id poap_addr::risein_poap::get_all_events --args address:$ORGANIZER_ADDR

echo "Setup complete! Users can now claim badges using:"
echo "aptos move run --function-id poap_addr::risein_poap::claim_badge --args address:$ORGANIZER_ADDR u64:0"
