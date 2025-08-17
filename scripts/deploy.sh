#!/bin/bash

# Deploy the POAP smart contract
echo "Deploying RiseIn POAP Smart Contract..."

# Compile the contract
aptos move compile --package-dir . --named-addresses poap_addr=d97248e5d29be6dd506d19a9ba6d40d7317c183de20aac4facbb025be0a5dfe6

# Publish to devnet
aptos move publish --package-dir . --named-addresses poap_addr=d97248e5d29be6dd506d19a9ba6d40d7317c183de20aac4facbb025be0a5dfe6 --profile default

echo "Contract deployed successfully!"